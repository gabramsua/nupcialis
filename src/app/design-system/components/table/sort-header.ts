import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { NpIcon } from '../../icons/icon';
import { NpSortable } from './sortable';

/**
 * Cabecera ordenable.
 *
 * El control es un `<button>` dentro del `<th>`, no el `<th>` con `tabindex`.
 * Es el patrón que recomienda ARIA y el que funciona de verdad con teclado y
 * lector de pantalla: el `th` anuncia el orden con `aria-sort` y el botón es lo
 * que se pulsa.
 */
@Component({
  selector: 'th[npSortHeader]',
  imports: [NpIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.aria-sort]': 'aria()',
    class: 'np-sort-th',
  },
  template: `
    <button type="button" (click)="tabla.toggle(npSortHeader())">
      <ng-content />
      <np-icon [name]="icono()" [weight]="activa() ? 'fill' : 'regular'" />
    </button>
  `,
  styles: `
    button {
      display: inline-flex;
      align-items: center;
      gap: var(--np-space-1);
      padding: 0;
      border: 0;
      background: none;
      color: inherit;
      font: inherit;
      text-transform: inherit;
      letter-spacing: inherit;
      cursor: pointer;
    }
    button:focus-visible {
      outline: 2px solid var(--np-info-solid);
      outline-offset: 2px;
    }
    np-icon {
      --np-icon-size: 1em;
      /* Sin ordenar, la flecha se insinúa; no compite con el texto. */
      opacity: 0.35;
    }
    :host([aria-sort='ascending']) np-icon,
    :host([aria-sort='descending']) np-icon {
      opacity: 1;
    }
  `,
})
export class NpSortHeader {
  protected readonly tabla = inject(NpSortable);

  /** Nombre de la columna, el mismo que la clave en `npSortRows`. */
  readonly npSortHeader = input.required<string>();

  protected readonly aria = computed(() => this.tabla.directionFor(this.npSortHeader()));
  protected readonly activa = computed(() => this.aria() !== 'none');
  protected readonly icono = computed(() =>
    this.aria() === 'ascending'
      ? ('caret-up' as const)
      : this.aria() === 'descending'
        ? ('caret-down' as const)
        : ('caret-up-down' as const),
  );
}
