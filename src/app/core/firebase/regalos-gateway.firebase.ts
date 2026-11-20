/**
 * Los regalos, por invocables.
 *
 * Frontera de confianza (D-19): lo que vuelve se sanea antes de salir de aquí,
 * con el mismo código que usa el servidor para prepararlo.
 */

import { inject } from '@angular/core';
import { httpsCallable } from 'firebase/functions';

import {
  sanearAportacion,
  sanearRegalosServidos,
} from '../../features/public-site/regalos/regalos';
import {
  type FalloRegalos,
  type PuertaRegalos,
  type ResultadoRegalos,
} from '../regalos/regalos-gateway';
import { FIREBASE_FUNCTIONS } from './functions.providers';

export function crearPuertaRegalosFirebase(): PuertaRegalos {
  const functions = inject(FIREBASE_FUNCTIONS);

  const llamar = async (nombre: string, datos: object): Promise<ResultadoRegalos> => {
    try {
      const { data } = await httpsCallable(functions, nombre)(datos);
      const respuesta = (data ?? {}) as Record<string, unknown>;

      return {
        ok: true,
        aportacion: sanearAportacion(respuesta['aportacion']),
        regalos: sanearRegalosServidos(respuesta['regalos']),
      };
    } catch (error) {
      return { ok: false, fallo: traducirRegalos(error) };
    }
  };

  return {
    listar: () => llamar('getGifts', {}),
    reservar: (giftId: string) => llamar('reserveGift', { giftId }),
    soltar: (giftId: string) => llamar('releaseGift', { giftId }),
  };
}

export function traducirRegalos(error: unknown): FalloRegalos {
  const fallo = (error ?? {}) as { code?: string; details?: unknown };
  const motivo = (fallo.details ?? {}) as { motivo?: unknown };

  if (motivo.motivo === 'sin-verificar') return { tipo: 'sin-verificar' };
  if (motivo.motivo === 'ya-reservado') return { tipo: 'ya-reservado' };

  switch (fallo.code) {
    case 'unavailable':
    case 'deadline-exceeded':
    case 'functions/unavailable':
      return { tipo: 'red' };

    case 'permission-denied':
    case 'functions/permission-denied':
      return { tipo: 'no-es-tuyo' };

    case 'failed-precondition':
    case 'functions/failed-precondition':
      return { tipo: 'ya-reservado' };

    default:
      return { tipo: 'error' };
  }
}
