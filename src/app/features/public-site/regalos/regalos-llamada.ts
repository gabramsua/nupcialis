import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';

import { NpIcon } from '../../../design-system/icons/icon';

/**
 * La invitación a la página de regalos, dentro de la web de la boda (§8.8).
 *
 * Aquí **no** va el número de cuenta, y no es por diseño: la web pública la lee
 * cualquiera que sepa el slug, y un IBAN con su titular ahí dentro es lo que
 * necesita un tercero para montar la misma web y cobrar él. El dato vive
 * detrás de la identificación del invitado; esto es solo la puerta.
 */
@Component({
  selector: 'np-regalos-llamada',
  imports: [RouterLink, TranslocoDirective, NpIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <a class="rg-ll" routerLink="/regalos">
        <np-icon name="gift" weight="fill" />
        <span class="rg-ll__que">
          <strong>{{ t('publico.regalosLlamada.titulo') }}</strong>
          <small>{{ t('publico.regalosLlamada.ayuda') }}</small>
        </span>
        <np-icon class="rg-ll__flecha" name="caret-right" />
      </a>
    </ng-container>
  `,
  styles: `
    :host {
      display: block;
    }
    .rg-ll {
      display: flex;
      align-items: center;
      gap: 0.9rem;
      padding: 1rem;
      border: 1px solid currentColor;
      border-radius: 1rem;
      color: inherit;
      text-decoration: none;
    }
    .rg-ll__que {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: 0.15rem;
    }
    .rg-ll__que small {
      opacity: 0.8;
    }
    .rg-ll__flecha {
      flex: none;
      opacity: 0.6;
    }
  `,
})
export class NpRegalosLlamada {}
