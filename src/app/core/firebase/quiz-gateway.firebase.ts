/**
 * El quiz con Cloud Functions.
 *
 * Traduce los códigos de la invocable a algo que se pueda enseñar: un
 * `failed-precondition` al empezar es «esta boda todavía no tiene preguntas»,
 * que no es un fallo del invitado y no debe leerse como uno.
 *
 * Frontera de confianza (D-19): lo que vuelve se comprueba antes de salir de
 * aquí, aunque venga de nuestra propia función.
 */

import { inject } from '@angular/core';
import { httpsCallable } from 'firebase/functions';

import {
  esDificultad,
  nombreEnRanking,
  PUNTOS,
  type FilaRanking,
  type PreguntaDeJuego,
} from '../../features/public-site/quiz/quiz';
import type {
  FalloQuiz,
  PartidaTerminada,
  PuertaQuiz,
  ResultadoEntrega,
  ResultadoPartida,
  ResultadoPista,
  ResultadoRanking,
} from '../quiz/quiz-gateway';
import { FIREBASE_FUNCTIONS } from './functions.providers';

interface ErrorInvocable {
  readonly code?: string;
  readonly message?: string;
  readonly details?: unknown;
}

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor : '';
}

function numero(valor: unknown): number {
  return typeof valor === 'number' && Number.isFinite(valor) ? valor : 0;
}

function aPregunta(valor: unknown): PreguntaDeJuego | null {
  if (valor === null || typeof valor !== 'object') return null;

  const p = valor as Record<string, unknown>;
  const id = texto(p['id']);
  const opciones = Array.isArray(p['opciones']) ? p['opciones'].map(texto) : [];

  if (id === '' || opciones.length === 0) return null;

  const difficulty = esDificultad(p['difficulty']) ? p['difficulty'] : 1;

  return {
    id,
    text: texto(p['text']),
    difficulty,
    puntos: PUNTOS[difficulty],
    tienePista: p['tienePista'] === true,
    opciones,
  };
}

function aPuesto(valor: unknown): FilaRanking | null {
  if (valor === null || typeof valor !== 'object') return null;

  const p = valor as Record<string, unknown>;
  const id = texto(p['id']);
  if (id === '') return null;

  return {
    id,
    // Frontera de confianza (D-19): el nombre se vuelve a pasar por el mismo
    // saneador del dominio que usa el servidor, así que por aquí no entra un
    // dígito aunque el servidor cambiara.
    displayName: nombreEnRanking(texto(p['displayName'])),
    points: numero(p['points']),
    puesto: numero(p['puesto']),
    esMio: p['esMio'] === true,
  };
}

function puestos(valor: unknown): readonly FilaRanking[] {
  const datos = (valor ?? {}) as Record<string, unknown>;
  const lista = Array.isArray(datos['puestos']) ? datos['puestos'] : [];
  return lista.map(aPuesto).filter((p): p is FilaRanking => p !== null);
}

export function crearPuertaQuizFirebase(): PuertaQuiz {
  const functions = inject(FIREBASE_FUNCTIONS);

  return {
    async empezar(): Promise<ResultadoPartida> {
      const startQuiz = httpsCallable<unknown, unknown>(functions, 'startQuiz');

      try {
        const respuesta = await startQuiz({});
        const datos = (respuesta.data ?? {}) as Record<string, unknown>;
        const brutas = Array.isArray(datos['preguntas']) ? datos['preguntas'] : [];
        const preguntas = brutas.map(aPregunta).filter((p): p is PreguntaDeJuego => p !== null);

        if (texto(datos['gameId']) === '' || preguntas.length === 0) {
          return { ok: false, fallo: { tipo: 'sin-preguntas' } };
        }

        return { ok: true, partida: { gameId: texto(datos['gameId']), preguntas } };
      } catch (error) {
        return { ok: false, fallo: traducirQuiz(error) };
      }
    },

    async entregar(
      gameId: string,
      respuestas: Readonly<Record<string, string>>,
    ): Promise<ResultadoEntrega> {
      const submitQuiz = httpsCallable<unknown, unknown>(functions, 'submitQuiz');

      try {
        const respuesta = await submitQuiz({ gameId, respuestas });
        const datos = (respuesta.data ?? {}) as Record<string, unknown>;

        const resultado: PartidaTerminada = {
          points: numero(datos['points']),
          total: numero(datos['total']),
          elapsedMs: numero(datos['elapsedMs']),
          puesto: typeof datos['puesto'] === 'number' ? datos['puesto'] : null,
          ranking: puestos({ puestos: datos['ranking'] }),
        };

        return { ok: true, resultado };
      } catch (error) {
        return { ok: false, fallo: traducirQuiz(error) };
      }
    },

    async pedirPista(gameId: string, preguntaId: string): Promise<ResultadoPista> {
      const getQuizHint = httpsCallable<unknown, unknown>(functions, 'getQuizHint');

      try {
        const respuesta = await getQuizHint({ gameId, questionId: preguntaId });
        const datos = (respuesta.data ?? {}) as Record<string, unknown>;
        const pista = texto(datos['hint']);
        return pista === '' ? { ok: false, fallo: { tipo: 'error' } } : { ok: true, pista };
      } catch (error) {
        return { ok: false, fallo: traducirQuiz(error) };
      }
    },

    async ranking(): Promise<ResultadoRanking> {
      const listQuizRanking = httpsCallable<unknown, unknown>(functions, 'listQuizRanking');

      try {
        const respuesta = await listQuizRanking({});
        const datos = (respuesta.data ?? {}) as Record<string, unknown>;
        return { ok: true, puestos: puestos(datos), visible: datos['visible'] !== false };
      } catch (error) {
        return { ok: false, fallo: traducirQuiz(error) };
      }
    },
  };
}

/** Exportada para poder probarla sin red. */
export function traducirQuiz(error: unknown): FalloQuiz {
  const fallo = (error ?? {}) as ErrorInvocable;
  const detalles = (fallo.details ?? {}) as Record<string, unknown>;

  if (detalles['motivo'] === 'sin-verificar') return { tipo: 'sin-verificar' };

  switch (fallo.code) {
    case 'functions/unauthenticated':
    case 'functions/permission-denied':
      return { tipo: 'sin-sesion' };

    case 'functions/deadline-exceeded':
      return { tipo: 'caducada' };

    case 'functions/failed-precondition':
      // La misma función manda este código para dos cosas distintas, y al
      // invitado no se le pueden enseñar igual: una es «la boda no tiene
      // preguntas» y la otra «esa partida ya la entregaste».
      return texto(fallo.message).toLowerCase().includes('entregada')
        ? { tipo: 'ya-entregada' }
        : { tipo: 'sin-preguntas' };

    case 'functions/unavailable':
    case 'functions/internal':
      return { tipo: 'red' };

    default:
      return { tipo: 'error' };
  }
}
