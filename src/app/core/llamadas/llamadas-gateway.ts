import { InjectionToken } from '@angular/core';

import type { FalloGestion } from '../superadmin/gestion-gateway';

/**
 * Un puerto genérico para llamar a una Cloud Function y **leer** lo que vuelve.
 *
 * Lo usan las pantallas pequeñas que no justifican un puerto cada una (planes,
 * correos, consejos, editar y borrar boda, consejos del panel). Lo que vuelve
 * es `unknown` y pasa por el lector que da quien llama (D-19): si no se
 * entiende, es un fallo, no un `undefined` que se cuela hasta la plantilla.
 */
export type ResultadoLlamada<T> =
  { readonly ok: true; readonly datos: T } | { readonly ok: false; readonly fallo: FalloGestion };

export interface PuertaLlamadas {
  llamar<T>(
    nombre: string,
    datos: unknown,
    leer: (crudo: unknown) => T | null,
  ): Promise<ResultadoLlamada<T>>;
}

export const PUERTA_LLAMADAS = new InjectionToken<PuertaLlamadas>('PUERTA_LLAMADAS');

/** Utilidades de lectura compartidas por los lectores de las pantallas. */
export function objeto(valor: unknown): Record<string, unknown> {
  return valor !== null && typeof valor === 'object' ? (valor as Record<string, unknown>) : {};
}

export function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor : '';
}

export function entero(valor: unknown): number {
  return typeof valor === 'number' && Number.isFinite(valor) ? Math.trunc(valor) : 0;
}

export function lista(valor: unknown): readonly unknown[] {
  return Array.isArray(valor) ? valor : [];
}
