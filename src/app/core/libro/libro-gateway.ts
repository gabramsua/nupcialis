import { InjectionToken } from '@angular/core';

import type { FirmaPublica } from '../../features/public-site/libro/libro';

/**
 * El libro de firmas, del lado del invitado (§8.15).
 *
 * Todo por invocables: cada firma guarda el `guestId` de su autor y una regla
 * no puede esconder ese campo (ver `firestore.rules`). Cada operación devuelve
 * el libro entero, como la playlist.
 */

export type FalloLibro =
  /** Le falta escribir sus cuatro dígitos (D-34). */
  | { readonly tipo: 'sin-verificar' }
  | { readonly tipo: 'vacia' }
  | { readonly tipo: 'tope-invitado' }
  | { readonly tipo: 'tope-libro' }
  /** La firma ya no está (la pareja la quitó mientras miraba). */
  | { readonly tipo: 'no-existe' }
  | { readonly tipo: 'red' }
  | { readonly tipo: 'error' };

export type ResultadoLibro =
  | { readonly ok: true; readonly firmas: readonly FirmaPublica[] }
  | { readonly ok: false; readonly fallo: FalloLibro };

export interface PuertaLibro {
  listar(): Promise<ResultadoLibro>;
  firmar(mensaje: string): Promise<ResultadoLibro>;
  /** Quita una firma **suya**. */
  borrar(id: string): Promise<ResultadoLibro>;
}

export const PUERTA_LIBRO = new InjectionToken<PuertaLibro>('PUERTA_LIBRO');

export type { FirmaPublica };
