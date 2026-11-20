import { InjectionToken } from '@angular/core';

import type { TipoUbicacion } from '../../features/public-site/mapa/ubicaciones';

/**
 * Puerto de las ubicaciones, del lado de la pareja (§8.6).
 *
 * El invitado lee las publicables de la proyección; esta es la pantalla donde
 * la pareja las apunta, con las que aún no tienen el pin colocado y las que
 * son solo suyas.
 */

export interface UbicacionDelPanel {
  readonly id: string;
  readonly type: TipoUbicacion;
  readonly name: string;
  readonly address: string;
  /** `null` mientras no se ha colocado el pin: sin él no sale en el mapa. */
  readonly lat: number | null;
  readonly lng: number | null;
  readonly description: string;
  /** «17:30», o `null`. */
  readonly time: string | null;
  readonly order: number;
  readonly visibleToGuests: boolean;
}

export type DatosUbicacion = Omit<UbicacionDelPanel, 'id'> & { readonly id?: string };

export type FalloUbicaciones =
  | { readonly tipo: 'sin-permiso' }
  | { readonly tipo: 'red' }
  | { readonly tipo: 'error'; readonly mensaje: string };

export type ResultadoUbicaciones =
  | { readonly ok: true; readonly ubicaciones: readonly UbicacionDelPanel[] }
  | { readonly ok: false; readonly fallo: FalloUbicaciones };

export type ResultadoEscrituraUbicacion =
  { readonly ok: true } | { readonly ok: false; readonly fallo: FalloUbicaciones };

export interface PuertaUbicaciones {
  /** El `weddingId` lo pone quien llama, sacado del claim (regla 1). */
  listar(weddingId: string): Promise<ResultadoUbicaciones>;
  guardar(weddingId: string, datos: DatosUbicacion): Promise<ResultadoEscrituraUbicacion>;
  borrar(weddingId: string, id: string): Promise<ResultadoEscrituraUbicacion>;
}

export const PUERTA_UBICACIONES = new InjectionToken<PuertaUbicaciones>('PUERTA_UBICACIONES');

/** El orden de la pareja; a igualdad, por hora, que es como se cuenta el día. */
export function ordenarUbicaciones(
  ubicaciones: readonly UbicacionDelPanel[],
): readonly UbicacionDelPanel[] {
  return ubicaciones
    .slice()
    .sort(
      (a, b) =>
        a.order - b.order ||
        (a.time ?? '99:99').localeCompare(b.time ?? '99:99') ||
        a.id.localeCompare(b.id),
    );
}
