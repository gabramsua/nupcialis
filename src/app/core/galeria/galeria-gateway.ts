import { InjectionToken } from '@angular/core';

import type { AlbumFoto, FotoPublica } from '../../features/public-site/galeria/galeria';

/**
 * La galería, del lado del invitado (§8.5).
 *
 * Todo pasa por invocables: `photos` está cerrada a lectura directa y los
 * ficheros de Storage tampoco se leen a pelo. Lo que el navegador sabe de la
 * galería se lo da el servidor, foto a foto y con su URL.
 */

export type FalloGaleria =
  /** Le falta escribir sus cuatro dígitos (D-34). */
  | { readonly tipo: 'sin-verificar' }
  | { readonly tipo: 'no-es-tuya' }
  | { readonly tipo: 'formato' }
  | { readonly tipo: 'pesa-demasiado' }
  /** Se ha llegado al tope de fotos de la boda (D-39). */
  | { readonly tipo: 'llena' }
  | { readonly tipo: 'red' }
  | { readonly tipo: 'error' };

export type ResultadoFotos =
  | {
      readonly ok: true;
      readonly fotos: readonly FotoPublica[];
      /** Por dónde seguir, o `null` si no hay más. */
      readonly cursor: string | null;
      /** Quién pregunta, para saber cuáles son «mis fotos». `null` si no se sabe. */
      readonly miGuestId?: string | null;
    }
  | { readonly ok: false; readonly fallo: FalloGaleria };

export type ResultadoSubida =
  { readonly ok: true; readonly id: string } | { readonly ok: false; readonly fallo: FalloGaleria };

export type ResultadoBorrado =
  { readonly ok: true } | { readonly ok: false; readonly fallo: FalloGaleria };

export interface PuertaGaleria {
  /** Las fotos de un álbum. Cada álbum tiene su propio cursor. */
  listar(cursor: string | null, album: AlbumFoto): Promise<ResultadoFotos>;
  /** La foto se reduce **en el navegador** antes de salir de aquí. */
  subir(archivo: File, pie: string, album: AlbumFoto): Promise<ResultadoSubida>;
  borrar(photoId: string): Promise<ResultadoBorrado>;
}

export const PUERTA_GALERIA = new InjectionToken<PuertaGaleria>('PUERTA_GALERIA');

export type { AlbumFoto, FotoPublica };
