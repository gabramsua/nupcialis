export type NpSortDirection = 'asc' | 'desc';

export interface NpSortState {
  readonly column: string;
  readonly direction: NpSortDirection;
}

/**
 * Comparador con reglas de español.
 *
 * `localeCompare` con 'es' no es un detalle: sin él, "Álvarez" se va detrás de
 * "Zurita" y la "ñ" acaba donde no toca. En una lista de invitados españoles eso
 * se nota a la primera.
 *
 * `numeric` ordena "Mesa 2" antes que "Mesa 10", que es lo que espera cualquiera
 * que mire un plano de mesas.
 */
const collator = new Intl.Collator('es', { numeric: true, sensitivity: 'base' });

export function npCompare(a: unknown, b: unknown): number {
  // Lo vacío siempre al final, ordene como ordene: un invitado sin teléfono
  // estorba menos abajo, tanto ascendente como descendente.
  const aVacio = a === null || a === undefined || a === '';
  const bVacio = b === null || b === undefined || b === '';
  if (aVacio && bVacio) return 0;
  if (aVacio) return 1;
  if (bVacio) return -1;

  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b);
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();

  return collator.compare(String(a), String(b));
}

/**
 * Ordena una copia de las filas. No muta el original: el orden es una vista
 * sobre los datos, no una propiedad de los datos.
 */
export function npSortRows<T>(
  rows: readonly T[],
  state: NpSortState | null,
  accessors: Record<string, (row: T) => unknown>,
): T[] {
  if (!state) return [...rows];
  const accessor = accessors[state.column];
  if (!accessor) return [...rows];

  const signo = state.direction === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const cmp = npCompare(accessor(a), accessor(b));
    // Los vacíos se quedan al final también al invertir el orden.
    if (cmp === 1 || cmp === -1) {
      const aVacio = accessor(a) === null || accessor(a) === undefined || accessor(a) === '';
      const bVacio = accessor(b) === null || accessor(b) === undefined || accessor(b) === '';
      if (aVacio !== bVacio) return cmp;
    }
    return cmp * signo;
  });
}
