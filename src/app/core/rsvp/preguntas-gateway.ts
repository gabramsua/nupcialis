import { InjectionToken } from '@angular/core';

import type { OpcionPregunta, Pregunta, TipoPregunta } from './rsvp-gateway';

export type { OpcionPregunta, Pregunta, TipoPregunta };

/**
 * Puerto de las preguntas del formulario, del lado de la pareja.
 *
 * El del invitado es otro (`rsvp-gateway.ts`): él recibe las preguntas que le
 * tocan, ya filtradas y ordenadas por una función. La pareja, en cambio, las
 * **escribe**, y eso pasa por Firestore directamente: las reglas lo permiten y
 * no hay ninguna invariante que necesite mirar los invitados, al contrario que
 * en los grupos (D-31). Lo único que las reglas no dejan es borrar una pregunta
 * de sistema.
 */

/** Una pregunta como la ve y la edita la pareja. */
export interface PreguntaDelPanel extends Pregunta {
  readonly target: 'guest' | 'companion' | 'both';
  readonly mapsTo: string | null;
  readonly enabled: boolean;
  /** Las de fábrica de las que depende el resto del producto. No se borran. */
  readonly isSystem: boolean;
}

/** Lo que la pareja puede cambiar. `mapsTo` e `isSystem` no están, a propósito. */
export interface DatosPregunta {
  readonly id?: string;
  readonly label: string;
  readonly helpText: string;
  readonly type: TipoPregunta;
  readonly options: readonly OpcionPregunta[];
  readonly required: boolean;
  readonly target: 'guest' | 'companion' | 'both';
  readonly soloSiViene: boolean;
  readonly enabled: boolean;
  readonly order: number;
}

export type FalloPreguntas =
  | { readonly tipo: 'sin-permiso' }
  | { readonly tipo: 'de-sistema' }
  | { readonly tipo: 'red' }
  | { readonly tipo: 'error'; readonly mensaje: string };

export type ResultadoPreguntas =
  | { readonly ok: true; readonly preguntas: readonly PreguntaDelPanel[] }
  | { readonly ok: false; readonly fallo: FalloPreguntas };

export type ResultadoEscritura =
  { readonly ok: true } | { readonly ok: false; readonly fallo: FalloPreguntas };

export interface PuertaPreguntas {
  listar(weddingId: string): Promise<ResultadoPreguntas>;
  guardar(weddingId: string, datos: DatosPregunta): Promise<ResultadoEscritura>;
  borrar(weddingId: string, id: string): Promise<ResultadoEscritura>;
  reordenar(weddingId: string, ids: readonly string[]): Promise<ResultadoEscritura>;
}

export const PUERTA_PREGUNTAS = new InjectionToken<PuertaPreguntas>('PUERTA_PREGUNTAS');

/**
 * La pregunta de la que cuelgan las condicionales.
 *
 * El editor no ofrece construir condiciones cualesquiera: ofrece una casilla,
 * «solo a quien confirme que viene». Es la única condición que se usa en una
 * boda de verdad —el menú, las alergias, el autobús— y un constructor de
 * condiciones genérico en el panel es una pantalla entera para un caso que no
 * se da. El modelo aguanta cualquier `visibleIf`; el editor solo escribe este.
 */
export const PREGUNTA_DE_ASISTENCIA = 'asistencia';

export function soloSiViene(pregunta: Pregunta): boolean {
  return (
    pregunta.visibleIf?.questionId === PREGUNTA_DE_ASISTENCIA && pregunta.visibleIf.equals === true
  );
}
