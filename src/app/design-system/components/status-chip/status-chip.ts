import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NpIcon } from '../../icons/icon';
import { NP_STATUS_ICON, NpStatus } from '../../tokens/semantic.generated';

/**
 * Chip de estado.
 *
 * Este componente existe para que la regla de §9.1 —**el color nunca viaja
 * solo**— sea imposible de saltarse por descuido. No se puede pintar un estado
 * sin texto: `label` es obligatorio, y el icono lo elige el propio componente a
 * partir del mapa generado desde `palette.json`. Ningún módulo puede decidir
 * que en su pantalla "confirmado" es otro color u otro icono.
 *
 * Si algún día alguien necesita un punto de color a secas, la respuesta es que
 * no: un punto verde sin etiqueta no es información, es un punto verde.
 */
@Component({
  selector: 'np-status-chip',
  imports: [NpIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.data-status]': 'status()' },
  template: `
    <np-icon [name]="icon()" [weight]="emphasis() === 'strong' ? 'fill' : 'regular'" />
    <span class="np-chip__label">{{ label() }}</span>
    @if (count() !== null) {
      <span class="np-chip__count">{{ count() }}</span>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: var(--np-space-2);
      padding: var(--np-space-1) var(--np-space-3);
      border: 1px solid var(--np-chip-border);
      border-radius: var(--np-radius-full);
      background: var(--np-chip-bg);
      color: var(--np-chip-fg);
      font-size: var(--np-text-sm);
      font-weight: var(--np-weight-medium);
      line-height: var(--np-leading-tight);
      white-space: nowrap;
    }

    :host([data-status='confirmed']) {
      --np-chip-fg: var(--np-confirmed-fg);
      --np-chip-bg: var(--np-confirmed-bg);
      --np-chip-border: var(--np-confirmed-border);
    }
    :host([data-status='pending']) {
      --np-chip-fg: var(--np-pending-fg);
      --np-chip-bg: var(--np-pending-bg);
      --np-chip-border: var(--np-pending-border);
    }
    :host([data-status='declined']) {
      --np-chip-fg: var(--np-declined-fg);
      --np-chip-bg: var(--np-declined-bg);
      --np-chip-border: var(--np-declined-border);
    }
    :host([data-status='attention']) {
      --np-chip-fg: var(--np-attention-fg);
      --np-chip-bg: var(--np-attention-bg);
      --np-chip-border: var(--np-attention-border);
    }
    :host([data-status='info']) {
      --np-chip-fg: var(--np-info-fg);
      --np-chip-bg: var(--np-info-bg);
      --np-chip-border: var(--np-info-border);
    }

    np-icon {
      --np-icon-size: 1em;
    }

    .np-chip__count {
      padding-inline-start: var(--np-space-2);
      border-inline-start: 1px solid var(--np-chip-border);
      font-variant-numeric: tabular-nums;
    }
  `,
})
export class NpStatusChip {
  readonly status = input.required<NpStatus>();
  /** Obligatorio a propósito: sin texto no hay chip. */
  readonly label = input.required<string>();
  /** `strong` rellena el icono. Para lo que está activo o seleccionado. */
  readonly emphasis = input<'normal' | 'strong'>('normal');
  readonly count = input<number | null>(null);

  protected readonly icon = computed(() => NP_STATUS_ICON[this.status()]);
}
