import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';

import { NpIcon } from '../../../design-system/icons/icon';

/**
 * La invitación al libro de firmas, dentro de la web de la boda (§8.15).
 *
 * Es solo la puerta: el libro vive detrás de la identificación del invitado,
 * porque cada firma lleva el nombre de quien la escribió.
 */
@Component({
  selector: 'np-libro-llamada',
  imports: [RouterLink, TranslocoDirective, NpIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <a class="lb-ll" routerLink="/libro">
        <np-icon name="book-open" weight="fill" />
        <span class="lb-ll__que">
          <strong>{{ t('publico.libroLlamada.titulo') }}</strong>
          <small>{{ t('publico.libroLlamada.ayuda') }}</small>
        </span>
        <np-icon class="lb-ll__flecha" name="caret-right" />
      </a>
    </ng-container>
  `,
  styles: `
    :host {
      display: block;
    }
    .lb-ll {
      display: flex;
      align-items: center;
      gap: 0.9rem;
      padding: 1rem;
      border: 1px solid currentColor;
      border-radius: 1rem;
      color: inherit;
      text-decoration: none;
    }
    .lb-ll__que {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: 0.15rem;
    }
    .lb-ll__que small {
      opacity: 0.8;
    }
    .lb-ll__flecha {
      flex: none;
      opacity: 0.6;
    }
  `,
})
export class NpLibroLlamada {}
