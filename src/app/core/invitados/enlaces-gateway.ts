import { InjectionToken } from '@angular/core';

/**
 * Puerto del enlace de invitación (D-34).
 *
 * El token lo genera y lo guarda el servidor: son 24 bytes de azar en el
 * documento del invitado. No se deriva del `guestId` ni de nada adivinable,
 * porque un id viaja en cualquier captura de pantalla del panel y entonces
 * conocerlo daría el enlace de esa persona.
 *
 * Se crea la primera vez que la pareja comparte y se reutiliza después, para
 * que el enlace que ya mandó por WhatsApp siga valiendo. `rotar` lo cambia:
 * es la única forma de invalidar uno que se haya ido donde no debía.
 */

export type FalloEnlace =
  | { readonly tipo: 'sin-permiso' }
  | { readonly tipo: 'no-existe' }
  | { readonly tipo: 'red' }
  | { readonly tipo: 'error'; readonly mensaje: string };

export type ResultadoEnlace =
  | { readonly ok: true; readonly token: string; readonly rotado: boolean }
  | { readonly ok: false; readonly fallo: FalloEnlace };

export interface PuertaEnlaces {
  obtener(guestId: string, rotar?: boolean): Promise<ResultadoEnlace>;
}

export const PUERTA_ENLACES = new InjectionToken<PuertaEnlaces>('PUERTA_ENLACES');
