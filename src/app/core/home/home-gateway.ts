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

/**
 * El formulario de contacto de la HOME. Es un puerto aparte y **opcional** en
 * la página: la portada se pinta igual sin él (en la vista previa del editor,
 * por ejemplo) y no arrastra el SDK de Functions hasta que alguien envía.
 */
export interface SolicitudHome {
  readonly names: string;
  readonly email: string;
  readonly phone: string;
  readonly weddingDate: string;
  readonly plan: 'basic' | 'extended' | 'undecided';
  readonly message: string;
  readonly consent: true;
}

export type FalloSolicitud =
  | { readonly tipo: 'invalido'; readonly campo: 'nombres' | 'correo' | 'telefono' | 'otro' }
  | { readonly tipo: 'limite' }
  | { readonly tipo: 'red' }
  | { readonly tipo: 'error' };

export interface PuertaSolicitudes {
  enviar(
    solicitud: SolicitudHome,
  ): Promise<{ readonly ok: true } | { readonly ok: false; readonly fallo: FalloSolicitud }>;
}

export const PUERTA_SOLICITUDES = new InjectionToken<PuertaSolicitudes>('PUERTA_SOLICITUDES');
