import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NpIcon } from '../../icons/icon';
import { NpIconName } from '../../icons/icon-name.generated';

/**
 * Estado vacío.
 *
 * Una lista vacía no es un error, es un momento del producto: la pareja acaba
 * de entrar y todavía no ha cargado invitados. Merece decir qué va aquí y qué
 * hacer, no quedarse en blanco.
 */
@Component({
  selector: 'np-empty-state',
  imports: [NpIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <np-icon [name]="icon()" />
    <p class="np-empty__titulo">{{ title() }}</p>
    @if (description()) {
      <p class="np-empty__desc">{{ description() }}</p>
    }
    <ng-content />
  `,
  styles: `
    :host {
      display: grid;
      justify-items: center;
      gap: var(--np-space-2);
      padding: var(--np-space-7) var(--np-space-4);
      color: var(--np-surface-text-muted);
      text-align: center;
    }
    np-icon {
      --np-icon-size: 2.5rem;
      opacity: 0.6;
    }
    .np-empty__titulo {
      margin: 0;
      color: var(--np-surface-text);
      font-size: var(--np-text-lg);
      font-weight: var(--np-weight-medium);
    }
    .np-empty__desc {
      max-inline-size: 34ch;
      margin: 0;
      font-size: var(--np-text-sm);
    }
  `,
})
export class NpEmptyState {
  readonly icon = input<NpIconName>('list');
  readonly title = input.required<string>();
  readonly description = input<string | null>(null);
}
