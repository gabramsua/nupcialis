import { InjectionToken } from '@angular/core';

import type { ContenidoHome, ImagenHome } from '../../features/home/home';

/**
 * Puertos de la HOME de `nupcialis.com`.
 *
 * Son dos porque son dos sitios con permisos distintos: la web pública solo
 * **lee** (el documento es público) y el superadmin lee, guarda, restaura y sube
 * imágenes. Mantenerlos separados evita que la portada del producto arrastre
 * el SDK de Storage y de Functions solo para pintar un titular.
 */

export interface PuertaHomePublica {
  /** El contenido guardado, o `null` si no hay ninguno (vale entonces lo de fábrica). */
  leer(): Promise<ContenidoHome | null>;
}

export type FalloHome =
  | { readonly tipo: 'sin-permiso' }
  | { readonly tipo: 'red' }
  | { readonly tipo: 'largo' }
  | { readonly tipo: 'error'; readonly mensaje: string };

export type ResultadoHome<T> =
  { readonly ok: true; readonly datos: T } | { readonly ok: false; readonly fallo: FalloHome };

export interface PuertaHomeAdmin {
  /** Lo guardado, o `null` si todavía no se ha guardado nada. */
  leer(): Promise<ResultadoHome<ContenidoHome | null>>;
  /** Guarda y publica. Devuelve el contenido tal y como quedó tras sanear. */
  guardar(contenido: ContenidoHome): Promise<ResultadoHome<ContenidoHome>>;
  /** Borra lo guardado: la HOME vuelve a lo de fábrica. */
  restaurar(): Promise<ResultadoHome<null>>;
  subirImagen(fichero: File): Promise<ResultadoHome<ImagenHome>>;
  /** Quita un fichero de Storage. Nunca falla hacia fuera: un huérfano es basura, no un error. */
  borrarImagen(ruta: string): Promise<void>;
}

export const PUERTA_HOME_PUBLICA = new InjectionToken<PuertaHomePublica>('PUERTA_HOME_PUBLICA');
export const PUERTA_HOME_ADMIN = new InjectionToken<PuertaHomeAdmin>('PUERTA_HOME_ADMIN');
