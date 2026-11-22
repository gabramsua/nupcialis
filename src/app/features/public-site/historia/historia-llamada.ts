import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';

import { NpIcon } from '../../../design-system/icons/icon';

/**
 * La puerta a «Nuestra historia», dentro de la web de la boda.
 *
 * La historia vive en su propia página: son cinco apartados con texto y fotos,
 * y no tienen por qué descargarse con la portada que abre un invitado desde el
 * móvil.
 */
@Component({
  selector: 'np-historia-llamada',
  imports: [RouterLink, TranslocoDirective, NpIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <a class="hl" routerLink="/historia">
        <np-icon name="book-open" weight="fill" />
        <span class="hl__que">
          <strong>{{ t('publico.historiaLlamada.titulo') }}</strong>
          <small>{{ t('publico.historiaLlamada.ayuda') }}</small>
        </span>
        <np-icon class="hl__flecha" name="caret-right" />
      </a>
    </ng-container>
  `,
  styles: `
    :host {
      display: block;
    }
    .hl {
      display: flex;
      align-items: center;
      gap: 0.9rem;
      padding: 1rem;
      border: 1px solid currentColor;
      border-radius: 1rem;
      color: inherit;
      text-decoration: none;
    }
    .hl__que {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: 0.15rem;
    }
    .hl__que small {
      opacity: 0.8;
    }
    .hl__flecha {
      flex: none;
      opacity: 0.6;
    }
  `,
})
export class NpHistoriaLlamada {}
