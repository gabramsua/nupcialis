/**
 * El libro de firmas, del lado del invitado (§8.15).
 *
 * La colección guarda el `guestId` de cada autor, y una regla puede negar una
 * lectura pero no esconder un campo de ella: por eso es de la pareja y el
 * invitado lee lo que arma `firmasParaInvitado`, sin ningún id. Firmar es una
 * transacción por lo mismo que proponer una canción: dos pestañas abiertas no
 * pueden saltarse el tope por invitado.
 *
 * Se publica al enviar y la pareja lo modera a posteriori desde el panel.
 */

import { FieldValue, type Transaction } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import {
  decidirFirma,
  firmasParaInvitado,
  leerFirma,
  limpiarMensaje,
  nombreDeFirma,
  type FirmaGuardada,
  type FirmaPublica,
} from './dominio/libro';
import { EXIGIR_APP_CHECK, REGION, db } from './firebase';
import { exigirModulo, modoDeAcceso } from './infra/boda';
import { exigirInvitado, exigirVerificado } from './infra/permisos';

interface Respuesta {
  readonly firmas: readonly FirmaPublica[];
}

const ruta = (weddingId: string) => `weddings/${weddingId}/guestbookEntries`;

async function leerLibro(
  weddingId: string,
  transaccion?: Transaction,
): Promise<readonly FirmaGuardada[]> {
  const coleccion = db().collection(ruta(weddingId));
  const snap = await (transaccion ? transaccion.get(coleccion) : coleccion.get());

  return snap.docs.flatMap((doc) => {
    const firma = leerFirma(doc.id, doc.data());
    return firma ? [firma] : [];
  });
}

async function respuesta(weddingId: string, guestId: string): Promise<Respuesta> {
  return { firmas: firmasParaInvitado(await leerLibro(weddingId), guestId) };
}

/** Las firmas visibles, la más reciente primero. */
export const listGuestbook = onCall(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK },
  async (peticion): Promise<Respuesta> => {
    const invitado = exigirInvitado(peticion);
    exigirVerificado(invitado, await modoDeAcceso(invitado.weddingId));
    await exigirModulo(invitado.weddingId, 'guestbook');

    return respuesta(invitado.weddingId, invitado.guestId);
  },
);

interface EntradaFirmar {
  readonly message?: unknown;
}

export const signGuestbook = onCall<EntradaFirmar>(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK },
  async (peticion): Promise<Respuesta> => {
    const invitado = exigirInvitado(peticion);
    exigirVerificado(invitado, await modoDeAcceso(invitado.weddingId));
    await exigirModulo(invitado.weddingId, 'guestbook');
    const { weddingId, guestId } = invitado;

    const mensaje = limpiarMensaje(peticion.data?.message);

    const quien = await db().doc(`weddings/${weddingId}/guests/${guestId}`).get();
    if (!quien.exists) throw new HttpsError('not-found', 'Ese invitado no existe.');

    await db().runTransaction(async (transaccion) => {
      const libro = await leerLibro(weddingId, transaccion);

      switch (decidirFirma(libro, guestId, mensaje)) {
        case 'crear':
          transaccion.set(db().collection(ruta(weddingId)).doc(), {
            guestId,
            authorName: nombreDeFirma(quien.data() ?? {}),
            message: mensaje,
            status: 'visible',
            createdAt: FieldValue.serverTimestamp(),
          });
          return;

        case 'vacia':
          throw new HttpsError('invalid-argument', 'Escribe algo antes de firmar.', {
            motivo: 'vacia',
          });

        case 'tope-invitado':
          throw new HttpsError('resource-exhausted', 'Has llegado al máximo de firmas.', {
            motivo: 'tope-invitado',
          });

        case 'tope-libro':
          throw new HttpsError('resource-exhausted', 'El libro está lleno.', {
            motivo: 'tope-libro',
          });
      }
    });

    return respuesta(weddingId, guestId);
  },
);

interface EntradaBorrar {
  readonly id?: unknown;
}

/** Quita **su** firma. Una ajena responde igual que una que no existe. */
export const deleteGuestbookEntry = onCall<EntradaBorrar>(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK },
  async (peticion): Promise<Respuesta> => {
    const invitado = exigirInvitado(peticion);
    exigirVerificado(invitado, await modoDeAcceso(invitado.weddingId));
    const { weddingId, guestId } = invitado;

    const id = typeof peticion.data?.id === 'string' ? peticion.data.id : '';
    if (id === '' || id.includes('/')) throw new HttpsError('not-found', 'Esa firma no existe.');

    const ref = db().doc(`${ruta(weddingId)}/${id}`);
    const snap = await ref.get();
    if (!snap.exists || snap.data()?.['guestId'] !== guestId) {
      throw new HttpsError('not-found', 'Esa firma no existe.');
    }
    await ref.delete();

    return respuesta(weddingId, guestId);
  },
);
