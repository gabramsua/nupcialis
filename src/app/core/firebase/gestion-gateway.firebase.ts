/**
 * La gestión por boda del superadmin, con Cloud Functions.
 *
 * Lo que llega es `unknown` y pasa por los lectores de `gestion.ts` antes de
 * pintarse (D-19).
 */

import { inject } from '@angular/core';
import { httpsCallable } from 'firebase/functions';

import {
  leerFicha,
  leerFinanzas,
  leerPago,
  leerRecordatorios,
} from '../../features/superadmin/gestion/gestion';
import type { FalloGestion, PuertaGestion, Resultado } from '../superadmin/gestion-gateway';
import { FIREBASE_FUNCTIONS } from './functions.providers';

interface ErrorInvocable {
  readonly code?: string;
  readonly message?: string;
  readonly details?: unknown;
}

const ILEGIBLE: FalloGestion = { tipo: 'error', mensaje: 'Respuesta ilegible.' };

export function crearPuertaGestionFirebase(): PuertaGestion {
  const functions = inject(FIREBASE_FUNCTIONS);

  /** Llama, y lo que vuelva lo lee `leer`; si no se entiende, es un fallo. */
  async function llamar<T>(
    nombre: string,
    datos: unknown,
    leer: (crudo: unknown) => T | null,
  ): Promise<Resultado<T>> {
    try {
      const respuesta = await httpsCallable<unknown, unknown>(functions, nombre)(datos);
      const leido = leer(respuesta.data);
      return leido === null ? { ok: false, fallo: ILEGIBLE } : { ok: true, datos: leido };
    } catch (error) {
      return { ok: false, fallo: traducirGestion(error) };
    }
  }

  return {
    ficha: (weddingId) => llamar('getWeddingFile', { weddingId }, leerFicha),

    enlaceDeRestablecimiento: (weddingId, uid) =>
      llamar('generateCoupleResetLink', { weddingId, uid }, (crudo) => {
        const d = (crudo ?? {}) as Record<string, unknown>;
        return typeof d['enlace'] === 'string' && typeof d['email'] === 'string'
          ? { email: d['email'], enlace: d['enlace'] }
          : null;
      }),

    finanzas: () => llamar('listPayments', {}, leerFinanzas),

    guardarPago: (id, pago) =>
      llamar('savePayment', { paymentId: id, payment: pago }, (crudo) => leerPago(crudo)),

    borrarPago: (paymentId) => llamar('deletePayment', { paymentId }, () => null as null),

    recordatorios: () => llamar('getReminders', {}, leerRecordatorios),

    marcarRecordatorio: (weddingId, key, sent) =>
      llamar('markReminderSent', { weddingId, key, sent }, () => null as null),
  };
}

/** Exportada para probarla sin red, como las demás traducciones. */
export function traducirGestion(error: unknown): FalloGestion {
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
    case 'functions/not-found':
      return { tipo: 'no-existe' };
    case 'functions/failed-precondition':
      return detalles['motivo'] === 'sin-correo'
        ? { tipo: 'sin-correo' }
        : { tipo: 'error', mensaje: fallo.message ?? 'No se puede hacer ahora.' };
    case 'functions/invalid-argument':
      return typeof detalles['motivo'] === 'string'
        ? { tipo: 'invalido', motivo: detalles['motivo'] }
        : { tipo: 'error', mensaje: fallo.message ?? 'Datos no válidos.' };
    default:
      return { tipo: 'error', mensaje: fallo.message ?? 'Error desconocido' };
  }
}
