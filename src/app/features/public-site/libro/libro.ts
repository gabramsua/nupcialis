/**
 * El libro de firmas, en el cliente (§8.15).
 *
 * Los topes son **copia** de `functions/src/dominio/libro.ts`: el servidor
 * manda, esto solo evita ofrecer lo que se va a rechazar.
 */

export const MAX_MENSAJE = 800;
export const MAX_POR_INVITADO = 3;

/** Lo que ve un invitado: sin el `guestId` de nadie. */
export interface FirmaPublica {
  readonly id: string;
  readonly autor: string;
  readonly mensaje: string;
  /** ISO, o `null` si el servidor aún no la ha sellado. */
  readonly cuando: string | null;
  /** Si es suya: puede borrarla. */
  readonly mia: boolean;
}

/**
 * Frontera de confianza (D-19): lo que vuelve de la función es `unknown` y se
 * revisa campo a campo. Un despliegue por detrás o por delante no puede romper
 * la página.
 */
export function sanearFirmasServidas(valor: unknown): readonly FirmaPublica[] {
  if (!Array.isArray(valor)) return [];

  return valor.flatMap((crudo): readonly FirmaPublica[] => {
    if (crudo === null || typeof crudo !== 'object') return [];
    const f = crudo as Record<string, unknown>;
    const id = typeof f['id'] === 'string' ? f['id'] : '';
    const mensaje = typeof f['mensaje'] === 'string' ? f['mensaje'] : '';
    if (id === '' || mensaje === '') return [];

    return [
      {
        id,
        autor: typeof f['autor'] === 'string' ? f['autor'] : '',
        mensaje,
        cuando: typeof f['cuando'] === 'string' ? f['cuando'] : null,
        mia: f['mia'] === true,
      },
    ];
  });
}
