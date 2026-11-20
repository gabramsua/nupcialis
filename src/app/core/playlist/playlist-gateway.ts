import { InjectionToken } from '@angular/core';

import type { CancionPublica } from '../../features/public-site/playlist/playlist';

/**
 * La playlist, del lado del invitado (§8.14).
 *
 * Todo por invocables: la colección guarda quién ha votado qué y una regla no
 * puede esconder ese campo (ver `firestore.rules`). Cada operación devuelve la
 * lista entera, como los regalos: quien vota ve de paso lo que han votado los
 * demás mientras tanto.
 */

export type FalloPlaylist =
  /** Le falta escribir sus cuatro dígitos (D-34). */
  | { readonly tipo: 'sin-verificar' }
  /** Vetada o descartada: el invitado no sabe cuál de las dos. */
  | { readonly tipo: 'no-disponible' }
  | { readonly tipo: 'incompleta' }
  | { readonly tipo: 'tope-invitado' }
  | { readonly tipo: 'tope-lista' }
  /** La canción ya no está (la pareja la quitó mientras miraba). */
  | { readonly tipo: 'no-existe' }
  | { readonly tipo: 'red' }
  | { readonly tipo: 'error' };

export type ResultadoPlaylist =
  | { readonly ok: true; readonly canciones: readonly CancionPublica[] }
  | { readonly ok: false; readonly fallo: FalloPlaylist };

export type ResultadoProponer =
  | {
      readonly ok: true;
      readonly canciones: readonly CancionPublica[];
      /** `ya-estaba`: no se duplicó, se sumó su voto a la que existía. */
      readonly resultado: 'creada' | 'ya-estaba';
    }
  | { readonly ok: false; readonly fallo: FalloPlaylist };

export interface PuertaPlaylist {
  listar(): Promise<ResultadoPlaylist>;
  proponer(title: string, artist: string): Promise<ResultadoProponer>;
  /** Pone o quita el voto. */
  votar(songId: string): Promise<ResultadoPlaylist>;
}

export const PUERTA_PLAYLIST = new InjectionToken<PuertaPlaylist>('PUERTA_PLAYLIST');

export type { CancionPublica };
