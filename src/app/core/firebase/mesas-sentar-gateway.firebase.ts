/**
 * Sentar invitados, por función invocable.
 *
 * La mesa de un invitado vive en su ficha —un invitado está en una mesa y solo
 * en una— y `guests` está cerrada al cliente (regla de oro 2). Así que esto no
 * puede ser una escritura directa por mucho que la pantalla sea de la pareja.
 */

import { inject } from '@angular/core';
import { httpsCallable } from 'firebase/functions';

import { type PuertaSentar, type ResultadoSentar } from '../mesas/mesas-gateway';
import { traducirMesas } from './mesas-gateway.firestore';
import { FIREBASE_FUNCTIONS } from './functions.providers';

export function crearPuertaSentarFirebase(): PuertaSentar {
  const functions = inject(FIREBASE_FUNCTIONS);

  return {
    async sentar(guestIds: readonly string[], tableId: string | null): Promise<ResultadoSentar> {
      try {
        const llamar = httpsCallable(functions, 'assignGuestsToTable');
        const { data } = await llamar({ guestIds: [...guestIds], tableId });
        const datos = (data ?? {}) as Record<string, unknown>;

        return {
          ok: true,
          sentados: typeof datos['sentados'] === 'number' ? datos['sentados'] : 0,
        };
      } catch (error) {
        return { ok: false, fallo: traducirMesas(error) };
      }
    },
  };
}
