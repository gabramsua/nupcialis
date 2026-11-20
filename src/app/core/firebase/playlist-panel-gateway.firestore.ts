/**
 * La playlist, leída y decidida por la pareja desde su panel.
 *
 * Por Firestore directamente, como los regalos de su lista: la colección es
 * suya (las reglas cierran a los invitados porque guarda quién votó qué).
 *
 * Frontera de confianza (D-19): lo que vuelve de Firestore pasa por
 * `leerCancion`, el mismo código que usa el servidor. Y de los votos solo sale
 * **cuántos hay**.
 */

import { inject } from '@angular/core';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';

import { leerCancion, type EstadoCancion } from '../../features/public-site/playlist/playlist';
import {
  ordenarCancionesDelPanel,
  type FalloPlaylistPanel,
  type PuertaPlaylistPanel,
  type ResultadoEscrituraPlaylist,
  type ResultadoPlaylistPanel,
} from '../playlist/playlist-panel-gateway';
import { FIRESTORE } from './firestore.providers';

export function crearPuertaPlaylistPanelFirestore(): PuertaPlaylistPanel {
  const db = inject(FIRESTORE);

  const ruta = (weddingId: string) => collection(db, 'weddings', weddingId, 'playlistSuggestions');

  const escribir = async (accion: () => Promise<unknown>): Promise<ResultadoEscrituraPlaylist> => {
    try {
      await accion();
      return { ok: true };
    } catch (error) {
      return { ok: false, fallo: traducirPlaylistPanel(error) };
    }
  };

  return {
    async listar(weddingId: string): Promise<ResultadoPlaylistPanel> {
      try {
        const snap = await getDocs(ruta(weddingId));
        const canciones = snap.docs.flatMap((d) => {
          const c = leerCancion(d.id, d.data());
          return c
            ? [
                {
                  id: c.id,
                  title: c.title,
                  artist: c.artist,
                  votos: c.votes.length,
                  status: c.status,
                  source: c.source,
                },
              ]
            : [];
        });
        return { ok: true, canciones: ordenarCancionesDelPanel(canciones) };
      } catch (error) {
        return { ok: false, fallo: traducirPlaylistPanel(error) };
      }
    },

    cambiarEstado: (weddingId: string, id: string, estado: EstadoCancion) =>
      escribir(() => updateDoc(doc(ruta(weddingId), id), { status: estado })),

    anadir: (weddingId: string, title: string, artist: string, estado: EstadoCancion) =>
      escribir(() =>
        addDoc(ruta(weddingId), {
          title,
          artist,
          suggestedBy: '',
          source: 'couple',
          votes: [],
          status: estado,
          createdAt: serverTimestamp(),
        }),
      ),

    borrar: (weddingId: string, id: string) => escribir(() => deleteDoc(doc(ruta(weddingId), id))),
  };
}

/** Exportada para poder probarla sin red, como las demás traducciones. */
export function traducirPlaylistPanel(error: unknown): FalloPlaylistPanel {
  const fallo = (error ?? {}) as { code?: string; message?: string };

  switch (fallo.code) {
    case 'unavailable':
    case 'deadline-exceeded':
      return { tipo: 'red' };

    case 'permission-denied':
    case 'unauthenticated':
      return { tipo: 'sin-permiso' };

    default:
      return { tipo: 'error', mensaje: fallo.message ?? 'Error desconocido' };
  }
}
