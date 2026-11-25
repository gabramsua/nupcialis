import { InjectionToken } from '@angular/core';

/**
 * El libro de firmas, del lado de la pareja (§8.15).
 *
 * La pareja lee y escribe la colección directamente (las reglas se lo dejan):
 * es quien modera. Los invitados, en cambio, solo lo ven por `listGuestbook`.
 * El `guestId` de cada autor **no llega a la pantalla**.
 */

export type EstadoFirmaPanel = 'visible' | 'hidden';

export interface FirmaDelPanel {
  readonly id: string;
  readonly autor: string;
  readonly mensaje: string;
  readonly status: EstadoFirmaPanel;
  /** ISO, o `null` si el servidor aún no la ha sellado. */
  readonly cuando: string | null;
}

export type FalloLibroPanel =
  | { readonly tipo: 'sin-permiso' }
  | { readonly tipo: 'red' }
  | { readonly tipo: 'error'; readonly mensaje: string };

export type ResultadoLibroPanel =
  | { readonly ok: true; readonly firmas: readonly FirmaDelPanel[] }
  | { readonly ok: false; readonly fallo: FalloLibroPanel };

export type ResultadoEscrituraLibro =
  { readonly ok: true } | { readonly ok: false; readonly fallo: FalloLibroPanel };

export interface PuertaLibroPanel {
  /** El `weddingId` lo pone quien llama, sacado del claim (regla 1). */
  listar(weddingId: string): Promise<ResultadoLibroPanel>;
  cambiarEstado(
    weddingId: string,
    id: string,
    estado: EstadoFirmaPanel,
  ): Promise<ResultadoEscrituraLibro>;
  borrar(weddingId: string, id: string): Promise<ResultadoEscrituraLibro>;
}

export const PUERTA_LIBRO_PANEL = new InjectionToken<PuertaLibroPanel>('PUERTA_LIBRO_PANEL');

/** La más reciente primero; las que aún no tienen fecha, arriba. */
export function ordenarFirmasDelPanel(firmas: readonly FirmaDelPanel[]): readonly FirmaDelPanel[] {
  return firmas.slice().sort((a, b) => {
    const ta = a.cuando === null ? Number.MAX_SAFE_INTEGER : Date.parse(a.cuando);
    const tb = b.cuando === null ? Number.MAX_SAFE_INTEGER : Date.parse(b.cuando);
    return tb - ta;
  });
}
