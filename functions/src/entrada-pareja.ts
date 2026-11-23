/**
 * `recordOwnerLogin`: cuenta las veces que la pareja entra en su panel (D-53).
 *
 * El panel lo llama una vez al abrirse (y una vez por pestaña, desde el
 * cliente). Aquí, además, se descartan las llamadas con menos de media hora
 * entre sí: es una cifra para que el superadmin vea si la pareja usa el panel,
 * no un registro de cada recarga.
 *
 * Escribe `access.ownerLogins` y `access.lastOwnerLoginAt`, campos de sistema
 * (regla 6): la pareja no puede tocarlos desde el navegador.
 */

import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { onCall } from 'firebase-functions/v2/https';

import { EXIGIR_APP_CHECK, REGION, db } from './firebase';
import { exigirPareja } from './infra/permisos';

const MARGEN_MS = 30 * 60 * 1000;

/** ¿Cuenta como una entrada nueva? Pura, para probarla sin red. */
export function cuentaComoEntrada(ultima: unknown, ahora: Date): boolean {
  if (!(ultima instanceof Timestamp)) return true;
  return ahora.getTime() - ultima.toMillis() >= MARGEN_MS;
}

export const recordOwnerLogin = onCall(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK },
  async (peticion) => {
    const { weddingId } = exigirPareja(peticion);
    const ref = db().doc(`weddings/${weddingId}`);

    const contada = await db().runTransaction(async (t) => {
      const snap = await t.get(ref);
      if (!snap.exists) return false;
      const acceso = (snap.data()?.['access'] ?? {}) as Record<string, unknown>;
      if (!cuentaComoEntrada(acceso['lastOwnerLoginAt'], new Date())) return false;

      t.update(ref, {
        'access.ownerLogins': FieldValue.increment(1),
        'access.lastOwnerLoginAt': FieldValue.serverTimestamp(),
      });
      return true;
    });

    return { ok: true as const, contada };
  },
);
