import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

import { PUERTA_AUTH } from '../../../core/auth/auth-gateway';
import { NpButton } from '../../../design-system/components/button/button';
import { NpEmptyState } from '../../../design-system/components/empty-state/empty-state';

/**
 * Has entrado, pero esa cuenta no es superadmin.
 *
 * Antes esto mandaba a la raíz, y la raíz contestaba «no encontramos esta
 * boda»: un callejón que no explica nada y que además dice algo falso. El
 * acceso funcionó; lo que falta es el claim, que no se concede desde ninguna
 * pantalla a propósito (REQUISITOS §3.2).
 */
@Component({
  selector: 'np-superadmin-sin-permiso',
  imports: [TranslocoDirective, NpButton, NpEmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <main>
        <np-empty-state
          icon="lock-simple"
          [title]="t('superadmin.sinPermiso.titulo')"
          [description]="t('superadmin.sinPermiso.descripcion')"
        >
          <button npButton variant="primary" (click)="salir()">
            {{ t('superadmin.sinPermiso.salir') }}
          </button>
        </np-empty-state>
      </main>
    </ng-container>
  `,
  styles: `
    main {
      display: grid;
      place-content: center;
      min-block-size: 100dvh;
      padding: var(--np-space-5);
    }
  `,
})
export class SuperadminSinPermiso {
  private readonly puerta = inject(PUERTA_AUTH);

  protected async salir(): Promise<void> {
    await this.puerta.salir();
    location.assign('/superadmin/acceso');
  }
}
