/**
 * El cuaderno de lo recibido, por Firestore y solo para la pareja.
 *
 * Sin función de por medio a propósito: no hay nada que decidir en servidor
 * —ni audiencias, ni anonimato, ni concurrencia— y lo que sí hay es una regla
 * que cierra la colección a todo el que no sea la pareja. Añadir una invocable
 * aquí sería añadir una puerta a un sitio donde no hace falta ninguna.
 *
 * Frontera de confianza (D-19): lo que vuelve se sanea antes de salir.
 */

import { inject } from '@angular/core';
import { collection, deleteDoc, doc, getDocs, setDoc, updateDoc } from 'firebase/firestore';

import { sanearRecibidos } from '../../features/panel/regalos/recibidos';
import {
  type DatosRecibido,
  type FalloRecibidos,
  type PuertaRecibidos,
  type ResultadoEscrituraRecibido,
  type ResultadoRecibidos,
} from '../regalos/recibidos-gateway';
import { FIRESTORE } from './firestore.providers';

export function crearPuertaRecibidosFirestore(): PuertaRecibidos {
  const db = inject(FIRESTORE);

  const ruta = (weddingId: string) => collection(db, 'weddings', weddingId, 'giftsReceived');

  return {
    async listar(weddingId: string): Promise<ResultadoRecibidos> {
      try {
        const snap = await getDocs(ruta(weddingId));
        return {
          ok: true,
          recibidos: sanearRecibidos(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
        };
      } catch (error) {
        return { ok: false, fallo: traducirRecibido(error) };
      }
    },

    async guardar(weddingId: string, datos: DatosRecibido): Promise<ResultadoEscrituraRecibido> {
      try {
        const campos = {
          guestId: datos.guestId,
          fromLabel: datos.fromLabel,
          amount: datos.amount,
          currency: 'EUR',
          method: datos.method,
          giftDescription: datos.giftDescription,
          receivedAt: datos.receivedAt,
          thanked: datos.thanked,
          thankedAt: datos.thankedAt,
          notes: datos.notes,
        };

        if (datos.id) {
          await updateDoc(doc(ruta(weddingId), datos.id), campos);
        } else {
          await setDoc(doc(ruta(weddingId)), campos);
        }

        return { ok: true };
      } catch (error) {
        return { ok: false, fallo: traducirRecibido(error) };
      }
    },

    async borrar(weddingId: string, id: string): Promise<ResultadoEscrituraRecibido> {
      try {
        await deleteDoc(doc(ruta(weddingId), id));
        return { ok: true };
      } catch (error) {
        return { ok: false, fallo: traducirRecibido(error) };
      }
    },
  };
}

/** Exportada para poder probarla sin red, como las demás traducciones. */
export function traducirRecibido(error: unknown): FalloRecibidos {
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
