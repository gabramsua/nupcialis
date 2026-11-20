/**
 * `getInviteLink`: el enlace que la pareja le manda a un invitado (D-34).
 *
 * El enlace lleva un token por invitado, y ese token **lo genera el servidor**.
 * No se deriva del `guestId` ni de nada adivinable: son 24 bytes de azar
 * guardados en su documento. Si se derivara, conocer un id —que viaja en
 * cualquier captura de pantalla del panel— daría el enlace de esa persona.
 *
 * Se crea la primera vez que la pareja comparte y se reutiliza después, para
 * que el enlace que ya mandó por WhatsApp siga valiendo. `rotar` lo cambia, que
 * es la única forma de invalidar uno que se haya ido donde no debía.
 *
 * Lo que el enlace **no** da es permiso para nada: entra con nivel `enlace` y
 * eso solo sirve para ver la web. Ver `dominio/acceso.ts`.
 */

import { randomBytes } from 'node:crypto';

import { FieldValue } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import { BYTES_TOKEN } from './dominio/acceso';
import { EXIGIR_APP_CHECK, REGION, db } from './firebase';
import { exigirPareja } from './infra/permisos';

/** Base64url: lo que cabe en una URL sin escapar nada. */
export function nuevoToken(): string {
  return randomBytes(BYTES_TOKEN).toString('base64url');
}

export interface EntradaEnlace {
  readonly guestId?: unknown;
  readonly rotar?: unknown;
}

export const getInviteLink = onCall<EntradaEnlace>(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK },
  async (peticion) => {
    const { weddingId } = exigirPareja(peticion);

    const guestId = typeof peticion.data?.guestId === 'string' ? peticion.data.guestId : '';
    if (guestId === '') throw new HttpsError('invalid-argument', 'Falta el invitado.');

    const ref = db().doc(`weddings/${weddingId}/guests/${guestId}`);
    const snap = await ref.get();
    const invitado = snap.data();

    if (!snap.exists || !invitado) throw new HttpsError('not-found', 'Ese invitado no existe.');

    const actual = invitado['inviteToken'];
    const rotar = peticion.data?.rotar === true;
    const token = !rotar && typeof actual === 'string' && actual !== '' ? actual : nuevoToken();

    if (token !== actual) {
      await ref.update({ inviteToken: token, updatedAt: FieldValue.serverTimestamp() });
    }

    return { token, rotado: token !== actual };
  },
);
