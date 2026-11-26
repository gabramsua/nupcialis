/**
 * El libro de firmas, leído y moderado por la pareja desde su panel.
 *
 * Por Firestore directamente, como la playlist: la colección es suya (las
 * reglas cierran a los invitados porque guarda el `guestId` de cada autor).
 * Ese identificador **no sale de aquí**.
 */

import { inject } from '@angular/core';
import { collection, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore';

import {
  ordenarFirmasDelPanel,
  type EstadoFirmaPanel,
  type FalloLibroPanel,
  type FirmaDelPanel,
  type PuertaLibroPanel,
  type ResultadoEscrituraLibro,
  type ResultadoLibroPanel,
} from '../libro/libro-panel-gateway';
import { FIRESTORE } from './firestore.providers';

/** Frontera de confianza (D-19): lo que vuelve de Firestore se revisa campo a campo. */
export function leerFirmaDelPanel(
  id: string,
  datos: Record<string, unknown>,
): FirmaDelPanel | null {
  const mensaje = typeof datos['message'] === 'string' ? datos['message'] : '';
  if (mensaje === '') return null;

  const creada = datos['createdAt'] as { toDate?: () => Date } | null | undefined;
  const cuando =
    creada && typeof creada.toDate === 'function' ? creada.toDate().toISOString() : null;

  return {
    id,
    autor: typeof datos['authorName'] === 'string' ? datos['authorName'] : '',
    mensaje,
    status: datos['status'] === 'hidden' ? 'hidden' : 'visible',
    cuando,
  };
}

export function crearPuertaLibroPanelFirestore(): PuertaLibroPanel {
  const db = inject(FIRESTORE);

  const ruta = (weddingId: string) => collection(db, 'weddings', weddingId, 'guestbookEntries');

  const escribir = async (accion: () => Promise<unknown>): Promise<ResultadoEscrituraLibro> => {
    try {
      await accion();
      return { ok: true };
    } catch (error) {
      return { ok: false, fallo: traducirLibroPanel(error) };
    }
  };

  return {
    async listar(weddingId: string): Promise<ResultadoLibroPanel> {
      try {
        const snap = await getDocs(ruta(weddingId));
        const firmas = snap.docs.flatMap((d) => {
          const f = leerFirmaDelPanel(d.id, d.data());
          return f ? [f] : [];
        });
        return { ok: true, firmas: ordenarFirmasDelPanel(firmas) };
      } catch (error) {
        return { ok: false, fallo: traducirLibroPanel(error) };
      }
    },

    cambiarEstado: (weddingId: string, id: string, estado: EstadoFirmaPanel) =>
      escribir(() => updateDoc(doc(ruta(weddingId), id), { status: estado })),

    borrar: (weddingId: string, id: string) => escribir(() => deleteDoc(doc(ruta(weddingId), id))),
  };
}

/** Exportada para poder probarla sin red, como las demás traducciones. */
export function traducirLibroPanel(error: unknown): FalloLibroPanel {
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
