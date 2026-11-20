import { InjectionToken } from '@angular/core';

import type { MetodoRegalo, RegaloRecibido } from '../../features/panel/regalos/recibidos';

/**
 * Puerto del cuaderno de regalos recibidos (§8.8).
 *
 * **Es el dato más sensible del producto**: importes con nombre y apellidos al
 * lado. No hay función que lo sirva a un invitado, no sube a la proyección
 * pública y las reglas lo cierran a todo el que no sea la pareja.
 */

export interface DatosRecibido {
  readonly id?: string;
  readonly guestId: string | null;
  readonly fromLabel: string;
  readonly amount: number | null;
  readonly method: MetodoRegalo;
  readonly giftDescription: string;
  /** ISO, solo el día. */
  readonly receivedAt: string;
  readonly thanked: boolean;
  readonly thankedAt: string | null;
  readonly notes: string;
}

export type FalloRecibidos =
  | { readonly tipo: 'sin-permiso' }
  | { readonly tipo: 'red' }
  | { readonly tipo: 'error'; readonly mensaje: string };

export type ResultadoRecibidos =
  | { readonly ok: true; readonly recibidos: readonly RegaloRecibido[] }
  | { readonly ok: false; readonly fallo: FalloRecibidos };

export type ResultadoEscrituraRecibido =
  { readonly ok: true } | { readonly ok: false; readonly fallo: FalloRecibidos };

export interface PuertaRecibidos {
  /** El `weddingId` lo pone quien llama, sacado del claim (regla 1). */
  listar(weddingId: string): Promise<ResultadoRecibidos>;
  guardar(weddingId: string, datos: DatosRecibido): Promise<ResultadoEscrituraRecibido>;
  borrar(weddingId: string, id: string): Promise<ResultadoEscrituraRecibido>;
}

export const PUERTA_RECIBIDOS = new InjectionToken<PuertaRecibidos>('PUERTA_RECIBIDOS');

export type { MetodoRegalo, RegaloRecibido };
