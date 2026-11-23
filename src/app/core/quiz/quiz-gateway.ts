import { InjectionToken } from '@angular/core';

import type { FilaRanking, PreguntaDeJuego } from '../../features/public-site/quiz/quiz';

/**
 * Puerto del quiz, del lado del invitado.
 *
 * Al otro lado hay tres invocables y **no hay atajo posible**: las preguntas
 * están cerradas a lectura directa porque llevan dentro la respuesta correcta
 * (regla de oro 4), así que todo lo que el navegador sabe del juego se lo da el
 * servidor pregunta a pregunta.
 */

export interface PartidaNueva {
  readonly gameId: string;
  readonly preguntas: readonly PreguntaDeJuego[];
}

export interface PartidaTerminada {
  readonly points: number;
  readonly total: number;
  readonly elapsedMs: number;
  readonly puesto: number | null;
  readonly ranking: readonly FilaRanking[];
}

export type FalloQuiz =
  /** La boda todavía no tiene preguntas. No es un error del invitado. */
  | { readonly tipo: 'sin-preguntas' }
  /** Abrió el juego y lo dejó a medias demasiado tiempo. */
  | { readonly tipo: 'caducada' }
  | { readonly tipo: 'ya-entregada' }
  /** Le falta escribir sus cuatro dígitos (D-34). */
  | { readonly tipo: 'sin-verificar' }
  /** No hay sesión de invitado: abrió el juego sin pasar por el enlace de la pareja. */
  | { readonly tipo: 'sin-sesion' }
  | { readonly tipo: 'red' }
  | { readonly tipo: 'error' };

export type ResultadoPartida =
  | { readonly ok: true; readonly partida: PartidaNueva }
  | { readonly ok: false; readonly fallo: FalloQuiz };

export type ResultadoEntrega =
  | { readonly ok: true; readonly resultado: PartidaTerminada }
  | { readonly ok: false; readonly fallo: FalloQuiz };

export type ResultadoPista =
  { readonly ok: true; readonly pista: string } | { readonly ok: false; readonly fallo: FalloQuiz };

export type ResultadoRanking =
  | { readonly ok: true; readonly puestos: readonly FilaRanking[]; readonly visible: boolean }
  | { readonly ok: false; readonly fallo: FalloQuiz };

export interface PuertaQuiz {
  empezar(): Promise<ResultadoPartida>;
  /** `respuestas` es `{ idDePregunta: textoElegido }`. */
  entregar(gameId: string, respuestas: Readonly<Record<string, string>>): Promise<ResultadoEntrega>;
  ranking(): Promise<ResultadoRanking>;
  /**
   * El texto de la pista de una pregunta. **Cuesta la mitad de los puntos de esa
   * pregunta**, y el servidor lo apunta al pedirla: llamar a esto es aceptar el
   * precio, así que la pantalla avisa antes.
   */
  pedirPista(gameId: string, preguntaId: string): Promise<ResultadoPista>;
}

export const PUERTA_QUIZ = new InjectionToken<PuertaQuiz>('PUERTA_QUIZ');
