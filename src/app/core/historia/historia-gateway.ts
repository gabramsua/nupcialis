import { InjectionToken } from '@angular/core';

import type {
  ApartadoDeHistoria,
  ClaveHistoria,
  FotoDeHistoria,
} from '../../features/public-site/historia/historia';

/**
 * Puerto de «Nuestra historia» en el panel de la pareja.
 *
 * El contenido vive en el propio documento de la boda (`content.story`) y las
 * fotos en Storage (`weddings/{id}/story/`). Ambos son de la pareja: las reglas
 * dejan escribir al `owner`, y la web pública lee la proyección ya saneada.
 */

export type FalloHistoria =
  | { readonly tipo: 'sin-permiso' }
  | { readonly tipo: 'red' }
  | { readonly tipo: 'error'; readonly mensaje: string };

export type ResultadoHistoria<T> =
  { readonly ok: true; readonly valor: T } | { readonly ok: false; readonly fallo: FalloHistoria };

export interface PuertaHistoria {
  /** Los cinco apartados, siempre, vengan como vengan los datos. */
  leer(weddingId: string): Promise<ResultadoHistoria<readonly ApartadoDeHistoria[]>>;
  guardarTexto(
    weddingId: string,
    clave: ClaveHistoria,
    html: string,
  ): Promise<ResultadoHistoria<null>>;
  /** Sube la foto (reducida) y devuelve su ruta y su URL. No toca el documento. */
  subirFoto(weddingId: string, fichero: File): Promise<ResultadoHistoria<FotoDeHistoria>>;
  /** Deja las fotos de un apartado exactamente como se pasan. */
  guardarFotos(
    weddingId: string,
    clave: ClaveHistoria,
    fotos: readonly FotoDeHistoria[],
  ): Promise<ResultadoHistoria<null>>;
  /** Borra el fichero. Si falla no pasa nada: es basura, no un error. */
  borrarFichero(path: string): Promise<void>;
}

export const PUERTA_HISTORIA = new InjectionToken<PuertaHistoria>('PUERTA_HISTORIA');
