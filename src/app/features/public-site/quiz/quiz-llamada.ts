import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';

import { NpIcon } from '../../../design-system/icons/icon';

/**
 * La invitación a jugar, dentro de la web de la boda (§8.7).
 *
 * El juego vive en su propia página —se comparte por WhatsApp durante el
 * banquete— y esta sección es la puerta: un cartel, no el juego. Así la web no
 * descarga el quiz entero a quien solo entra a ver la hora de la ceremonia, que
 * es la mayoría.
 */
@Component({
  selector: 'np-quiz-llamada',
  imports: [RouterLink, TranslocoDirective, NpIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <a class="qz-ll" routerLink="/quiz">
        <np-icon name="game-controller" weight="fill" />
        <span class="qz-ll__que">
          <strong>{{ t('publico.quizLlamada.titulo') }}</strong>
          <small>{{ t('publico.quizLlamada.ayuda') }}</small>
        </span>
        <np-icon class="qz-ll__flecha" name="caret-right" />
      </a>
    </ng-container>
  `,
  styles: `
    :host {
      display: block;
    }
    /* Toda la tarjeta es el enlace: en un móvil se toca donde caiga. */
    .qz-ll {
      display: flex;
      align-items: center;
      gap: 0.9rem;
      padding: 1rem;
      border: 1px solid currentColor;
      border-radius: 1rem;
      color: inherit;
      text-decoration: none;
    }
    .qz-ll__que {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: 0.15rem;
    }
    .qz-ll__que small {
      opacity: 0.8;
    }
    .qz-ll__flecha {
      flex: none;
      opacity: 0.6;
    }
  `,
})
export class NpQuizLlamada {}
