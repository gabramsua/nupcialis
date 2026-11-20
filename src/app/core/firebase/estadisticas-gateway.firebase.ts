/**
 * Las estadísticas del superadmin, con Cloud Functions.
 *
 * Lo que llega es `unknown` y pasa por `leerEstadisticas` antes de pintarse
 * (D-19): el despliegue de las funciones puede ir por delante o por detrás de
 * este código.
 */

import { inject } from '@angular/core';
import { httpsCallable } from 'firebase/functions';

import { leerEstadisticas } from '../../features/superadmin/estadisticas/estadisticas';
import type {
  FalloEstadisticas,
  PuertaEstadisticas,
  ResultadoLectura,
  ResultadoTope,
} from '../superadmin/estadisticas-gateway';
import { FIREBASE_FUNCTIONS } from './functions.providers';

interface ErrorInvocable {
  readonly code?: string;
  readonly message?: string;
  readonly details?: unknown;
}

export function crearPuertaEstadisticasFirebase(): PuertaEstadisticas {
  const functions = inject(FIREBASE_FUNCTIONS);

  return {
    async leer(): Promise<ResultadoLectura> {
      const getAdminStats = httpsCallable<unknown, unknown>(functions, 'getAdminStats');
      try {
        const respuesta = await getAdminStats({});
        const datos = leerEstadisticas(respuesta.data);
        if (datos === null) {
          return { ok: false, fallo: { tipo: 'error', mensaje: 'Respuesta ilegible.' } };
        }
        return { ok: true, datos };
      } catch (error) {
        return { ok: false, fallo: traducirEstadisticas(error) };
      }
    },

    async fijarTope(weddingId, maxPhotos): Promise<ResultadoTope> {
      const setWeddingLimits = httpsCallable<
        { weddingId: string; maxPhotos: number | null },
        unknown
      >(functions, 'setWeddingLimits');
      try {
        const respuesta = await setWeddingLimits({ weddingId, maxPhotos });
        const d = (respuesta.data ?? {}) as Record<string, unknown>;
        if (typeof d['maxPhotos'] !== 'number') {
          return { ok: false, fallo: { tipo: 'error', mensaje: 'Respuesta ilegible.' } };
        }
        return { ok: true, maxPhotos: d['maxPhotos'], topeEsPropio: d['topeEsPropio'] === true };
      } catch (error) {
        return { ok: false, fallo: traducirEstadisticas(error) };
      }
    },
  };
}

/** Exportada para probarla sin red, como las demás traducciones. */
export function traducirEstadisticas(error: unknown): FalloEstadisticas {
  const fallo = (error ?? {}) as ErrorInvocable;
  const detalles = (fallo.details ?? {}) as Record<string, unknown>;

  switch (fallo.code) {
    case 'functions/permission-denied':
      return { tipo: 'sin-permiso' };
    case 'functions/unauthenticated':
      return { tipo: 'sin-verificar' };
    case 'functions/unavailable':
    case 'functions/deadline-exceeded':
      return { tipo: 'red' };
    case 'functions/invalid-argument':
      return detalles['motivo'] === 'tope-invalido'
        ? { tipo: 'tope-invalido' }
        : { tipo: 'error', mensaje: fallo.message ?? 'Datos no válidos.' };
    default:
      return { tipo: 'error', mensaje: fallo.message ?? 'Error desconocido' };
  }
}
