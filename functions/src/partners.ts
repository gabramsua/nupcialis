/**
 * Los proveedores comercializadores (D-26): alta, edición y liquidación.
 *
 * Todo por funciones y nada desde el navegador: es dinero y es el libro de
 * cuentas de Gabriel, así que cada escritura se audita. Ni los proveedores ni
 * sus cobros los puede tocar nadie que no sea superadmin.
 *
 * El proveedor **no tiene cuenta**: el código es una etiqueta, no una credencial.
 */

import { FieldValue } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import {
  planificarLiquidacion,
  validarPartner,
  type MotivoLiquidacion,
  type MotivoPartnerInvalido,
} from './dominio/partners';
import { EXIGIR_APP_CHECK, REGION, db } from './firebase';
import { auditar } from './infra/auditoria';
import { exigirSuperadmin } from './infra/permisos';

const MAX_PROVEEDORES = 500;
const MAX_COBROS_DE_PROVEEDOR = 2000;

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor : '';
}

function numero(valor: unknown): number {
  return typeof valor === 'number' && Number.isFinite(valor) ? valor : 0;
}

function proveedorParaCliente(id: string, d: Record<string, unknown>) {
  const precios = (d['wholesalePrice'] ?? {}) as Record<string, unknown>;
  return {
    id,
    name: texto(d['name']),
    code: texto(d['code']),
    contactName: texto(d['contactName']),
    email: texto(d['email']),
    phone: texto(d['phone']),
    wholesalePrice: { basic: numero(precios['basic']), extended: numero(precios['extended']) },
    active: d['active'] === true,
  };
}

export const listPartners = onCall(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK },
  async (peticion) => {
    exigirSuperadmin(peticion);
    const snap = await db().collection('partners').limit(MAX_PROVEEDORES).get();
    return {
      proveedores: snap.docs
        .map((d) => proveedorParaCliente(d.id, d.data()))
        .sort((a, b) => a.name.localeCompare(b.name, 'es')),
    };
  },
);

function errorDeProveedor(motivo: MotivoPartnerInvalido | 'codigo-repetido'): HttpsError {
  return new HttpsError('invalid-argument', 'El proveedor no es válido.', { motivo });
}

export const savePartner = onCall<{ partnerId?: unknown; partner?: unknown }>(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK },
  async (peticion) => {
    const superadmin = exigirSuperadmin(peticion);

    const valido = validarPartner(peticion.data?.partner);
    if (!valido.ok) throw errorDeProveedor(valido.motivo);
    const partner = valido.partner;

    const id = peticion.data?.partnerId;
    const esEdicion = typeof id === 'string' && id !== '';
    if (esEdicion && (id as string).includes('/')) throw errorDeProveedor('nombre');

    // El código tiene que ser único: es la etiqueta con la que se reconoce al proveedor.
    const mismoCodigo = await db().collection('partners').where('code', '==', partner.code).get();
    if (mismoCodigo.docs.some((d) => d.id !== id)) throw errorDeProveedor('codigo-repetido');

    const ref = esEdicion
      ? db().doc(`partners/${id as string}`)
      : db().collection('partners').doc();
    if (esEdicion) {
      const antes = await ref.get();
      if (!antes.exists) throw new HttpsError('not-found', 'Ese proveedor no existe.');
      await ref.update({ ...partner, updatedAt: FieldValue.serverTimestamp() });
    } else {
      await ref.set({
        ...partner,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    await auditar({
      actorUid: superadmin.uid,
      actorRole: 'superadmin',
      action: esEdicion ? 'updatePartner' : 'createPartner',
      weddingId: null,
      payload: {
        partnerId: ref.id,
        code: partner.code,
        active: partner.active,
        wholesaleBasic: partner.wholesalePrice.basic,
        wholesaleExtended: partner.wholesalePrice.extended,
      },
    });

    return { id: ref.id, ...partner };
  },
);

function errorDeLiquidacion(motivo: MotivoLiquidacion, id?: string): HttpsError {
  return new HttpsError('invalid-argument', 'No se puede liquidar esa selección.', {
    motivo,
    ...(id ? { id } : {}),
  });
}

/**
 * Cierra de una vez varios cobros pendientes de un proveedor: pasan a `paid`,
 * método `partner_cash`, con la fecha dada. **Todo o nada** (ver
 * `planificarLiquidacion`): si uno no cuadra, no se toca ninguno.
 */
export const settlePartnerPayments = onCall<{
  partnerId?: unknown;
  paymentIds?: unknown;
  paidOn?: unknown;
}>({ region: REGION, enforceAppCheck: EXIGIR_APP_CHECK }, async (peticion) => {
  const superadmin = exigirSuperadmin(peticion);

  const partnerId = typeof peticion.data?.partnerId === 'string' ? peticion.data.partnerId : '';
  const pendientes =
    partnerId === '' || partnerId.includes('/')
      ? []
      : (
          await db()
            .collection('payments')
            .where('partnerId', '==', partnerId)
            .limit(MAX_COBROS_DE_PROVEEDOR)
            .get()
        ).docs;

  const plan = planificarLiquidacion({
    partnerId,
    ids: peticion.data?.paymentIds,
    fecha: peticion.data?.paidOn,
    cobros: pendientes.map((d) => ({
      id: d.id,
      partnerId: texto(d.data()['partnerId']),
      status: texto(d.data()['status']),
    })),
  });
  if (!plan.ok) throw errorDeLiquidacion(plan.motivo, plan.id);

  const paidOn = peticion.data?.paidOn as string;
  const batch = db().batch();
  let totalCents = 0;
  for (const doc of pendientes) {
    if (!plan.ids.includes(doc.id)) continue;
    totalCents += numero(doc.data()['amountCents']);
    batch.update(doc.ref, {
      status: 'paid',
      method: 'partner_cash',
      paidOn,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();

  await auditar({
    actorUid: superadmin.uid,
    actorRole: 'superadmin',
    action: 'settlePartnerPayments',
    weddingId: null,
    payload: { partnerId, count: plan.ids.length, totalCents, paidOn },
  });

  return { liquidados: plan.ids.length, totalCents };
});
