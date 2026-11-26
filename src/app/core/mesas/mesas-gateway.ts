import { InjectionToken } from '@angular/core';

import type { FormaMesa, Mesa } from '../../features/panel/mesas/mesas';

/**
 * Las mesas del banquete, del lado de la pareja (§8.4).
 *
 * Dos puertas, porque las dos mitades viven en sitios distintos:
 *
 * - **Las mesas** son una colección abierta a la pareja: se leen y se escriben
 *   por Firestore directamente.
 * - **Sentar a alguien** cambia la ficha del invitado, y `guests` está cerrada
 *   al cliente (regla de oro 2), así que pasa por `assignGuestsToTable`.
 */

export type DatosMesa = Omit<Mesa, 'id'> & { readonly id?: string };

export type FalloMesas =
  | { readonly tipo: 'sin-permiso' }
  | { readonly tipo: 'red' }
  | { readonly tipo: 'error'; readonly mensaje: string };

export type ResultadoMesas =
  | { readonly ok: true; readonly mesas: readonly Mesa[] }
  | { readonly ok: false; readonly fallo: FalloMesas };

export type ResultadoEscrituraMesa =
  { readonly ok: true } | { readonly ok: false; readonly fallo: FalloMesas };

export interface PuertaMesas {
  listar(weddingId: string): Promise<ResultadoMesas>;
  guardar(weddingId: string, datos: DatosMesa): Promise<ResultadoEscrituraMesa>;
  borrar(weddingId: string, id: string): Promise<ResultadoEscrituraMesa>;
}

export const PUERTA_MESAS = new InjectionToken<PuertaMesas>('PUERTA_MESAS');

export type ResultadoSentar =
  | { readonly ok: true; readonly sentados: number }
  | { readonly ok: false; readonly fallo: FalloMesas };

export interface PuertaSentar {
  /** `tableId` a `null` levanta de la mesa. */
  sentar(guestIds: readonly string[], tableId: string | null): Promise<ResultadoSentar>;
}

export const PUERTA_SENTAR = new InjectionToken<PuertaSentar>('PUERTA_SENTAR');

export type { FormaMesa, Mesa };
