import { InjectionToken } from '@angular/core';

import type { DatosDePartida, PartidaDelPanel } from '../../features/panel/presupuesto/presupuesto';

/**
 * Puerto del presupuesto de la pareja (`budgetItems`).
 *
 * Colección de la pareja y de nadie más (lectura y escritura solo para
 * `isOwner`), así que se habla con Firestore directamente.
 */

export type FalloPresupuesto =
  | { readonly tipo: 'sin-permiso' }
  | { readonly tipo: 'red' }
  | { readonly tipo: 'error'; readonly mensaje: string };

export type ResultadoPartidas =
  | { readonly ok: true; readonly partidas: readonly PartidaDelPanel[] }
  | { readonly ok: false; readonly fallo: FalloPresupuesto };

export type ResultadoEscrituraPartida =
  { readonly ok: true } | { readonly ok: false; readonly fallo: FalloPresupuesto };

export interface PuertaPresupuesto {
  /** El `weddingId` lo pone quien llama, sacado del claim (regla 1). */
  listar(weddingId: string): Promise<ResultadoPartidas>;
  /** Sin `id` crea; con `id` edita (y no toca el orden). */
  guardar(
    weddingId: string,
    id: string | null,
    datos: DatosDePartida,
    orden: number,
  ): Promise<ResultadoEscrituraPartida>;
  /** Marcar o desmarcar como pagada. */
  marcarPagada(weddingId: string, id: string, pagada: boolean): Promise<ResultadoEscrituraPartida>;
  /** Enlaza o desenlaza (`null`) la partida con un proveedor, desde la ficha de éste. */
  enlazarProveedor(
    weddingId: string,
    id: string,
    vendorId: string | null,
  ): Promise<ResultadoEscrituraPartida>;
  borrar(weddingId: string, id: string): Promise<ResultadoEscrituraPartida>;
}

export const PUERTA_PRESUPUESTO = new InjectionToken<PuertaPresupuesto>('PUERTA_PRESUPUESTO');
