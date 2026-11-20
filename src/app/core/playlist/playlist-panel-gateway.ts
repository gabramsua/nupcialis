import { InjectionToken } from '@angular/core';

import {
  porVotos,
  type EstadoCancion,
  type OrigenCancion,
} from '../../features/public-site/playlist/playlist';

/**
 * La playlist, del lado de la pareja (§8.14).
 *
 * La pareja lee y escribe la colección directamente (las reglas se lo dejan):
 * es quien decide qué suena. Los `guestId` de los votos **no llegan a la
 * pantalla**: aquí solo se cuenta cuántos hay.
 */

export interface CancionDelPanel {
  readonly id: string;
  readonly title: string;
  readonly artist: string;
  readonly votos: number;
  readonly status: EstadoCancion;
  readonly source: OrigenCancion;
}

export type FalloPlaylistPanel =
  | { readonly tipo: 'sin-permiso' }
  | { readonly tipo: 'red' }
  | { readonly tipo: 'error'; readonly mensaje: string };

export type ResultadoPlaylistPanel =
  | { readonly ok: true; readonly canciones: readonly CancionDelPanel[] }
  | { readonly ok: false; readonly fallo: FalloPlaylistPanel };

export type ResultadoEscrituraPlaylist =
  { readonly ok: true } | { readonly ok: false; readonly fallo: FalloPlaylistPanel };

export interface PuertaPlaylistPanel {
  /** El `weddingId` lo pone quien llama, sacado del claim (regla 1). */
  listar(weddingId: string): Promise<ResultadoPlaylistPanel>;
  cambiarEstado(
    weddingId: string,
    id: string,
    estado: EstadoCancion,
  ): Promise<ResultadoEscrituraPlaylist>;
  /** Una canción puesta por la pareja: sin votos y ya decidida. */
  anadir(
    weddingId: string,
    title: string,
    artist: string,
    estado: EstadoCancion,
  ): Promise<ResultadoEscrituraPlaylist>;
  borrar(weddingId: string, id: string): Promise<ResultadoEscrituraPlaylist>;
}

export const PUERTA_PLAYLIST_PANEL = new InjectionToken<PuertaPlaylistPanel>(
  'PUERTA_PLAYLIST_PANEL',
);

/** Más votos primero; a igualdad, por título. */
export function ordenarCancionesDelPanel(
  canciones: readonly CancionDelPanel[],
): readonly CancionDelPanel[] {
  return canciones.slice().sort(porVotos);
}
