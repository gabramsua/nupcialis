import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';

import { NpIcon } from '../../../design-system/icons/icon';

/**
 * La invitación a la galería, dentro de la web de la boda (§8.5).
 *
 * Igual que el quiz: la galería vive en su propia página —se comparte y se
 * vuelve a ella al día siguiente— y esta sección es la puerta. Así la web no
 * le descarga a nadie una rejilla de fotos que no ha pedido.
 */
@Component({
  selector: 'np-galeria-llamada',
  imports: [RouterLink, TranslocoDirective, NpIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <a class="gl-ll" routerLink="/galeria">
        <np-icon name="images" weight="fill" />
        <span class="gl-ll__que">
          <strong>{{ t('publico.galeriaLlamada.titulo') }}</strong>
          <small>{{ t('publico.galeriaLlamada.ayuda') }}</small>
        </span>
        <np-icon class="gl-ll__flecha" name="caret-right" />
      </a>
    </ng-container>
  `,
  styles: `
    :host {
      display: block;
    }
    .gl-ll {
      display: flex;
      align-items: center;
      gap: 0.9rem;
      padding: 1rem;
      border: 1px solid currentColor;
      border-radius: 1rem;
      color: inherit;
      text-decoration: none;
    }
    .gl-ll__que {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: 0.15rem;
    }
    .gl-ll__que small {
      opacity: 0.8;
    }
    .gl-ll__flecha {
      flex: none;
      opacity: 0.6;
    }
  `,
})
export class NpGaleriaLlamada {}
