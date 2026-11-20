/**
 * La playlist, por invocables.
 *
 * Frontera de confianza (D-19): lo que vuelve se sanea antes de salir de aquí,
 * con el mismo código que usa el servidor.
 */

import { inject } from '@angular/core';
import { httpsCallable } from 'firebase/functions';

import { sanearCancionesServidas } from '../../features/public-site/playlist/playlist';
import type {
  FalloPlaylist,
  PuertaPlaylist,
  ResultadoPlaylist,
  ResultadoProponer,
} from '../playlist/playlist-gateway';
import { FIREBASE_FUNCTIONS } from './functions.providers';

export function crearPuertaPlaylistFirebase(): PuertaPlaylist {
  const functions = inject(FIREBASE_FUNCTIONS);

  const llamar = async (nombre: string, datos: object): Promise<Record<string, unknown>> => {
    const { data } = await httpsCallable(functions, nombre)(datos);
    return (data ?? {}) as Record<string, unknown>;
  };

  return {
    async listar(): Promise<ResultadoPlaylist> {
      try {
        const r = await llamar('listPlaylist', {});
        return { ok: true, canciones: sanearCancionesServidas(r['canciones']) };
      } catch (error) {
        return { ok: false, fallo: traducirPlaylist(error) };
      }
    },

    async proponer(title: string, artist: string): Promise<ResultadoProponer> {
      try {
        const r = await llamar('suggestSong', { title, artist });
        return {
          ok: true,
          canciones: sanearCancionesServidas(r['canciones']),
          resultado: r['resultado'] === 'ya-estaba' ? 'ya-estaba' : 'creada',
        };
      } catch (error) {
        return { ok: false, fallo: traducirPlaylist(error) };
      }
    },

    async votar(songId: string): Promise<ResultadoPlaylist> {
      try {
        const r = await llamar('voteSong', { songId });
        return { ok: true, canciones: sanearCancionesServidas(r['canciones']) };
      } catch (error) {
        return { ok: false, fallo: traducirPlaylist(error) };
      }
    },
  };
}

const MOTIVOS = [
  'sin-verificar',
  'no-disponible',
  'incompleta',
  'tope-invitado',
  'tope-lista',
] as const;

export function traducirPlaylist(error: unknown): FalloPlaylist {
  const fallo = (error ?? {}) as { code?: string; details?: unknown };
  const motivo = ((fallo.details ?? {}) as { motivo?: unknown }).motivo;

  const conocido = MOTIVOS.find((m) => m === motivo);
  if (conocido) return { tipo: conocido };

  switch (fallo.code) {
    case 'unavailable':
    case 'deadline-exceeded':
    case 'functions/unavailable':
    case 'functions/deadline-exceeded':
      return { tipo: 'red' };

    case 'not-found':
    case 'functions/not-found':
      return { tipo: 'no-existe' };

    default:
      return { tipo: 'error' };
  }
}
