/**
 * El enlace de invitación, con Cloud Functions.
 *
 * El trabajo de este fichero es traducir, como el resto de los adaptadores: un
 * `functions/not-found` tiene que llegar a la pantalla como «ese invitado ya no
 * está», no como un código.
 */

import { inject } from '@angular/core';
import { httpsCallable } from 'firebase/functions';

import type { FalloEnlace, PuertaEnlaces, ResultadoEnlace } from '../invitados/enlaces-gateway';
import { FIREBASE_FUNCTIONS } from './functions.providers';

interface ErrorInvocable {
  readonly code?: string;
  readonly message?: string;
}

export function crearPuertaEnlacesFirebase(): PuertaEnlaces {
  const functions = inject(FIREBASE_FUNCTIONS);

  return {
    async obtener(guestId: string, rotar = false): Promise<ResultadoEnlace> {
      const getInviteLink = httpsCallable<
        { guestId: string; rotar: boolean },
        { token?: unknown; rotado?: unknown }
      >(functions, 'getInviteLink');

      try {
        const respuesta = await getInviteLink({ guestId, rotar });
        const token = typeof respuesta.data.token === 'string' ? respuesta.data.token : '';

        return token === ''
          ? { ok: false, fallo: { tipo: 'error', mensaje: 'sin token' } }
          : { ok: true, token, rotado: respuesta.data.rotado === true };
      } catch (error) {
        return { ok: false, fallo: traducir(error) };
      }
    },
  };
}

/** Exportada para poder probarla sin red, como las demás traducciones. */
export function traducir(error: unknown): FalloEnlace {
  const fallo = (error ?? {}) as ErrorInvocable;

  switch (fallo.code) {
    case 'functions/not-found':
      return { tipo: 'no-existe' };

    case 'functions/permission-denied':
    case 'functions/unauthenticated':
      return { tipo: 'sin-permiso' };

    case 'functions/unavailable':
    case 'functions/deadline-exceeded':
      return { tipo: 'red' };

    default:
      return { tipo: 'error', mensaje: fallo.message ?? 'Error desconocido' };
  }
}
