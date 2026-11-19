import { InjectionToken } from '@angular/core';

import type { ColorHito, IconoHito } from '../../features/public-site/cronologia/cronologia';

/**
 * Puerto de la cronología del día, del lado de la pareja (§8.13).
 *
 * El invitado **no** pasa por aquí: lee lo visible de la proyección pública.
 * Esta es la pantalla donde la pareja monta el día, y por tanto la única que
 * ve los hitos internos —la hora del montaje, cuándo llega el fotógrafo—.
 */

export interface HitoDelPanel {
  readonly id: string;
  /** Hora de reloj, `'17:00'`. */
  readonly time: string;
  readonly endTime: string | null;
  readonly title: string;
  readonly description: string;
  readonly icon: IconoHito;
  readonly color: ColorHito;
  readonly order: number;
  /** `false` es un hito **interno**: no se publica. */
  readonly visibleToGuests: boolean;
}

export interface DatosHito {
  readonly id?: string;
  readonly time: string;
  readonly endTime: string | null;
  readonly title: string;
  readonly description: string;
  readonly icon: IconoHito;
  readonly color: ColorHito;
  readonly order: number;
  readonly visibleToGuests: boolean;
}

export type FalloCronologia =
  | { readonly tipo: 'sin-permiso' }
  | { readonly tipo: 'red' }
  | { readonly tipo: 'error'; readonly mensaje: string };

export type ResultadoCronologia =
  | { readonly ok: true; readonly hitos: readonly HitoDelPanel[] }
  | { readonly ok: false; readonly fallo: FalloCronologia };

export type ResultadoEscrituraHito =
  { readonly ok: true } | { readonly ok: false; readonly fallo: FalloCronologia };

export interface PuertaCronologia {
  /** El `weddingId` lo pone quien llama, sacado del claim (regla 1). */
  listar(weddingId: string): Promise<ResultadoCronologia>;
  guardar(weddingId: string, datos: DatosHito): Promise<ResultadoEscrituraHito>;
  borrar(weddingId: string, id: string): Promise<ResultadoEscrituraHito>;
}

export const PUERTA_CRONOLOGIA = new InjectionToken<PuertaCronologia>('PUERTA_CRONOLOGIA');
