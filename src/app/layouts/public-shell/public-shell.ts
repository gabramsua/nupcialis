import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

/**
 * Envoltorio de la web pública de la boda.
 *
 * Todo lo que cuelgue de aquí lo descarga un invitado desde el móvil, a menudo
 * con mala cobertura. Presupuesto: 200 kB de JS comprimido. Nada del panel
 * puede acabar en este chunk.
 */
@Component({
  selector: 'np-public-shell',
  imports: [TranslocoDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <main>
        <h1>{{ t('app.name') }}</h1>
        <p>{{ t('app.tagline') }}</p>
      </main>
    </ng-container>
  `,
})
export class PublicShell {}
