/**
 * Los consejos de cada módulo del panel, gestionados desde el superadmin (D-53).
 *
 * - `getTips`: los lee la pareja (todos de una vez, son pocos y pequeños).
 * - `listTips` / `saveTip` / `resetTip`: los edita el superadmin. Un texto vacío
 *   guardado es «este módulo no lleva consejo»; `resetTip` vuelve al de fábrica.
 */

import { FieldValue } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import {
  CONSEJOS_DE_FABRICA,
  MAX_CONSEJO,
  MODULOS_CON_CONSEJO,
  consejoEfectivo,
  esModuloConConsejo,
  limpiarConsejo,
} from './dominio/consejos';
import { EXIGIR_APP_CHECK, REGION, db } from './firebase';
import { auditar } from './infra/auditoria';
import { exigirPareja, exigirSuperadmin } from './infra/permisos';

async function guardados(): Promise<Map<string, unknown>> {
  const snap = await db().collection('tips').get();
  return new Map(snap.docs.map((d) => [d.id, d.data()]));
}

export const getTips = onCall({ region: REGION, enforceAppCheck: EXIGIR_APP_CHECK }, async (p) => {
  exigirPareja(p);
  const docs = await guardados();

  const consejos: Record<string, string> = {};
  for (const modulo of MODULOS_CON_CONSEJO) {
    const texto = consejoEfectivo(modulo, docs.get(modulo));
    if (texto !== '') consejos[modulo] = texto;
  }
  return { consejos };
});

export const listTips = onCall({ region: REGION, enforceAppCheck: EXIGIR_APP_CHECK }, async (p) => {
  exigirSuperadmin(p);
  const docs = await guardados();

  return {
    max: MAX_CONSEJO,
    consejos: MODULOS_CON_CONSEJO.map((modulo) => {
      const texto = consejoEfectivo(modulo, docs.get(modulo));
      return {
        modulo,
        texto,
        personalizado: texto !== (CONSEJOS_DE_FABRICA[modulo] ?? ''),
      };
    }),
  };
});

export const saveTip = onCall<{ modulo?: unknown; texto?: unknown }>(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK },
  async (peticion) => {
    const superadmin = exigirSuperadmin(peticion);
    const modulo = peticion.data?.modulo;
    if (!esModuloConConsejo(modulo)) {
      throw new HttpsError('invalid-argument', 'Ese módulo no lleva consejo.');
    }
    const texto = limpiarConsejo(peticion.data?.texto);
    if (texto === null) {
      throw new HttpsError('invalid-argument', 'El consejo es demasiado largo.', {
        motivo: 'largo',
      });
    }

    await db().doc(`tips/${modulo}`).set({ text: texto, updatedAt: FieldValue.serverTimestamp() });

    await auditar({
      actorUid: superadmin.uid,
      actorRole: 'superadmin',
      action: 'saveTip',
      weddingId: null,
      payload: { modulo },
    });
    return { ok: true as const };
  },
);

export const resetTip = onCall<{ modulo?: unknown }>(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK },
  async (peticion) => {
    const superadmin = exigirSuperadmin(peticion);
    const modulo = peticion.data?.modulo;
    if (!esModuloConConsejo(modulo)) {
      throw new HttpsError('invalid-argument', 'Ese módulo no lleva consejo.');
    }

    await db().doc(`tips/${modulo}`).delete();

    await auditar({
      actorUid: superadmin.uid,
      actorRole: 'superadmin',
      action: 'resetTip',
      weddingId: null,
      payload: { modulo },
    });
    return { ok: true as const };
  },
);
