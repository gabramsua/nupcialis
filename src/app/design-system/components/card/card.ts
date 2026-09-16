import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Contenedor de superficie. Agrupa contenido sin añadir semántica. */
@Component({
  selector: 'np-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (heading()) {
      <h3 class="np-card__heading">{{ heading() }}</h3>
    }
    <ng-content />
  `,
  styles: `
    :host {
      display: block;
      padding: var(--np-space-4);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-lg);
      background: var(--np-surface-surface);
    }
    .np-card__heading {
      margin: 0 0 var(--np-space-3);
      font-size: var(--np-text-lg);
      font-weight: var(--np-weight-semibold);
    }
  `,
})
export class NpCard {
  readonly heading = input<string | null>(null);
}
