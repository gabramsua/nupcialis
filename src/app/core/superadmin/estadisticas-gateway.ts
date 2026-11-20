import { InjectionToken } from '@angular/core';

import type { Estadisticas } from '../../features/superadmin/estadisticas/estadisticas';

/**
 * Puerto de las estadísticas del superadmin.
 *
 * Del otro lado hay dos Cloud Functions (`getAdminStats`, `setWeddingLimits`).
 * De este, una interfaz que se dobla en un test sin red.
 */

export type FalloEstadisticas =
  | { readonly tipo: 'sin-permiso' }
  | { readonly tipo: 'sin-verificar' }
  | { readonly tipo: 'red' }
  | { readonly tipo: 'tope-invalido' }
  | { readonly tipo: 'error'; readonly mensaje: string };

export type ResultadoLectura =
  | { readonly ok: true; readonly datos: Estadisticas }
  | { readonly ok: false; readonly fallo: FalloEstadisticas };

export type ResultadoTope =
  | { readonly ok: true; readonly maxPhotos: number; readonly topeEsPropio: boolean }
  | { readonly ok: false; readonly fallo: FalloEstadisticas };

export interface PuertaEstadisticas {
  leer(): Promise<ResultadoLectura>;
  /** Un entero para fijar el tope de esa boda, o `null` para volver al de por defecto. */
  fijarTope(weddingId: string, maxPhotos: number | null): Promise<ResultadoTope>;
}

export const PUERTA_ESTADISTICAS = new InjectionToken<PuertaEstadisticas>('PUERTA_ESTADISTICAS');
