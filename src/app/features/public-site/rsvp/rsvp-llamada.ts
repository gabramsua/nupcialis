import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';

import { NpIcon } from '../../../design-system/icons/icon';

/**
 * La puerta al formulario de confirmación, dentro de la web de la boda (D-64).
 *
 * El formulario vive en `/confirmar`, con su propia verificación (nombre y
 * cuatro dígitos): aquí solo hay un cartel que la pareja decide si publica y
 * dónde, igual que los de la galería o los regalos.
 */
@Component({
  selector: 'np-rsvp-llamada',
  imports: [RouterLink, TranslocoDirective, NpIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <a class="rs-ll" routerLink="/confirmar">
        <np-icon name="check-circle" weight="fill" />
        <span class="rs-ll__que">
          <strong>{{ t('publico.confirmar.entrada') }}</strong>
          <small>{{ t('publico.rsvpLlamada.ayuda') }}</small>
        </span>
        <np-icon class="rs-ll__flecha" name="caret-right" />
      </a>
    </ng-container>
  `,
  styles: `
    :host {
      display: block;
    }
    .rs-ll {
      display: flex;
      align-items: center;
      gap: 0.9rem;
      padding: 1rem;
      border: 1px solid currentColor;
      border-radius: 1rem;
      color: inherit;
      text-decoration: none;
    }
    .rs-ll__que {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: 0.15rem;
      text-align: start;
    }
    .rs-ll__que small {
      opacity: 0.8;
    }
    .rs-ll__flecha {
      flex: none;
      opacity: 0.6;
    }
  `,
})
export class NpRsvpLlamada {}
