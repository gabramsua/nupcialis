/**
 * El ranking de la pareja y el vaciado, por función invocable.
 *
 * No se puede leer `quizResults` y ya está: la tabla necesita el **nombre y el
 * teléfono** de cada jugador, y `guests` está cerrada a lectura directa
 * (regla de oro 2). El cruce lo hace el servidor.
 */

import { inject } from '@angular/core';
import { httpsCallable } from 'firebase/functions';

import {
  type JugadorDelQuiz,
  type PuertaRankingQuiz,
  type ResultadoJugadores,
  type ResultadoVaciado,
} from '../quiz/quiz-admin-gateway';
import { traducir } from './quiz-admin-gateway.firestore';
import { FIREBASE_FUNCTIONS } from './functions.providers';

export function crearPuertaRankingQuizFirebase(): PuertaRankingQuiz {
  const functions = inject(FIREBASE_FUNCTIONS);

  return {
    async jugadores(): Promise<ResultadoJugadores> {
      try {
        const llamar = httpsCallable(functions, 'listQuizPlays');
        const { data } = await llamar({});
        const datos = (data ?? {}) as Record<string, unknown>;
        const lista = Array.isArray(datos['jugadores']) ? datos['jugadores'] : [];

        return { ok: true, jugadores: lista.flatMap(aJugador) };
      } catch (error) {
        return { ok: false, fallo: traducir(error) };
      }
    },

    async vaciar(): Promise<ResultadoVaciado> {
      try {
        const llamar = httpsCallable(functions, 'clearQuizRanking');
        const { data } = await llamar({});
        const datos = (data ?? {}) as Record<string, unknown>;

        return {
          ok: true,
          borradas: typeof datos['borradas'] === 'number' ? datos['borradas'] : 0,
        };
      } catch (error) {
        return { ok: false, fallo: traducir(error) };
      }
    },
  };
}

function aJugador(valor: unknown): JugadorDelQuiz[] {
  if (valor === null || typeof valor !== 'object') return [];

  const j = valor as Record<string, unknown>;
  const guestId = typeof j['guestId'] === 'string' ? j['guestId'] : '';
  if (guestId === '') return [];

  return [
    {
      guestId,
      nombre: typeof j['nombre'] === 'string' ? j['nombre'] : '',
      telefono: typeof j['telefono'] === 'string' ? j['telefono'] : null,
      partidas: typeof j['partidas'] === 'number' ? j['partidas'] : 1,
      puntos: typeof j['puntos'] === 'number' ? j['puntos'] : 0,
      puesto: typeof j['puesto'] === 'number' ? j['puesto'] : 0,
    },
  ];
}
