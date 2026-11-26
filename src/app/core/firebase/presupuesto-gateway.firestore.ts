/**
 * El presupuesto de la pareja, en Firestore (`weddings/{id}/budgetItems`).
 *
 * Frontera de confianza (D-19): lo que vuelve de Firestore pasa por
 * `leerPartida`, que descarta lo roto en vez de tumbar la lista.
 */

import { inject } from '@angular/core';
import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';

import { leerPartida, type DatosDePartida } from '../../features/panel/presupuesto/presupuesto';
import type {
  FalloPresupuesto,
  PuertaPresupuesto,
  ResultadoEscrituraPartida,
  ResultadoPartidas,
} from '../presupuesto/presupuesto-gateway';
import { FIRESTORE } from './firestore.providers';

/** El día guardado como medianoche UTC (como `weddingDate`), de vuelta a `'AAAA-MM-DD'`. */
function aDia(valor: unknown): string | null {
  return valor instanceof Timestamp ? valor.toDate().toISOString().slice(0, 10) : null;
}

function deDia(dia: string | null): Timestamp | null {
  return dia === null ? null : Timestamp.fromDate(new Date(`${dia}T00:00:00Z`));
}

export function crearPuertaPresupuestoFirestore(): PuertaPresupuesto {
  const db = inject(FIRESTORE);
  const ruta = (weddingId: string) => collection(db, 'weddings', weddingId, 'budgetItems');

  return {
    async listar(weddingId): Promise<ResultadoPartidas> {
      try {
        const snap = await getDocs(ruta(weddingId));
        const partidas = snap.docs.flatMap((d) => {
          const datos = d.data();
          const leida = leerPartida(d.id, datos, aDia(datos['dueDate']));
          return leida ? [leida] : [];
        });
        return { ok: true, partidas };
      } catch (error) {
        return { ok: false, fallo: traducirPresupuesto(error) };
      }
    },

    async guardar(weddingId, id, datos: DatosDePartida, orden): Promise<ResultadoEscrituraPartida> {
      try {
        // Ruta de campos concreta: al editar no se tocan `icon`, `color` ni lo
        // que algún día cuelgue de la partida.
        const campos = {
          category: datos.category,
          concept: datos.concept,
          estimatedCents: datos.estimatedCents,
          actualCents: datos.actualCents,
          paid: datos.paid,
          dueDate: deDia(datos.dueOn),
          notes: datos.notes,
          vendorId: datos.vendorId,
        };

        if (id) {
          await updateDoc(doc(ruta(weddingId), id), campos);
        } else {
          await addDoc(ruta(weddingId), {
            ...campos,
            icon: '',
            color: null,
            order: orden,
            createdAt: serverTimestamp(),
          });
        }
        return { ok: true };
      } catch (error) {
        return { ok: false, fallo: traducirPresupuesto(error) };
      }
    },

    async marcarPagada(weddingId, id, pagada): Promise<ResultadoEscrituraPartida> {
      try {
        await updateDoc(doc(ruta(weddingId), id), { paid: pagada });
        return { ok: true };
      } catch (error) {
        return { ok: false, fallo: traducirPresupuesto(error) };
      }
    },

    async enlazarProveedor(weddingId, id, vendorId): Promise<ResultadoEscrituraPartida> {
      try {
        await updateDoc(doc(ruta(weddingId), id), { vendorId });
        return { ok: true };
      } catch (error) {
        return { ok: false, fallo: traducirPresupuesto(error) };
      }
    },

    async borrar(weddingId, id): Promise<ResultadoEscrituraPartida> {
      try {
        await deleteDoc(doc(ruta(weddingId), id));
        return { ok: true };
      } catch (error) {
        return { ok: false, fallo: traducirPresupuesto(error) };
      }
    },
  };
}

/** Exportada para poder probarla sin red, como las demás traducciones. */
export function traducirPresupuesto(error: unknown): FalloPresupuesto {
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
