/**
 * El libro de firmas, por invocables.
 *
 * Frontera de confianza (D-19): lo que vuelve se sanea antes de salir de aquí.
 */

import { inject } from '@angular/core';
import { httpsCallable } from 'firebase/functions';

import { sanearFirmasServidas } from '../../features/public-site/libro/libro';
import type { FalloLibro, PuertaLibro, ResultadoLibro } from '../libro/libro-gateway';
import { FIREBASE_FUNCTIONS } from './functions.providers';

export function crearPuertaLibroFirebase(): PuertaLibro {
  const functions = inject(FIREBASE_FUNCTIONS);

  const operar = async (nombre: string, datos: object): Promise<ResultadoLibro> => {
    try {
      const { data } = await httpsCallable(functions, nombre)(datos);
      const r = (data ?? {}) as Record<string, unknown>;
      return { ok: true, firmas: sanearFirmasServidas(r['firmas']) };
    } catch (error) {
      return { ok: false, fallo: traducirLibro(error) };
    }
  };

  return {
    listar: () => operar('listGuestbook', {}),
    firmar: (message: string) => operar('signGuestbook', { message }),
    borrar: (id: string) => operar('deleteGuestbookEntry', { id }),
  };
}

const MOTIVOS = ['sin-verificar', 'vacia', 'tope-invitado', 'tope-libro'] as const;

export function traducirLibro(error: unknown): FalloLibro {
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
