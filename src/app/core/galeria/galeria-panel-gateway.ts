import { InjectionToken } from '@angular/core';

import type { FalloGaleria, FotoPublica } from './galeria-gateway';

/**
 * La galería, del lado de la pareja (§8.5).
 *
 * Es la misma colección cerrada y las mismas invocables que ve el invitado
 * —`listPhotos` y `deletePhoto` distinguen solos quién pregunta—, con una más
 * que solo existe aquí: vaciarla entera. Se separa del puerto del invitado por
 * lo mismo que el quiz: la web pública no debe poder ni nombrar `clearGallery`.
 */

export type ResultadoFotosPanel =
  | {
      readonly ok: true;
      readonly fotos: readonly FotoPublica[];
      readonly cursor: string | null;
    }
  | { readonly ok: false; readonly fallo: FalloGaleria };

export type ResultadoVaciadoGaleria =
  | { readonly ok: true; readonly borradas: number }
  | { readonly ok: false; readonly fallo: FalloGaleria };

export type ResultadoBorradoPanel =
  { readonly ok: true } | { readonly ok: false; readonly fallo: FalloGaleria };

export interface PuertaGaleriaPanel {
  listar(cursor: string | null): Promise<ResultadoFotosPanel>;
  borrar(photoId: string): Promise<ResultadoBorradoPanel>;
  /** Vacía la galería entera. No tiene vuelta: la pantalla lo confirma antes. */
  vaciar(): Promise<ResultadoVaciadoGaleria>;
}

export const PUERTA_GALERIA_PANEL = new InjectionToken<PuertaGaleriaPanel>('PUERTA_GALERIA_PANEL');

export type { FotoPublica, FalloGaleria };
