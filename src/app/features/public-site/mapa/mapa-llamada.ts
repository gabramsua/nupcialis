import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';

import { NpIcon } from '../../../design-system/icons/icon';

/**
 * La invitación al mapa, dentro de la web de la boda (§8.6).
 *
 * El mapa vive en su propia página porque **Leaflet pesa** y la portada la abre
 * cualquiera desde el móvil: aquí solo hay una puerta, y la librería se
 * descarga cuando alguien entra por ella.
 */
@Component({
  selector: 'np-mapa-llamada',
  imports: [RouterLink, TranslocoDirective, NpIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <a class="mp-ll" routerLink="/mapa">
        <np-icon name="map-pin" weight="fill" />
        <span class="mp-ll__que">
          <strong>{{ t('publico.mapaLlamada.titulo') }}</strong>
          <small>{{ t('publico.mapaLlamada.ayuda') }}</small>
        </span>
        <np-icon class="mp-ll__flecha" name="caret-right" />
      </a>
    </ng-container>
  `,
  styles: `
    :host {
      display: block;
    }
    .mp-ll {
      display: flex;
      align-items: center;
      gap: 0.9rem;
      padding: 1rem;
      border: 1px solid currentColor;
      border-radius: 1rem;
      color: inherit;
      text-decoration: none;
    }
    .mp-ll__que {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: 0.15rem;
    }
    .mp-ll__que small {
      opacity: 0.8;
    }
    .mp-ll__flecha {
      flex: none;
      opacity: 0.6;
    }
  `,
})
export class NpMapaLlamada {}
