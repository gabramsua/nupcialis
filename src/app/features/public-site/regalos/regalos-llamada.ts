import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';

import { NpIcon } from '../../../design-system/icons/icon';
import { PUERTA_REGALOS_ABIERTOS } from '../../../core/regalos/regalos-abiertos-gateway';
import { NpRegalosDirecto } from './regalos-directo';

/**
 * Los regalos, dentro de la web de la boda (§8.8).
 *
 * **Con página propia** (plan extendido): esto es solo la puerta. El número de
 * cuenta no viaja en la proyección pública —la lee cualquiera que sepa el slug—
 * y vive detrás de la identificación del invitado.
 *
 * **Directo** (plan básico, D-66): no hay lista de invitados que comprobar, así
 * que los regalos se pintan aquí mismo, sin pantalla aparte ni identificarse
 * (`np-regalos-directo`). Si no hay con qué pedirlos —la vista previa del
 * panel— se vuelve a la puerta.
 */
@Component({
  selector: 'np-regalos-llamada',
  imports: [RouterLink, TranslocoDirective, NpIcon, NpRegalosDirecto],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      @if (enLinea()) {
        <np-regalos-directo [slug]="slug()" />
      } @else {
        <a class="rg-ll" routerLink="/regalos">
          <np-icon name="gift" weight="fill" />
          <span class="rg-ll__que">
            <strong>{{ t('publico.regalosLlamada.titulo') }}</strong>
            <small>{{ t('publico.regalosLlamada.ayuda') }}</small>
          </span>
          <np-icon class="rg-ll__flecha" name="caret-right" />
        </a>
      }
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
export class NpRegalosLlamada {
  /** Plan básico: los regalos se pintan aquí y no en otra pantalla (D-66). */
  readonly directo = input(false);
  readonly slug = input('');

  private readonly hayPuerta = inject(PUERTA_REGALOS_ABIERTOS, { optional: true }) !== null;

  protected readonly enLinea = computed(
    () => this.directo() && this.hayPuerta && this.slug() !== '',
  );
}
