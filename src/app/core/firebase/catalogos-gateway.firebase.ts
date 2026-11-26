/**
 * Los catálogos del superadmin, con Firestore (lectura) y Cloud Functions
 * (escritura).
 *
 * Frontera de confianza (D-19): lo que vuelve de Firestore pasa por los
 * lectores de `catalogos.ts`, que descartan lo que no cuadra.
 */

import { inject } from '@angular/core';
import { collection, getDocs } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

import {
  leerPartida,
  leerPregunta,
  leerTarea,
  porOrden,
  type TipoCatalogo,
} from '../../features/superadmin/catalogos/catalogos';
import type {
  FalloCatalogo,
  PuertaCatalogos,
  ResultadoCatalogo,
} from '../superadmin/catalogos-gateway';
import { FIREBASE_FUNCTIONS } from './functions.providers';
import { FIRESTORE } from './firestore.providers';

interface ErrorInvocable {
  readonly code?: string;
  readonly message?: string;
  readonly details?: unknown;
}

export function crearPuertaCatalogosFirebase(): PuertaCatalogos {
  const db = inject(FIRESTORE);
  const functions = inject(FIREBASE_FUNCTIONS);

  async function leer<T extends { readonly order: number; readonly id: string }>(
    tipo: TipoCatalogo,
    lector: (id: string, crudo: unknown) => T | null,
  ): Promise<ResultadoCatalogo<readonly T[]>> {
    try {
      const snap = await getDocs(collection(db, 'catalog', tipo, 'items'));
      const items = snap.docs.flatMap((d) => {
        const leido = lector(d.id, d.data());
        return leido ? [leido] : [];
      });
      return { ok: true, datos: porOrden(items) };
    } catch (error) {
      return { ok: false, fallo: traducirCatalogo(error) };
    }
  }

  async function llamar<T>(
    nombre: string,
    datos: unknown,
    resultado: (crudo: unknown) => T,
  ): Promise<ResultadoCatalogo<T>> {
    try {
      const respuesta = await httpsCallable<unknown, unknown>(functions, nombre)(datos);
      return { ok: true, datos: resultado(respuesta.data) };
    } catch (error) {
      return { ok: false, fallo: traducirCatalogo(error) };
    }
  }

  return {
    tareas: () => leer('tasks', leerTarea),
    partidas: () => leer('budget', leerPartida),
    preguntas: () => leer('quiz', leerPregunta),

    guardar: (tipo, id, elemento) =>
      llamar('saveCatalogItem', { tipo, id, elemento }, () => null as null),

    borrar: (tipo, id) => llamar('deleteCatalogItem', { tipo, id }, () => null as null),

    cargarDeFabrica: (tipo) =>
      llamar('loadFactoryCatalog', { tipo }, (crudo) => {
        const creados = (crudo as Record<string, unknown> | null)?.['creados'];
        return { creados: typeof creados === 'number' ? creados : 0 };
      }),
  };
}

/** Exportada para probarla sin red, como las demás traducciones. */
export function traducirCatalogo(error: unknown): FalloCatalogo {
  const fallo = (error ?? {}) as ErrorInvocable;
  const detalles = (fallo.details ?? {}) as Record<string, unknown>;

  switch (fallo.code) {
    case 'functions/permission-denied':
    case 'permission-denied':
      return { tipo: 'sin-permiso' };
    case 'functions/unauthenticated':
    case 'unauthenticated':
      return { tipo: 'sin-verificar' };
    case 'functions/unavailable':
    case 'functions/deadline-exceeded':
    case 'unavailable':
    case 'deadline-exceeded':
      return { tipo: 'red' };
    case 'functions/resource-exhausted':
      return { tipo: 'lleno' };
    case 'functions/invalid-argument':
      return typeof detalles['motivo'] === 'string'
        ? { tipo: 'invalido', motivo: detalles['motivo'] }
        : { tipo: 'error', mensaje: fallo.message ?? 'Datos no válidos.' };
    default:
      return { tipo: 'error', mensaje: fallo.message ?? 'Error desconocido' };
  }
}
