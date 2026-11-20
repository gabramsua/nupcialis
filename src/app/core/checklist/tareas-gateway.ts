import { InjectionToken } from '@angular/core';

import type { TareaDelPanel } from '../../features/panel/checklist/tareas';

/**
 * Puerto de las tareas de la pareja (§8.17).
 *
 * Colección de la pareja y de nadie más (`checklistItems`: lectura y escritura
 * solo para `isOwner`), así que se habla con Firestore directamente.
 */

export type FalloTareas =
  | { readonly tipo: 'sin-permiso' }
  | { readonly tipo: 'red' }
  | { readonly tipo: 'error'; readonly mensaje: string };

export type ResultadoTareas =
  | { readonly ok: true; readonly tareas: readonly TareaDelPanel[] }
  | { readonly ok: false; readonly fallo: FalloTareas };

export type ResultadoEscrituraTarea =
  { readonly ok: true } | { readonly ok: false; readonly fallo: FalloTareas };

/** Lo que la pareja escribe de una tarea. El resto lo pone el sistema. */
export interface DatosTarea {
  /** Sin `id`, es una tarea nueva. */
  readonly id?: string;
  readonly title: string;
  readonly description: string;
  readonly category: string;
  readonly dueDate: Date | null;
  readonly assignedTo: TareaDelPanel['assignedTo'];
  readonly priority: TareaDelPanel['priority'];
  /** Solo se usa al crear; al editar no se toca. */
  readonly order: number;
}

export interface QuienMarca {
  readonly uid: string;
  readonly email: string | null;
}

export interface PuertaTareas {
  /** El `weddingId` lo pone quien llama, sacado del claim (regla 1). */
  listar(weddingId: string): Promise<ResultadoTareas>;
  guardar(weddingId: string, datos: DatosTarea): Promise<ResultadoEscrituraTarea>;
  /**
   * `por` es quien la marca: al completarla se apuntan la hora (la del servidor)
   * y esa persona; al desmarcarla se borran las dos.
   */
  marcar(
    weddingId: string,
    id: string,
    hecha: boolean,
    por: QuienMarca,
  ): Promise<ResultadoEscrituraTarea>;
  borrar(weddingId: string, id: string): Promise<ResultadoEscrituraTarea>;
}

export const PUERTA_TAREAS = new InjectionToken<PuertaTareas>('PUERTA_TAREAS');
