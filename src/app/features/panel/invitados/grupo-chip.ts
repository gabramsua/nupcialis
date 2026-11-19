import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import type { Grupo } from '../../../core/invitados/grupos-gateway';
import { NpIcon } from '../../../design-system/icons/icon';

/**
 * Un grupo en pequeño: su color, su nombre y, si es restringido, un candado.
 *
 * El color es la mitad que se ve de lejos; **el nombre va siempre** (§9.1), y
 * el candado lleva su propia etiqueta para lectores de pantalla, porque es lo
 * único que distingue a un grupo que parte la galería de uno que no.
 */
@Component({
  selector: 'np-grupo-chip',
  imports: [NpIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.--np-grupo]': "'var(--np-cat-' + grupo().color + ')'",
  },
  template: `
    <span class="chip__muestra" aria-hidden="true"></span>
    <span class="chip__nombre">{{ grupo().name }}</span>
    @if (grupo().photoAudience === 'restricted') {
      <np-icon name="lock-simple" [label]="etiquetaRestringido()" />
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: var(--np-space-1);
      max-inline-size: 100%;
      padding: 0 var(--np-space-2);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-full);
      background: var(--np-surface-surface);
      font-size: var(--np-text-xs);
      line-height: 1.8;
    }
    .chip__muestra {
      flex: none;
      inline-size: 0.625rem;
      block-size: 0.625rem;
      border-radius: var(--np-radius-full);
      background: var(--np-grupo);
    }
    .chip__nombre {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `,
})
export class NpGrupoChip {
  readonly grupo = input.required<Grupo>();
  /** Lo que lee un lector de pantalla en el candado. Viene traducido de fuera. */
  readonly etiquetaRestringido = input('');
}
