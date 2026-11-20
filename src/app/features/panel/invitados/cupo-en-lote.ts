import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

import { NpButton } from '../../../design-system/components/button/button';
import { NpIcon } from '../../../design-system/icons/icon';
import { PUERTA_INVITADOS, type FalloInvitado } from '../../../core/invitados/invitados-gateway';
import { NpInput } from '../../../design-system/components/field/input';

/**
 * El cupo de acompañantes, a todos los que la pareja está viendo (F1.5b).
 *
 * En una boda hay doscientos invitados y el cupo se decide por tandas —«los
 * amigos, uno cada uno; la familia, ninguno»—, así que ponerlo de uno en uno
 * abriendo doscientas fichas es una tarde perdida.
 *
 * Se apoya en los filtros de la lista a propósito: filtrar por un grupo y
 * elegir un número es toda la operación. El botón dice **a cuántos va a
 * afectar antes de pulsarlo**, que es la confirmación que hace falta cuando el
 * cambio es un número pequeño y se deshace poniendo otro.
 *
 * Vive en su propio componente y no dentro de la lista por una razón tonta y
 * real: los estilos de un componente tienen un presupuesto de 4 kB y la lista
 * de invitados ya iba justa.
 */
@Component({
  selector: 'np-cupo-en-lote',
  imports: [TranslocoDirective, NpButton, NpIcon, NpInput],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <details>
        <summary>
          <np-icon name="user-plus" />
          {{ t('panel.invitados.cupo.titulo') }}
        </summary>
        <div class="cupo__cuerpo">
          <label>
            {{ t('panel.invitados.cupo.cuantos') }}
            <select npInput [value]="cupo()" (change)="elegir($event)">
              @for (n of posibles; track n) {
                <option [value]="n">{{ n }}</option>
              }
            </select>
          </label>
          <button npButton size="sm" type="button" [disabled]="poniendo()" (click)="poner()">
            {{ t('panel.invitados.cupo.aplicar', { cupo: cupo(), n: ids().length }) }}
          </button>
          @if (resultado(); as hecho) {
            <p class="cupo__hecho" role="status">
              <np-icon name="check-circle" weight="fill" />
              {{ t('panel.invitados.cupo.hecho', { n: hecho.cambiados }) }}
              @if (hecho.omitidos > 0) {
                {{ t('panel.invitados.cupo.omitidos', { n: hecho.omitidos }) }}
              }
            </p>
          }
          <p class="cupo__aviso">{{ t('panel.invitados.cupo.aviso') }}</p>
        </div>
      </details>
    </ng-container>
  `,
  styles: `
    details {
      display: block;
      margin-block-end: var(--np-space-3);
      padding: var(--np-space-2) var(--np-space-3);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-md);
      background: var(--np-surface-surface);
      font-size: var(--np-text-sm);
    }
    summary {
      display: flex;
      align-items: center;
      gap: var(--np-space-1);
      cursor: pointer;
    }
    .cupo__cuerpo {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--np-space-2);
      margin-block-start: var(--np-space-3);
    }
    label {
      display: inline-flex;
      align-items: center;
      gap: var(--np-space-2);
    }
    .cupo__hecho {
      display: inline-flex;
      align-items: center;
      gap: var(--np-space-1);
      margin: 0;
      color: var(--np-confirmed-fg);
    }
    .cupo__aviso {
      flex-basis: 100%;
      margin: 0;
      color: var(--np-surface-text-muted);
    }
  `,
})
export class NpCupoEnLote {
  /** A quién se le va a poner: los que se están viendo, sin acompañantes. */
  readonly ids = input.required<readonly string[]>();

  readonly hecho = output<void>();
  readonly fallo = output<FalloInvitado>();

  private readonly puerta = inject(PUERTA_INVITADOS);

  /** Más de cinco acompañantes por invitado no se ha visto en una boda. */
  protected readonly posibles = [0, 1, 2, 3, 4, 5];

  protected readonly cupo = signal(1);
  protected readonly poniendo = signal(false);
  protected readonly resultado = signal<{ cambiados: number; omitidos: number } | null>(null);

  protected elegir(evento: Event): void {
    this.cupo.set(Number((evento.target as HTMLSelectElement).value));
    this.resultado.set(null);
  }

  protected async poner(): Promise<void> {
    if (this.poniendo()) return;

    const ids = this.ids();
    if (ids.length === 0) return;

    this.poniendo.set(true);
    this.resultado.set(null);

    const resultado = await this.puerta.cupoEnLote(ids, this.cupo());
    this.poniendo.set(false);

    if (!resultado.ok) {
      this.fallo.emit(resultado.fallo);
      return;
    }

    this.resultado.set({ cambiados: resultado.cambiados, omitidos: resultado.omitidos });
    this.hecho.emit();
  }
}
