import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';

import { NpIcon } from '../../../design-system/icons/icon';

/**
 * La invitación a la playlist, dentro de la web de la boda (§8.14).
 *
 * Es solo la puerta: la lista vive detrás de la identificación del invitado,
 * porque quién ha votado qué no es público.
 */
@Component({
  selector: 'np-playlist-llamada',
  imports: [RouterLink, TranslocoDirective, NpIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <a class="pl-ll" routerLink="/playlist">
        <np-icon name="music-notes" weight="fill" />
        <span class="pl-ll__que">
          <strong>{{ t('publico.playlistLlamada.titulo') }}</strong>
          <small>{{ t('publico.playlistLlamada.ayuda') }}</small>
        </span>
        <np-icon class="pl-ll__flecha" name="caret-right" />
      </a>
    </ng-container>
  `,
  styles: `
    :host {
      display: block;
    }
    .pl-ll {
      display: flex;
      align-items: center;
      gap: 0.9rem;
      padding: 1rem;
      border: 1px solid currentColor;
      border-radius: 1rem;
      color: inherit;
      text-decoration: none;
    }
    .pl-ll__que {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: 0.15rem;
    }
    .pl-ll__que small {
      opacity: 0.8;
    }
    .pl-ll__flecha {
      flex: none;
      opacity: 0.6;
    }
  `,
})
export class NpPlaylistLlamada {}
