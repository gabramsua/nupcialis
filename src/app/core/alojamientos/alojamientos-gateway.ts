import { InjectionToken } from '@angular/core';

import type { TipoAlojamiento } from '../../features/public-site/alojamientos/alojamientos';

/**
 * Puerto de los alojamientos, del lado de la pareja (§8.10).
 *
 * El invitado lee los publicables de la proyección; esta es la pantalla donde
 * la pareja los apunta, con las fichas a medio rellenar y las apagadas.
 */

export interface AlojamientoDelPanel {
  readonly id: string;
  readonly name: string;
  readonly category: TipoAlojamiento;
  readonly description: string;
  readonly pricePerNight: number | null;
  readonly distanceKm: number | null;
  readonly phone: string | null;
  readonly website: string | null;
  readonly discountCode: string;
  readonly blockedRooms: number | null;
  /** Solo el día, en ISO: `'2027-05-01'`. */
  readonly bookingDeadline: string | null;
  readonly recommended: boolean;
  /** Id de la ubicación del mapa donde está, o `null` (F2.4b). */
  readonly locationId: string | null;
  readonly order: number;
  readonly enabled: boolean;
}

export type DatosAlojamiento = Omit<AlojamientoDelPanel, 'id'> & { readonly id?: string };

export type FalloAlojamientos =
  | { readonly tipo: 'sin-permiso' }
  | { readonly tipo: 'red' }
  | { readonly tipo: 'error'; readonly mensaje: string };

export type ResultadoAlojamientos =
  | { readonly ok: true; readonly alojamientos: readonly AlojamientoDelPanel[] }
  | { readonly ok: false; readonly fallo: FalloAlojamientos };

export type ResultadoEscrituraAlojamiento =
  { readonly ok: true } | { readonly ok: false; readonly fallo: FalloAlojamientos };

export interface PuertaAlojamientos {
  /** El `weddingId` lo pone quien llama, sacado del claim (regla 1). */
  listar(weddingId: string): Promise<ResultadoAlojamientos>;
  guardar(weddingId: string, datos: DatosAlojamiento): Promise<ResultadoEscrituraAlojamiento>;
  borrar(weddingId: string, id: string): Promise<ResultadoEscrituraAlojamiento>;
}

export const PUERTA_ALOJAMIENTOS = new InjectionToken<PuertaAlojamientos>('PUERTA_ALOJAMIENTOS');

/** Recomendados primero, y dentro el orden de la pareja. Como en la web. */
export function ordenarAlojamientos(
  alojamientos: readonly AlojamientoDelPanel[],
): readonly AlojamientoDelPanel[] {
  return alojamientos.slice().sort((a, b) => {
    if (a.recommended !== b.recommended) return a.recommended ? -1 : 1;
    return a.order - b.order || a.id.localeCompare(b.id);
  });
}
