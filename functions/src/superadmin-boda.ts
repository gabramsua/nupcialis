/**
 * Lo que el superadmin hace con una boda concreta (S1.6b, S1.7, S1.3e, S1.3f).
 *
 * Todo pasa por aquí y no por el cliente porque son datos de gente —correos,
 * cobros— y porque escribir sin dejar rastro es justo lo que el log de
 * auditoría existe para evitar. Cada escritura se audita.
 *
 * No se envía ningún correo: el Admin SDK solo **genera** el enlace de
 * restablecimiento, y la fase 1 no tiene proveedor de email (REQUISITOS §11.5).
 * El superadmin copia el enlace y se lo pasa a la pareja por WhatsApp.
 */

import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import { dominioDeBoda } from './dominio/dominios';
import {
  calcularRecordatorios,
  claveDeMarca,
  esClaveRecordatorio,
  validarPago,
  type MotivoPagoInvalido,
} from './dominio/superadmin';
import { DOMINIO_BASE, EXIGIR_APP_CHECK, REGION, auth, db } from './firebase';
import { auditar } from './infra/auditoria';
import { exigirSuperadmin } from './infra/permisos';

const MAX_ENTRADAS_HISTORIAL = 100;
const MAX_PAGOS = 2000;

function idDe(valor: unknown, que = 'la boda'): string {
  if (typeof valor !== 'string' || valor.trim() === '' || valor.includes('/')) {
    throw new HttpsError('invalid-argument', `Falta ${que}.`);
  }
  return valor.trim();
}

function textoDe(valor: unknown): string {
  return typeof valor === 'string' ? valor : '';
}

function isoDe(valor: unknown): string | null {
  return valor instanceof Timestamp ? valor.toDate().toISOString() : null;
}

/** El día de la boda como `YYYY-MM-DD`, que es como se guarda: medianoche UTC. */
function diaDeBoda(valor: unknown): string | null {
  return valor instanceof Timestamp ? valor.toDate().toISOString().slice(0, 10) : null;
}

function pareja(datos: Record<string, unknown>): { partnerA: string; partnerB: string } {
  const c = (datos['couple'] ?? {}) as Record<string, unknown>;
  return { partnerA: textoDe(c['partnerA']), partnerB: textoDe(c['partnerB']) };
}

function pagoParaCliente(id: string, d: Record<string, unknown>) {
  return {
    id,
    weddingId: textoDe(d['weddingId']),
    amountCents: typeof d['amountCents'] === 'number' ? d['amountCents'] : 0,
    concept: textoDe(d['concept']),
    method: textoDe(d['method']),
    status: textoDe(d['status']),
    paidOn: typeof d['paidOn'] === 'string' ? d['paidOn'] : null,
    invoiceNumber: textoDe(d['invoiceNumber']),
    notes: textoDe(d['notes']),
  };
}

// ---------- ficha de boda ----------

/**
 * Todo lo que el superadmin necesita de una boda en una sola llamada: sus datos,
 * los correos de la pareja, el historial y los cobros.
 *
 * Los correos salen de Firebase Auth y no del documento de la boda: ahí no
 * están, y duplicarlos en Firestore sería una segunda copia de un dato personal.
 */
export const getWeddingFile = onCall<{ weddingId?: unknown }>(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK },
  async (peticion) => {
    exigirSuperadmin(peticion);
    const weddingId = idDe(peticion.data?.weddingId);

    const boda = await db().doc(`weddings/${weddingId}`).get();
    if (!boda.exists) throw new HttpsError('not-found', 'Esa boda no existe.');
    const datos = boda.data() ?? {};

    const ownerUids = Array.isArray(datos['ownerUids'])
      ? (datos['ownerUids'] as unknown[]).filter((u): u is string => typeof u === 'string')
      : [];

    const [cuentas, historial, pagos] = await Promise.all([
      ownerUids.length === 0
        ? Promise.resolve({ users: [] })
        : auth().getUsers(ownerUids.map((uid) => ({ uid }))),
      db()
        .collection('auditLog')
        .where('weddingId', '==', weddingId)
        .orderBy('createdAt', 'desc')
        .limit(MAX_ENTRADAS_HISTORIAL)
        .get(),
      db().collection('payments').where('weddingId', '==', weddingId).get(),
    ]);

    const porUid = new Map(cuentas.users.map((u) => [u.uid, u]));
    const contactos = ownerUids.map((uid) => {
      const u = porUid.get(uid);
      return {
        uid,
        email: u?.email ?? null,
        displayName: u?.displayName ?? null,
        phone: u?.phoneNumber ?? null,
        disabled: u?.disabled ?? false,
        lastSignIn: u?.metadata.lastSignInTime ?? null,
      };
    });

    const c = (datos['counters'] ?? {}) as Record<string, unknown>;
    const setup = (datos['setup'] ?? {}) as Record<string, unknown>;

    return {
      weddingId,
      slug: textoDe(datos['slug']),
      status: textoDe(datos['status']),
      plan: textoDe(datos['plan']),
      couple: pareja(datos),
      weddingDay: diaDeBoda(datos['weddingDate']),
      createdAt: isoDe(datos['createdAt']),
      authDomain: setup['authDomain'] === 'ok' ? 'ok' : 'pending',
      invitados: typeof c['guestsTotal'] === 'number' ? c['guestsTotal'] : 0,
      confirmados: typeof c['guestsConfirmed'] === 'number' ? c['guestsConfirmed'] : 0,
      contactos,
      historial: historial.docs.map((d) => {
        const e = d.data();
        return {
          id: d.id,
          action: textoDe(e['action']),
          actorRole: textoDe(e['actorRole']),
          actorUid: textoDe(e['actorUid']),
          at: isoDe(e['createdAt']),
          payload: typeof e['payload'] === 'object' && e['payload'] !== null ? e['payload'] : {},
        };
      }),
      pagos: pagos.docs
        .map((d) => pagoParaCliente(d.id, d.data()))
        .sort((a, b) => (b.paidOn ?? '').localeCompare(a.paidOn ?? '')),
    };
  },
);

// ---------- recuperación de contraseña ----------

/**
 * Genera el enlace para que una de las cuentas de la pareja elija contraseña.
 *
 * Solo se acepta un `uid` que **esté en `ownerUids` de esa boda**: sin esa
 * comprobación esta función sería «genera el enlace de restablecimiento de
 * cualquier cuenta de Nupcialis», incluida la del propio superadmin.
 *
 * El enlace **no se guarda** ni se escribe en el log: quien lo tenga puede
 * entrar en la cuenta. En el log queda quién lo pidió, para quién y cuándo.
 */
export const generateCoupleResetLink = onCall<{ weddingId?: unknown; uid?: unknown }>(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK },
  async (peticion) => {
    const superadmin = exigirSuperadmin(peticion);
    const weddingId = idDe(peticion.data?.weddingId);
    const uid = idDe(peticion.data?.uid, 'la cuenta');

    const boda = await db().doc(`weddings/${weddingId}`).get();
    if (!boda.exists) throw new HttpsError('not-found', 'Esa boda no existe.');
    const datos = boda.data() ?? {};

    const propietarios = Array.isArray(datos['ownerUids']) ? (datos['ownerUids'] as unknown[]) : [];
    if (!propietarios.includes(uid)) {
      throw new HttpsError('permission-denied', 'Esa cuenta no es de esta boda.');
    }

    const cuenta = await auth()
      .getUser(uid)
      .catch(() => null);
    if (!cuenta?.email) {
      throw new HttpsError('failed-precondition', 'Esa cuenta no tiene correo.', {
        motivo: 'sin-correo',
      });
    }

    const slug = textoDe(datos['slug']);
    const url = `https://${dominioDeBoda(slug, DOMINIO_BASE)}/panel/acceso`;

    let enlace: string;
    try {
      enlace = await auth().generatePasswordResetLink(cuenta.email, { url });
    } catch (error) {
      console.error('No se pudo generar el enlace de restablecimiento', uid, error);
      throw new HttpsError('internal', 'No se pudo generar el enlace.');
    }

    await auditar({
      actorUid: superadmin.uid,
      actorRole: 'superadmin',
      action: 'generateCoupleResetLink',
      weddingId,
      payload: { paraUid: uid },
    });

    return { weddingId, uid, email: cuenta.email, enlace };
  },
);

// ---------- cobros ----------

/**
 * Todos los cobros, y un índice mínimo de bodas para ponerles nombre.
 *
 * No hay pasarela de pago: esto es el libro de cuentas de Gabriel (Bizum,
 * transferencia, efectivo), con su número de factura. Quien emite la factura es
 * él, fuera de aquí; aquí solo se apunta el número.
 */
export const listPayments = onCall(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK },
  async (peticion) => {
    exigirSuperadmin(peticion);

    const [pagos, bodas] = await Promise.all([
      db().collection('payments').limit(MAX_PAGOS).get(),
      db().collection('weddings').get(),
    ]);

    return {
      pagos: pagos.docs.map((d) => pagoParaCliente(d.id, d.data())),
      bodas: bodas.docs.map((d) => {
        const datos = d.data();
        return { weddingId: d.id, slug: textoDe(datos['slug']), couple: pareja(datos) };
      }),
      recortado: pagos.size >= MAX_PAGOS,
    };
  },
);

function errorDePago(motivo: MotivoPagoInvalido): HttpsError {
  return new HttpsError('invalid-argument', 'El cobro no es válido.', { motivo });
}

export const savePayment = onCall<{ paymentId?: unknown; payment?: unknown }>(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK },
  async (peticion) => {
    const superadmin = exigirSuperadmin(peticion);

    const valido = validarPago(peticion.data?.payment);
    if (!valido.ok) throw errorDePago(valido.motivo);
    const pago = valido.pago;

    const boda = await db().doc(`weddings/${pago.weddingId}`).get();
    if (!boda.exists) throw errorDePago('boda');

    const existente = peticion.data?.paymentId;
    const esEdicion = typeof existente === 'string' && existente !== '';
    const ref = esEdicion
      ? db().doc(`payments/${idDe(existente, 'el cobro')}`)
      : db().collection('payments').doc();

    if (esEdicion) {
      const antes = await ref.get();
      if (!antes.exists) throw new HttpsError('not-found', 'Ese cobro no existe.');
      await ref.update({ ...pago, updatedAt: FieldValue.serverTimestamp() });
    } else {
      await ref.set({
        ...pago,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    await auditar({
      actorUid: superadmin.uid,
      actorRole: 'superadmin',
      action: esEdicion ? 'updatePayment' : 'createPayment',
      weddingId: pago.weddingId,
      payload: {
        paymentId: ref.id,
        amountCents: pago.amountCents,
        status: pago.status,
        invoiceNumber: pago.invoiceNumber,
      },
    });

    return { id: ref.id, ...pago };
  },
);

export const deletePayment = onCall<{ paymentId?: unknown }>(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK },
  async (peticion) => {
    const superadmin = exigirSuperadmin(peticion);
    const id = idDe(peticion.data?.paymentId, 'el cobro');

    const ref = db().doc(`payments/${id}`);
    const antes = await ref.get();
    if (!antes.exists) return { id, borrado: false };

    const d = antes.data() ?? {};
    await ref.delete();

    // El importe y la factura quedan en el log: un cobro borrado sin rastro es
    // un agujero en la contabilidad.
    await auditar({
      actorUid: superadmin.uid,
      actorRole: 'superadmin',
      action: 'deletePayment',
      weddingId: textoDe(d['weddingId']) || null,
      payload: {
        paymentId: id,
        amountCents: typeof d['amountCents'] === 'number' ? d['amountCents'] : 0,
        invoiceNumber: textoDe(d['invoiceNumber']),
      },
    });

    return { id, borrado: true };
  },
);

// ---------- recordatorios ----------

export const getReminders = onCall(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK },
  async (peticion) => {
    exigirSuperadmin(peticion);

    const [bodas, marcas] = await Promise.all([
      db().collection('weddings').get(),
      db().collection('reminderMarks').get(),
    ]);

    const enviados = new Set(marcas.docs.map((d) => d.id));
    const hoy = new Date().toISOString().slice(0, 10);

    const datosDe = new Map(
      bodas.docs.map((d) => {
        const datos = d.data();
        return [
          d.id,
          {
            slug: textoDe(datos['slug']),
            couple: pareja(datos),
            weddingDay: diaDeBoda(datos['weddingDate']),
            status: textoDe(datos['status']),
          },
        ] as const;
      }),
    );

    const recordatorios = calcularRecordatorios(
      [...datosDe].map(([weddingId, b]) => ({
        weddingId,
        status: b.status,
        weddingDay: b.weddingDay,
      })),
      enviados,
      hoy,
    );

    return {
      hoy,
      recordatorios: recordatorios.map((r) => ({
        ...r,
        slug: datosDe.get(r.weddingId)?.slug ?? '',
        couple: datosDe.get(r.weddingId)?.couple ?? { partnerA: '', partnerB: '' },
        weddingDay: datosDe.get(r.weddingId)?.weddingDay ?? null,
      })),
    };
  },
);

export const markReminderSent = onCall<{ weddingId?: unknown; key?: unknown; sent?: unknown }>(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK },
  async (peticion) => {
    const superadmin = exigirSuperadmin(peticion);
    const weddingId = idDe(peticion.data?.weddingId);
    const key = peticion.data?.key;
    if (!esClaveRecordatorio(key)) throw new HttpsError('invalid-argument', 'Ese aviso no existe.');
    const enviado = peticion.data?.sent !== false;

    const boda = await db().doc(`weddings/${weddingId}`).get();
    if (!boda.exists) throw new HttpsError('not-found', 'Esa boda no existe.');

    const ref = db().doc(`reminderMarks/${claveDeMarca(weddingId, key)}`);
    if (enviado) {
      await ref.set({
        weddingId,
        key,
        sentBy: superadmin.uid,
        sentAt: FieldValue.serverTimestamp(),
      });
    } else {
      await ref.delete();
    }

    await auditar({
      actorUid: superadmin.uid,
      actorRole: 'superadmin',
      action: enviado ? 'markReminderSent' : 'unmarkReminderSent',
      weddingId,
      payload: { key },
    });

    return { weddingId, key, sent: enviado };
  },
);
