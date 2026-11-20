import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

import type { Grupo } from '../../../core/invitados/grupos-gateway';
import { NpGrupoChip } from './grupo-chip';

export interface GrupoParaFiltrar {
  readonly grupo: Grupo;
  /** Cuántos hay **dentro de lo que ya está filtrado arriba**. */
  readonly cuantos: number;
}

/**
 * Los grupos, como filtro de la lista de invitados (F1.3b).
 *
 * Con doscientos invitados, la lista entera no sirve para nada concreto: lo
 * que se mira es «los primos», «los del trabajo». Se cruza con la cifra de la
 * cabecera en vez de sustituirla, porque «sin contestar» + «Primos» es la
 * lista con la que la pareja se pone a llamar por teléfono.
 *
 * El número de cada chip lo calcula quien lo usa, ya filtrado: si no, con
 * «pendientes» puesto se vería «Pádel 40», al pulsarlo saldrían seis, y no
 * habría forma de saber cuál de los dos números miente.
 */
@Component({
  selector: 'np-filtro-grupos',
  imports: [TranslocoDirective, NpGrupoChip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <div class="filtro" role="group" [attr.aria-label]="t('panel.invitados.porGrupo')">
        @for (cual of grupos(); track cual.grupo.id) {
          <button
            type="button"
            [class.filtro__puesto]="elegido() === cual.grupo.id"
            [attr.aria-pressed]="elegido() === cual.grupo.id"
            (click)="elige.emit(cual.grupo.id)"
          >
            <np-grupo-chip
              [grupo]="cual.grupo"
              [etiquetaRestringido]="t('panel.grupos.restringido')"
            />
            <span class="filtro__cuantos">{{ cual.cuantos }}</span>
          </button>
        }
      </div>
    </ng-container>
  `,
  styles: `
    /* Primero móvil: los grupos se envuelven en vez de salirse a la derecha,
       porque un carrusel horizontal esconde la mitad de los grupos. */
    .filtro {
      display: flex;
      flex-wrap: wrap;
      gap: var(--np-space-2);
      margin-block-end: var(--np-space-3);
    }
    button {
      display: inline-flex;
      align-items: center;
      gap: var(--np-space-1);
      padding: 0;
      border: 0;
      border-radius: var(--np-radius-full);
      background: transparent;
      font: inherit;
      cursor: pointer;
    }
    /* El elegido no se marca solo con color: se marca con un aro que se ve
       igual en blanco y negro, y el chip sigue llevando su nombre. */
    .filtro__puesto {
      outline: 2px solid var(--np-surface-text);
      outline-offset: 2px;
    }
    .filtro__cuantos {
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-xs);
      font-variant-numeric: tabular-nums;
    }
  `,
})
export class NpFiltroGrupos {
  readonly grupos = input.required<readonly GrupoParaFiltrar[]>();
  readonly elegido = input<string | null>(null);
  readonly elige = output<string>();
}
