import { InjectionToken } from '@angular/core';

import type { Pregunta, Respuestas } from './rsvp-gateway';

/**
 * Puerto de las respuestas del formulario, del lado de la pareja.
 *
 * Esto no sale de `listGuests`, que recorta `rsvpAnswers` a propósito: con
 * trescientos invitados y ocho preguntas, mandarlo para pintar la lista
 * multiplica por cinco lo que viaja. Aquí se pide aparte, y solo desde la
 * pantalla que lo lee.
 */

export interface RespuestasDeInvitado {
  readonly guestId: string;
  readonly nombre: string;
  readonly mote: string;
  readonly estado: 'pending' | 'confirmed' | 'declined';
  /** Cuándo contestó, en ISO, o `null` si no ha contestado. */
  readonly cuando: string | null;
  readonly respuestas: Respuestas;
}

export interface RespuestasDeLaBoda {
  /** Todas, también las apagadas: las respuestas que ya hay siguen ahí. */
  readonly preguntas: readonly Pregunta[];
  readonly invitados: readonly RespuestasDeInvitado[];
}

export type FalloRespuestas =
  | { readonly tipo: 'sin-permiso' }
  | { readonly tipo: 'sin-verificar' }
  | { readonly tipo: 'red' }
  | { readonly tipo: 'error'; readonly mensaje: string };

export type ResultadoRespuestas =
  | { readonly ok: true; readonly datos: RespuestasDeLaBoda }
  | { readonly ok: false; readonly fallo: FalloRespuestas };

export interface PuertaRespuestas {
  leer(): Promise<ResultadoRespuestas>;
}

export const PUERTA_RESPUESTAS = new InjectionToken<PuertaRespuestas>('PUERTA_RESPUESTAS');
