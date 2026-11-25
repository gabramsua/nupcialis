import { InjectionToken } from '@angular/core';

import type { DatosDePersona, PersonaDelPanel } from '../../features/panel/personas/personas';

/**
 * Puerto de las personas importantes de la pareja (`weddingParty`).
 *
 * El invitado **no lee esta colección**: lo visible le llega por la proyección
 * pública, sin teléfono y con foto solo si hay consentimiento. Aquí la pareja
 * las apunta todas, también las que no enseña.
 */

export type FalloPersonas =
  | { readonly tipo: 'sin-permiso' }
  | { readonly tipo: 'red' }
  | { readonly tipo: 'error'; readonly mensaje: string };

export type ResultadoPersonas =
  | { readonly ok: true; readonly personas: readonly PersonaDelPanel[] }
  | { readonly ok: false; readonly fallo: FalloPersonas };

export type ResultadoEscrituraPersona =
  { readonly ok: true } | { readonly ok: false; readonly fallo: FalloPersonas };

export interface PuertaPersonas {
  /** El `weddingId` lo pone quien llama, sacado del claim (regla 1). */
  listar(weddingId: string): Promise<ResultadoPersonas>;
  /**
   * Sin `id` crea; con `id` edita (y no toca el orden).
   *
   * `consentimientoNuevo` es «la pareja acaba de confirmar el consentimiento
   * de una foto nueva»: es lo único que escribe la marca de cuándo.
   */
  guardar(
    weddingId: string,
    id: string | null,
    datos: DatosDePersona,
    orden: number,
    consentimientoNuevo: boolean,
  ): Promise<ResultadoEscrituraPersona>;
  borrar(weddingId: string, id: string): Promise<ResultadoEscrituraPersona>;
  /** Cambia el orden de varias a la vez, en un solo lote. */
  reordenar(
    weddingId: string,
    cambios: readonly { readonly id: string; readonly order: number }[],
  ): Promise<ResultadoEscrituraPersona>;
}

export const PUERTA_PERSONAS = new InjectionToken<PuertaPersonas>('PUERTA_PERSONAS');

export interface FotoSubida {
  readonly path: string;
  readonly url: string;
}

/** Las fotos de las personas, en Storage (`weddings/{id}/party/`, públicas de lectura). */
export interface AlmacenFotosPersonas {
  subir(weddingId: string, fichero: File): Promise<FotoSubida>;
  /** No lanza: un huérfano en Storage es basura, no un fallo. */
  borrar(path: string): Promise<void>;
}

export const ALMACEN_FOTOS_PERSONAS = new InjectionToken<AlmacenFotosPersonas>(
  'ALMACEN_FOTOS_PERSONAS',
);
