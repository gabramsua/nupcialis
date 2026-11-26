/**
 * El formulario de contacto de la HOME con Firebase: una sola llamada pública,
 * `createHomeRequest`, protegida por App Check y por un límite por IP en el
 * servidor. El SDK de Functions se pide **al enviar**, no al pintar la página.
 */

import { inject } from '@angular/core';
import { httpsCallable } from 'firebase/functions';

import type { FalloSolicitud, PuertaSolicitudes } from '../home/home-gateway';
import { FIREBASE_FUNCTIONS } from './functions.providers';

function objeto(valor: unknown): Record<string, unknown> {
  return valor !== null && typeof valor === 'object' ? (valor as Record<string, unknown>) : {};
}

export function traducirSolicitud(error: unknown): FalloSolicitud {
  const e = objeto(error);
  const code = typeof e['code'] === 'string' ? e['code'] : '';
  const motivo = objeto(e['details'])['motivo'];

  if (code.endsWith('resource-exhausted')) return { tipo: 'limite' };
  if (code.endsWith('invalid-argument')) {
    const campo =
      motivo === 'nombres' || motivo === 'correo' || motivo === 'telefono' ? motivo : 'otro';
    return { tipo: 'invalido', campo };
  }
  if (code.endsWith('unavailable') || code.endsWith('deadline-exceeded')) return { tipo: 'red' };
  return { tipo: 'error' };
}

export function crearPuertaSolicitudesFirebase(): PuertaSolicitudes {
  const functions = inject(FIREBASE_FUNCTIONS);

  return {
    async enviar(solicitud) {
      try {
        await httpsCallable(functions, 'createHomeRequest')({ solicitud });
        return { ok: true };
      } catch (error) {
        return { ok: false, fallo: traducirSolicitud(error) };
      }
    },
  };
}
