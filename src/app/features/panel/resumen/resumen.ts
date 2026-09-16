import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

import { NpEmptyState } from '../../../design-system/components/empty-state/empty-state';
import { BodaStore } from '../boda.store';

/**
 * Resumen del panel.
 *
 * Marcador de posición honesto: dice qué va a haber aquí en vez de fingir unos
 * contadores que todavía no se leen. Ver `F0.7.5` en TAREAS.md.
 */
@Component({
  selector: 'np-panel-resumen',
  imports: [TranslocoDirective, NpEmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <np-empty-state
        icon="chart-bar"
        [title]="t('panel.resumenPendiente.titulo')"
        [description]="t('panel.resumenPendiente.descripcion')"
      />
    </ng-container>
  `,
})
export class PanelResumen {
  protected readonly store = inject(BodaStore);
}
