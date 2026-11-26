/**
 * Las mesas, por Firestore directamente.
 *
 * La colección está abierta a la pareja y cerrada a todo lo demás; lo que no
 * se escribe aquí es **quién se sienta**, que vive en la ficha del invitado y
 * pasa por función (ver `mesas-sentar-gateway.firebase.ts`).
 *
 * Frontera de confianza (D-19): lo que vuelve se comprueba antes de salir.
 */

import { inject } from '@angular/core';
import { collection, deleteDoc, doc, getDocs, setDoc, updateDoc } from 'firebase/firestore';

import { sanearMesas, type Mesa } from '../../features/panel/mesas/mesas';
import {
  type DatosMesa,
  type FalloMesas,
  type PuertaMesas,
  type ResultadoEscrituraMesa,
  type ResultadoMesas,
} from '../mesas/mesas-gateway';
import { FIRESTORE } from './firestore.providers';

export function crearPuertaMesasFirestore(): PuertaMesas {
  const db = inject(FIRESTORE);
  const ruta = (weddingId: string) => collection(db, 'weddings', weddingId, 'tables');

  return {
    async listar(weddingId: string): Promise<ResultadoMesas> {
      try {
        const snap = await getDocs(ruta(weddingId));
        const mesas: readonly Mesa[] = sanearMesas(
          snap.docs.map((d) => ({ id: d.id, ...d.data() })),
        );
        return { ok: true, mesas };
      } catch (error) {
        return { ok: false, fallo: traducirMesas(error) };
      }
    },

    async guardar(weddingId: string, datos: DatosMesa): Promise<ResultadoEscrituraMesa> {
      try {
        const campos = {
          name: datos.name,
          shape: datos.shape,
          minSeats: datos.minSeats,
          maxSeats: datos.maxSeats,
          order: datos.order,
          notes: datos.notes,
        };

        if (datos.id) await updateDoc(doc(ruta(weddingId), datos.id), campos);
        else await setDoc(doc(ruta(weddingId)), campos);

        return { ok: true };
      } catch (error) {
        return { ok: false, fallo: traducirMesas(error) };
      }
    },

    async borrar(weddingId: string, id: string): Promise<ResultadoEscrituraMesa> {
      try {
        await deleteDoc(doc(ruta(weddingId), id));
        return { ok: true };
      } catch (error) {
        return { ok: false, fallo: traducirMesas(error) };
      }
    },
  };
}

export function traducirMesas(error: unknown): FalloMesas {
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
