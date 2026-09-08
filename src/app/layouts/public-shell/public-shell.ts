import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { NpIcon } from '../../design-system/icons/icon';

/**
 * Envoltorio de la web pública de la boda.
 *
 * Todo lo que cuelgue de aquí lo descarga un invitado desde el móvil, a menudo
 * con mala cobertura. Presupuesto: 200 kB de JS comprimido. Nada del panel
 * puede acabar en este chunk.
 */
@Component({
  selector: 'np-public-shell',
  imports: [TranslocoDirective, NpIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <main class="np-portada">
        <np-icon name="diamond" weight="fill" />
        <h1>{{ t('app.name') }}</h1>
        <p>{{ t('app.tagline') }}</p>
      </main>
    </ng-container>
  `,
  styles: `
    .np-portada {
      display: grid;
      place-content: center;
      justify-items: center;
      gap: 0.5rem;
      min-block-size: 100dvh;
      text-align: center;
      color: var(--np-surface-text);
    }
    np-icon {
      --np-icon-size: 3rem;
      color: var(--np-cat-rosa);
    }
    h1 {
      margin: 0;
      font-size: clamp(2rem, 6vw, 3rem);
      font-weight: 600;
    }
    p {
      margin: 0;
      color: var(--np-surface-text-muted);
    }
  `,
})
export class PublicShell {}
