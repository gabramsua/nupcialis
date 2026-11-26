import { InjectionToken } from '@angular/core';

import type {
  PartidaDeCatalogo,
  PreguntaDeCatalogo,
  TareaDeCatalogo,
  TipoCatalogo,
} from '../../features/superadmin/catalogos/catalogos';

/**
 * Puerto de los catálogos del superadmin (tareas, presupuesto, preguntas).
 *
 * Leer es Firestore directo (reglas: superadmin, y las parejas las preguntas
 * sugeridas); escribir es siempre una Cloud Function que valida y audita.
 */

export type FalloCatalogo =
  | { readonly tipo: 'sin-permiso' }
  | { readonly tipo: 'sin-verificar' }
  | { readonly tipo: 'red' }
  | { readonly tipo: 'lleno' }
  /** El servidor rechazó el elemento; `motivo` dice qué campo. */
  | { readonly tipo: 'invalido'; readonly motivo: string }
  | { readonly tipo: 'error'; readonly mensaje: string };

export type ResultadoCatalogo<T> =
  { readonly ok: true; readonly datos: T } | { readonly ok: false; readonly fallo: FalloCatalogo };

export interface PuertaCatalogos {
  tareas(): Promise<ResultadoCatalogo<readonly TareaDeCatalogo[]>>;
  partidas(): Promise<ResultadoCatalogo<readonly PartidaDeCatalogo[]>>;
  /** Las sugeridas para el quiz. También las lee la pareja. */
  preguntas(): Promise<ResultadoCatalogo<readonly PreguntaDeCatalogo[]>>;

  /** Con `id` edita; con `null` crea. El `elemento` lo valida el servidor. */
  guardar(
    tipo: TipoCatalogo,
    id: string | null,
    elemento: Record<string, unknown>,
  ): Promise<ResultadoCatalogo<null>>;
  borrar(tipo: TipoCatalogo, id: string): Promise<ResultadoCatalogo<null>>;
  /** Carga los originales de fábrica en un catálogo vacío. */
  cargarDeFabrica(tipo: TipoCatalogo): Promise<ResultadoCatalogo<{ readonly creados: number }>>;
}

export const PUERTA_CATALOGOS = new InjectionToken<PuertaCatalogos>('PUERTA_CATALOGOS');
