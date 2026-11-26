import { Directive, model } from '@angular/core';
import { NpSortState } from './sort';

/**
 * Estado de ordenación de una tabla.
 *
 * Va en la tabla nativa, no en un componente envoltorio: la tabla la sigue
 * escribiendo cada pantalla con su `<table>`, y esto solo aporta el estado y la
 * accesibilidad. Ordenar los datos es cosa de la pantalla, con `npSortRows`,
 * porque solo ella sabe de qué tipo es cada columna.
 */
@Directive({
  selector: 'table[npSortable]',
  exportAs: 'npSortable',
})
export class NpSortable {
  readonly sort = model<NpSortState | null>(null);

  /** Ascendente, descendente y sin ordenar. Poder volver al orden original importa. */
  toggle(column: string): void {
    const actual = this.sort();
    if (!actual || actual.column !== column) {
      this.sort.set({ column, direction: 'asc' });
    } else if (actual.direction === 'asc') {
      this.sort.set({ column, direction: 'desc' });
    } else {
      this.sort.set(null);
    }
  }

  directionFor(column: string): 'ascending' | 'descending' | 'none' {
    const actual = this.sort();
    if (!actual || actual.column !== column) return 'none';
    return actual.direction === 'asc' ? 'ascending' : 'descending';
  }
}
