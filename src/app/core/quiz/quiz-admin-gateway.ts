import { InjectionToken } from '@angular/core';

import type {
  Dificultad,
  EstadisticaDePregunta,
  PreguntaDelPanel,
} from '../../features/public-site/quiz/quiz';

/**
 * El quiz, del lado de la pareja (§8.7).
 *
 * Dos puertas y no una, porque los dos lados no se parecen:
 *
 * - **El banco de preguntas** se lee y se escribe por Firestore directamente.
 *   `quizQuestions` está abierta a la pareja y cerrada al invitado, que es lo
 *   que protege las respuestas correctas (regla de oro 4).
 * - **El ranking y quién ha jugado** pasan por función invocable, porque hay
 *   que cruzarlos con `guests`, que está cerrada a todos (regla de oro 2).
 */

export type DatosPregunta = Omit<PreguntaDelPanel, 'id'> & { readonly id?: string };

export type FalloQuizPanel =
  | { readonly tipo: 'sin-permiso' }
  | { readonly tipo: 'red' }
  | { readonly tipo: 'error'; readonly mensaje: string };

export type ResultadoPreguntas =
  | {
      readonly ok: true;
      readonly preguntas: readonly PreguntaDelPanel[];
      /** Por id de pregunta. Ausente en las que nadie ha contestado aún. */
      readonly estadisticas?: Readonly<Record<string, EstadisticaDePregunta>>;
    }
  | { readonly ok: false; readonly fallo: FalloQuizPanel };

export type ResultadoEscritura =
  { readonly ok: true } | { readonly ok: false; readonly fallo: FalloQuizPanel };

export interface PuertaPreguntasQuiz {
  listar(weddingId: string): Promise<ResultadoPreguntas>;
  guardar(weddingId: string, datos: DatosPregunta): Promise<ResultadoEscritura>;
  borrar(weddingId: string, id: string): Promise<ResultadoEscritura>;
}

export const PUERTA_PREGUNTAS_QUIZ = new InjectionToken<PuertaPreguntasQuiz>(
  'PUERTA_PREGUNTAS_QUIZ',
);

/**
 * Una fila de «quién ha jugado».
 *
 * Lleva el teléfono, y es el único sitio del producto donde sale junto al
 * nombre en una pantalla de ranking: esta la ve la pareja con su sesión
 * (`D-11`).
 */
export interface JugadorDelQuiz {
  readonly guestId: string;
  readonly nombre: string;
  readonly telefono: string | null;
  readonly partidas: number;
  readonly puntos: number;
  readonly puesto: number;
}

export type ResultadoJugadores =
  | { readonly ok: true; readonly jugadores: readonly JugadorDelQuiz[] }
  | { readonly ok: false; readonly fallo: FalloQuizPanel };

export type ResultadoVaciado =
  | { readonly ok: true; readonly borradas: number }
  | { readonly ok: false; readonly fallo: FalloQuizPanel };

export interface PuertaRankingQuiz {
  jugadores(): Promise<ResultadoJugadores>;
  vaciar(): Promise<ResultadoVaciado>;
}

export const PUERTA_RANKING_QUIZ = new InjectionToken<PuertaRankingQuiz>('PUERTA_RANKING_QUIZ');

/** Por puesto. Viene ordenado del servidor; esto lo deja asegurado. */
export function porPuesto(jugadores: readonly JugadorDelQuiz[]): readonly JugadorDelQuiz[] {
  return jugadores.slice().sort((a, b) => a.puesto - b.puesto);
}

/** Lo que la pareja mira de un vistazo: cuántos están y cuánto se juega. */
export function resumenDeJuego(jugadores: readonly JugadorDelQuiz[]): {
  readonly enElRanking: number;
  readonly partidas: number;
} {
  return {
    enElRanking: jugadores.length,
    partidas: jugadores.reduce((suma, j) => suma + j.partidas, 0),
  };
}

export type { Dificultad, EstadisticaDePregunta, PreguntaDelPanel };
