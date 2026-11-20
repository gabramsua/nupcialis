import { InjectionToken } from '@angular/core';

/**
 * Puerto de la lista de regalos, del lado de la pareja (§8.8).
 *
 * El invitado no lee esta colección: se la sirve `getGifts`, que es lo que
 * mantiene anónima la reserva. La pareja sí, porque es su lista, y porque
 * necesita ver lo que está apagado y lo que está a medio escribir.
 */

export interface RegaloDelPanel {
  readonly id: string;
  readonly titulo: string;
  readonly descripcion: string;
  readonly precio: number | null;
  readonly enlace: string | null;
  readonly imagen: string | null;
  /** Si lo ha cogido alguien. **El id de quién no sube a esta pantalla.** */
  readonly reservado: boolean;
  readonly order: number;
  readonly enabled: boolean;
}

export type DatosRegalo = Omit<RegaloDelPanel, 'id' | 'reservado'> & { readonly id?: string };

export type FalloRegalosPanel =
  | { readonly tipo: 'sin-permiso' }
  | { readonly tipo: 'red' }
  | { readonly tipo: 'error'; readonly mensaje: string };

export type ResultadoRegalosPanel =
  | { readonly ok: true; readonly regalos: readonly RegaloDelPanel[] }
  | { readonly ok: false; readonly fallo: FalloRegalosPanel };

export type ResultadoEscrituraRegalo =
  { readonly ok: true } | { readonly ok: false; readonly fallo: FalloRegalosPanel };

export interface PuertaRegalosPanel {
  /** El `weddingId` lo pone quien llama, sacado del claim (regla 1). */
  listar(weddingId: string): Promise<ResultadoRegalosPanel>;
  guardar(weddingId: string, datos: DatosRegalo): Promise<ResultadoEscrituraRegalo>;
  borrar(weddingId: string, id: string): Promise<ResultadoEscrituraRegalo>;
}

export const PUERTA_REGALOS_PANEL = new InjectionToken<PuertaRegalosPanel>('PUERTA_REGALOS_PANEL');

/** El orden de la pareja, y dentro el alfabético por id para no bailar. */
export function ordenarRegalos(regalos: readonly RegaloDelPanel[]): readonly RegaloDelPanel[] {
  return regalos.slice().sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}
