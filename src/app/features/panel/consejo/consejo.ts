import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

import { NpIcon } from '../../../design-system/icons/icon';
import { ConsejosDelPanel } from './consejos-panel';

/**
 * El «Consejo» desplegable que va arriba de cada módulo del panel (D-53).
 *
 * Cerrado por defecto: ayuda a quien lo busca sin estorbar a quien ya sabe lo
 * que hace. Usa `<details>`, que el navegador ya hace accesible por teclado y
 * lector de pantalla. El texto es plano; los saltos de línea doble son párrafos.
 */
@Component({
  selector: 'np-consejo',
  imports: [TranslocoDirective, NpIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      @if (parrafos().length > 0) {
        <details class="np-consejo">
          <summary>
            <np-icon name="sparkle" />
            <span>{{ t('panel.consejo.titulo') }}</span>
            <np-icon class="np-consejo__flecha" name="caret-down" />
          </summary>
          <div class="np-consejo__texto">
            @for (p of parrafos(); track $index) {
              <p>{{ p }}</p>
            }
          </div>
        </details>
      }
    </ng-container>
  `,
  styles: `
    :host {
      display: block;
    }
    .np-consejo {
      margin-block-end: var(--np-space-4);
      background: var(--np-surface-surface);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-md);
    }
    summary {
      display: flex;
      align-items: center;
      gap: var(--np-space-2);
      min-block-size: var(--np-tap-target);
      padding-inline: var(--np-space-3);
      font-weight: var(--np-weight-medium);
      cursor: pointer;
      list-style: none;
    }
    summary::-webkit-details-marker {
      display: none;
    }
    .np-consejo__flecha {
      margin-inline-start: auto;
    }
    details[open] .np-consejo__flecha {
      transform: rotate(180deg);
    }
    .np-consejo__texto {
      display: grid;
      gap: var(--np-space-2);
      padding: 0 var(--np-space-3) var(--np-space-3);
      color: var(--np-surface-text-muted);
    }
    .np-consejo__texto p {
      margin: 0;
    }
  `,
})
export class Consejo {
  /** La clave del módulo (`rsvp`, `guests`…), o `null` si la pantalla no es de uno. */
  readonly modulo = input<string | null>(null);

  // Opcional: en una pantalla probada sin el servicio, simplemente no sale nada.
  private readonly servicio = inject(ConsejosDelPanel, { optional: true });

  protected readonly parrafos = computed(() => {
    const m = this.modulo();
    const texto = m ? (this.servicio?.consejos()[m] ?? '') : '';
    return texto
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter((p) => p !== '');
  });
}
