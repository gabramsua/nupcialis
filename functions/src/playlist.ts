/**
 * La playlist colaborativa, del lado del invitado (§8.14).
 *
 * **Todo pasa por funciones, y no por comodidad.** La colección guarda en cada
 * canción la lista de `guestId` que la votaron: leerla directamente le diría a
 * cualquier invitado quién ha votado qué. Una regla puede negar una lectura,
 * no esconder un campo de ella, así que la colección es de la pareja y el
 * invitado ve la lista que arma `cancionesParaInvitado`, sin ningún id.
 *
 * Proponer y votar son transacciones por lo mismo que reservar un regalo: la
 * gente abre esto a la vez —el día que la pareja lo cuenta en el grupo— y dos
 * propuestas simultáneas de la misma canción no pueden acabar en dos filas con
 * la mitad de los votos cada una.
 */

import { FieldValue, type Transaction } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import {
  MAX_ARTISTA,
  MAX_TITULO,
  alternarVoto,
  cancionesDeTexto,
  cancionesParaInvitado,
  decidirAlta,
  leerCancion,
  limpiarTexto,
  type CancionGuardada,
  type CancionPublica,
} from './dominio/playlist';
import { EXIGIR_APP_CHECK, REGION, db } from './firebase';
import { modoDeAcceso } from './infra/boda';
import { exigirInvitado, exigirVerificado } from './infra/permisos';

interface Respuesta {
  readonly canciones: readonly CancionPublica[];
}

const ruta = (weddingId: string) => `weddings/${weddingId}/playlistSuggestions`;

async function leerLista(
  weddingId: string,
  transaccion?: Transaction,
): Promise<readonly CancionGuardada[]> {
  const coleccion = db().collection(ruta(weddingId));
  const snap = await (transaccion ? transaccion.get(coleccion) : coleccion.get());

  return snap.docs.flatMap((doc) => {
    const cancion = leerCancion(doc.id, doc.data());
    return cancion ? [cancion] : [];
  });
}

async function respuesta(weddingId: string, guestId: string): Promise<Respuesta> {
  return { canciones: cancionesParaInvitado(await leerLista(weddingId), guestId) };
}

/** La lista de canciones, ordenada por votos y con lo que ha votado él. */
export const listPlaylist = onCall(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK },
  async (peticion): Promise<Respuesta> => {
    const invitado = exigirInvitado(peticion);
    exigirVerificado(invitado, await modoDeAcceso(invitado.weddingId));

    return respuesta(invitado.weddingId, invitado.guestId);
  },
);

interface EntradaProponer {
  readonly title?: unknown;
  readonly artist?: unknown;
}

/**
 * Propone una canción.
 *
 * Si ya estaba —con otras mayúsculas, sin tildes, con «(Remastered)» al
 * final— **no se duplica**: se le suma el voto a la que existe y se le dice,
 * porque quien pidió una canción y la ve con tres votos entiende que no es la
 * única a la que le gusta, y no que su petición se ha perdido.
 */
export const suggestSong = onCall<EntradaProponer>(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK },
  async (peticion) => {
    const invitado = exigirInvitado(peticion);
    exigirVerificado(invitado, await modoDeAcceso(invitado.weddingId));
    const { weddingId, guestId } = invitado;

    const title = limpiarTexto(peticion.data?.title, MAX_TITULO);
    const artist = limpiarTexto(peticion.data?.artist, MAX_ARTISTA);

    const resultado = await db().runTransaction(async (transaccion) => {
      const lista = await leerLista(weddingId, transaccion);
      const decision = decidirAlta(lista, guestId, title, artist);

      switch (decision.accion) {
        case 'crear': {
          const ref = db().collection(ruta(weddingId)).doc();
          transaccion.set(ref, {
            title,
            artist,
            suggestedBy: guestId,
            source: 'guest',
            votes: [guestId],
            status: 'pending',
            createdAt: FieldValue.serverTimestamp(),
          });
          return 'creada' as const;
        }

        case 'votar': {
          const existente = lista.find((c) => c.id === decision.id)!;
          // Si ya la había votado, no se le quita: pedirla otra vez no es
          // retirar el voto.
          if (!existente.votes.includes(guestId)) {
            transaccion.update(db().doc(`${ruta(weddingId)}/${decision.id}`), {
              votes: FieldValue.arrayUnion(guestId),
            });
          }
          return 'ya-estaba' as const;
        }

        case 'no-disponible':
          throw new HttpsError('failed-precondition', 'Esa canción no está disponible.', {
            motivo: 'no-disponible',
          });

        case 'incompleta':
          throw new HttpsError('invalid-argument', 'Falta el título de la canción.', {
            motivo: 'incompleta',
          });

        case 'tope-invitado':
          throw new HttpsError('resource-exhausted', 'Has llegado al máximo de propuestas.', {
            motivo: 'tope-invitado',
          });

        case 'tope-lista':
          throw new HttpsError('resource-exhausted', 'La lista está llena.', {
            motivo: 'tope-lista',
          });
      }
    });

    return { ...(await respuesta(weddingId, guestId)), resultado };
  },
);

interface EntradaVotar {
  readonly songId?: unknown;
}

/**
 * Pone o quita el voto del invitado. Un voto por invitado y canción: el
 * documento guarda un conjunto de `guestId`, así que votar dos veces es
 * imposible por construcción y no por comprobación.
 */
export const voteSong = onCall<EntradaVotar>(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK },
  async (peticion): Promise<Respuesta> => {
    const invitado = exigirInvitado(peticion);
    exigirVerificado(invitado, await modoDeAcceso(invitado.weddingId));
    const { weddingId, guestId } = invitado;

    const songId = typeof peticion.data?.songId === 'string' ? peticion.data.songId.trim() : '';
    if (songId === '') throw new HttpsError('invalid-argument', 'Falta la canción.');

    const ref = db().doc(`${ruta(weddingId)}/${songId}`);

    await db().runTransaction(async (transaccion) => {
      const snap = await transaccion.get(ref);
      const cancion = leerCancion(songId, snap.data());

      // Descartada o vetada se comporta como «ya no está»: el invitado puede
      // tener la pantalla abierta de antes de que la pareja decidiera.
      if (!cancion || cancion.status === 'discarded' || cancion.status === 'vetoed') {
        throw new HttpsError('not-found', 'Esa canción ya no está.');
      }

      transaccion.update(ref, { votes: alternarVoto(cancion.votes, guestId) });
    });

    return respuesta(weddingId, guestId);
  },
);

/**
 * La canción que el invitado escribió en el RSVP entra sola en la lista.
 *
 * Es un efecto secundario de confirmar, así que **no puede romper la
 * confirmación**: quien envió su respuesta bien no debe ver un error porque la
 * playlist estuviera llena. Quien llama lo envuelve en un `try`.
 *
 * Entra con su voto puesto (es lo que pide) y con origen `rsvp`, que no gasta
 * el tope de propuestas: eso es de lo que se propone a propósito. Si el
 * invitado vuelve a enviar el formulario con la misma canción no pasa nada:
 * `decidirAlta` la reconoce y el voto ya estaba.
 */
export async function proponerDesdeRsvp(
  weddingId: string,
  guestId: string,
  texto: unknown,
): Promise<void> {
  for (const { title, artist } of cancionesDeTexto(texto)) {
    await db().runTransaction(async (transaccion) => {
      const lista = await leerLista(weddingId, transaccion);
      const decision = decidirAlta(lista, guestId, title, artist);

      if (decision.accion === 'crear') {
        transaccion.set(db().collection(ruta(weddingId)).doc(), {
          title,
          artist,
          suggestedBy: guestId,
          source: 'rsvp',
          votes: [guestId],
          status: 'pending',
          createdAt: FieldValue.serverTimestamp(),
        });
      } else if (decision.accion === 'votar') {
        transaccion.update(db().doc(`${ruta(weddingId)}/${decision.id}`), {
          votes: FieldValue.arrayUnion(guestId),
        });
      }
    });
  }
}
