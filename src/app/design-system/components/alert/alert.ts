import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NpIcon } from '../../icons/icon';
import { NP_STATUS_ICON, NpStatus } from '../../tokens/semantic.generated';

/**
 * Aviso en línea.
 *
 * Mismo trato que el chip de estado: el icono lo decide el estado, no quien lo
 * usa, y siempre hay texto. Un recuadro de color sin más no informa a quien no
 * distingue ese color.
 *
 * `attention` y `declined` se anuncian a los lectores de pantalla en cuanto
 * aparecen; el resto no interrumpen.
 */
@Component({
  selector: 'np-alert',
  imports: [NpIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-status]': 'status()',
    '[attr.role]': 'urgente() ? "alert" : "status"',
  },
  template: `
    <np-icon [name]="icon()" weight="fill" />
    <div class="np-alert__cuerpo">
      @if (heading()) {
        <strong>{{ heading() }}</strong>
      }
      <ng-content />
    </div>
  `,
  styles: `
    :host {
      display: flex;
      align-items: flex-start;
      gap: var(--np-space-3);
      padding: var(--np-space-3) var(--np-space-4);
      border: 1px solid var(--np-alert-border);
      border-radius: var(--np-radius-md);
      background: var(--np-alert-bg);
      color: var(--np-alert-fg);
      font-size: var(--np-text-sm);
    }
    :host([data-status='confirmed']) {
      --np-alert-fg: var(--np-confirmed-fg);
      --np-alert-bg: var(--np-confirmed-bg);
      --np-alert-border: var(--np-confirmed-border);
    }
    :host([data-status='pending']) {
      --np-alert-fg: var(--np-pending-fg);
      --np-alert-bg: var(--np-pending-bg);
      --np-alert-border: var(--np-pending-border);
    }
    :host([data-status='declined']) {
      --np-alert-fg: var(--np-declined-fg);
      --np-alert-bg: var(--np-declined-bg);
      --np-alert-border: var(--np-declined-border);
    }
    :host([data-status='attention']) {
      --np-alert-fg: var(--np-attention-fg);
      --np-alert-bg: var(--np-attention-bg);
      --np-alert-border: var(--np-attention-border);
    }
    :host([data-status='info']) {
      --np-alert-fg: var(--np-info-fg);
      --np-alert-bg: var(--np-info-bg);
      --np-alert-border: var(--np-info-border);
    }
    np-icon {
      --np-icon-size: 1.25rem;
      margin-block-start: 0.1em;
    }
    .np-alert__cuerpo {
      display: grid;
      gap: var(--np-space-1);
    }
  `,
})
export class NpAlert {
  readonly status = input<NpStatus>('info');
  readonly heading = input<string | null>(null);

  protected readonly icon = computed(() => NP_STATUS_ICON[this.status()]);
  protected readonly urgente = computed(
    () => this.status() === 'attention' || this.status() === 'declined',
  );
}
