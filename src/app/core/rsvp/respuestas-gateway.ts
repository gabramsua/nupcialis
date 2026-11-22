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

/**
 * Lo que la pareja fija por un invitado (D-45).
 *
 * `estado` solo: «viene», «no viene» o «vuelve a pendiente», que es lo del
 * teléfono. `respuestas` además: el menú, las alergias y lo demás del
 * formulario, sin exigir las obligatorias.
 */
export interface RespuestaDeLaPareja {
  readonly estado?: 'pending' | 'confirmed' | 'declined';
  readonly respuestas?: Respuestas;
}

/** Un fallo por pregunta, para señalarlo en su campo. */
export interface FalloDePregunta {
  readonly questionId: string;
  readonly motivo: string;
}

export type FalloAlGuardar =
  | FalloRespuestas
  | { readonly tipo: 'no-valen'; readonly fallos: readonly FalloDePregunta[] }
  | { readonly tipo: 'no-existe' };

export type ResultadoGuardarRespuesta =
  | { readonly ok: true; readonly estado: 'pending' | 'confirmed' | 'declined' }
  | { readonly ok: false; readonly fallo: FalloAlGuardar };

/** Lo que pasó al marcar a varios de una vez: cuántos se cambiaron y cuántos no existían. */
export type ResultadoRespuestaEnLote =
  | { readonly ok: true; readonly cambiados: number; readonly omitidos: number }
  | { readonly ok: false; readonly fallo: FalloRespuestas };

export interface PuertaRespuestas {
  leer(): Promise<ResultadoRespuestas>;
  /** Fija la respuesta de un invitado en su nombre. Solo la pareja. */
  guardar(guestId: string, respuesta: RespuestaDeLaPareja): Promise<ResultadoGuardarRespuesta>;
  /**
   * Fija **solo el estado** de varios invitados a la vez (F1.8i/j). Las respuestas
   * del formulario de cada uno no se tocan.
   */
  guardarEnLote(
    guestIds: readonly string[],
    estado: 'pending' | 'confirmed' | 'declined',
  ): Promise<ResultadoRespuestaEnLote>;
}

export const PUERTA_RESPUESTAS = new InjectionToken<PuertaRespuestas>('PUERTA_RESPUESTAS');
