import { InjectionToken } from '@angular/core';

import type {
  DatosDeProveedor,
  ProveedorDelPanel,
} from '../../features/panel/proveedores/proveedores';

/**
 * Puerto de los proveedores de la pareja (`vendors`).
 *
 * Colección de la pareja y de nadie más (lectura y escritura solo para
 * `isOwner`), así que se habla con Firestore directamente. Los contratos viven
 * en Storage, también solo de la pareja.
 */

export type FalloProveedores =
  | { readonly tipo: 'sin-permiso' }
  | { readonly tipo: 'red' }
  | { readonly tipo: 'error'; readonly mensaje: string };

export type ResultadoProveedores =
  | { readonly ok: true; readonly proveedores: readonly ProveedorDelPanel[] }
  | { readonly ok: false; readonly fallo: FalloProveedores };

export type ResultadoEscrituraProveedor =
  | { readonly ok: true; readonly id: string }
  | { readonly ok: false; readonly fallo: FalloProveedores };

export interface PuertaProveedores {
  /** El `weddingId` lo pone quien llama, sacado del claim (regla 1). */
  listar(weddingId: string): Promise<ResultadoProveedores>;
  /** Sin `id` crea; con `id` edita (y no toca el orden). Devuelve el id. */
  guardar(
    weddingId: string,
    id: string | null,
    datos: DatosDeProveedor,
    orden: number,
  ): Promise<ResultadoEscrituraProveedor>;
  borrar(weddingId: string, id: string): Promise<ResultadoEscrituraProveedor>;
}

export const PUERTA_PROVEEDORES = new InjectionToken<PuertaProveedores>('PUERTA_PROVEEDORES');

/** Los contratos en PDF, en Storage. */
export interface AlmacenContratos {
  /** Sube el PDF y devuelve su ruta. Lanza si Storage lo rechaza. */
  subir(weddingId: string, proveedorId: string, fichero: File): Promise<string>;
  /** La URL para abrirlo. */
  url(ruta: string): Promise<string>;
  /** Quita el fichero. No lanza: un huérfano en Storage es basura, no un fallo. */
  borrar(ruta: string): Promise<void>;
}

export const ALMACEN_CONTRATOS = new InjectionToken<AlmacenContratos>('ALMACEN_CONTRATOS');
