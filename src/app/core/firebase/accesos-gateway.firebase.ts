/**
 * El registro de accesos, con Cloud Functions.
 *
 * Traduce, como el resto de los adaptadores: lo que llega es `unknown` —lo
 * escribe un despliegue que puede ir por delante o por detrás de este código— y
 * una entrada sin fecha no se pinta.
 */

import { inject } from '@angular/core';
import { httpsCallable } from 'firebase/functions';

import type {
  EntradaDeAcceso,
  FalloAccesos,
  PuertaAccesos,
  ResultadoAccesos,
} from '../invitados/accesos-gateway';
import { FIREBASE_FUNCTIONS } from './functions.providers';

interface ErrorInvocable {
  readonly code?: string;
  readonly message?: string;
}

export function crearPuertaAccesosFirebase(): PuertaAccesos {
  const functions = inject(FIREBASE_FUNCTIONS);

  return {
    async leer(): Promise<ResultadoAccesos> {
      const listAccessLog = httpsCallable<unknown, unknown>(functions, 'listAccessLog');

      try {
        const respuesta = await listAccessLog({});
        const d = (respuesta.data ?? {}) as Record<string, unknown>;

        return {
          ok: true,
          datos: {
            entradas: Array.isArray(d['entradas']) ? d['entradas'].flatMap(aEntrada) : [],
            tope: typeof d['tope'] === 'number' ? d['tope'] : 0,
          },
        };
      } catch (error) {
        return { ok: false, fallo: traducir(error) };
      }
    },
  };
}

function aEntrada(cruda: unknown): readonly EntradaDeAcceso[] {
  if (cruda === null || typeof cruda !== 'object') return [];
  const e = cruda as Record<string, unknown>;

  const id = typeof e['id'] === 'string' ? e['id'] : '';
  const cuando = typeof e['cuando'] === 'string' ? e['cuando'] : '';
  // Sin fecha no hay dónde colocarla en la lista, que va por días.
  if (id === '' || cuando === '') return [];

  return [
    {
      id,
      guestId: typeof e['guestId'] === 'string' ? e['guestId'] : '',
      nombre: typeof e['nombre'] === 'string' ? e['nombre'] : '',
      mote: typeof e['mote'] === 'string' ? e['mote'] : '',
      modo: typeof e['modo'] === 'string' ? e['modo'] : '',
      dispositivo: typeof e['dispositivo'] === 'string' ? e['dispositivo'] : '',
      cuando,
    },
  ];
}

/** Exportada para probarla sin red, como las demás traducciones. */
export function traducir(error: unknown): FalloAccesos {
  const fallo = (error ?? {}) as ErrorInvocable;

  switch (fallo.code) {
    case 'functions/permission-denied':
      return { tipo: 'sin-permiso' };

    case 'functions/unauthenticated':
      return { tipo: 'sin-verificar' };

    case 'functions/unavailable':
    case 'functions/deadline-exceeded':
      return { tipo: 'red' };

    default:
      return { tipo: 'error', mensaje: fallo.message ?? 'Error desconocido' };
  }
}
