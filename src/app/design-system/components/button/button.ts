import { Directive, computed, input } from '@angular/core';

export type NpButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type NpButtonSize = 'sm' | 'md';

/**
 * Botón.
 *
 * Directiva sobre `<button>` o `<a>`, no componente envoltorio: así el elemento
 * sigue siendo nativo y conserva de balde el foco, el teclado, el `type`, el
 * `disabled` y la semántica que lee un lector de pantalla. Envolverlo en un
 * componente propio obliga a reimplementar todo eso y siempre se olvida algo.
 */
@Directive({
  selector: 'button[npButton], a[npButton]',
  host: {
    class: 'np-button',
    '[attr.data-variant]': 'variant()',
    '[attr.data-size]': 'size()',
    '[attr.data-loading]': 'loading() ? "" : null',
    '[attr.aria-busy]': 'loading() ? "true" : null',
    '[attr.disabled]': 'disabledAttr()',
    '[attr.aria-disabled]': 'loading() ? "true" : null',
  },
})
export class NpButton {
  readonly variant = input<NpButtonVariant>('secondary');
  readonly size = input<NpButtonSize>('md');
  /** Mientras carga, el botón queda inerte pero conserva su ancho. */
  readonly loading = input(false);
  readonly disabled = input(false);

  protected readonly disabledAttr = computed(() => (this.disabled() || this.loading() ? '' : null));
}
