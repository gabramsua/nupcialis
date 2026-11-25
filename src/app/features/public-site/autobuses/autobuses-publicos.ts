import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

import { NpIcon } from '../../../design-system/icons/icon';
import { sanearAutobuses, type RutaAutobus, type SentidoAutobus } from './autobuses';

/**
 * Los autobuses, como los ve el invitado (D-63).
 *
 * Es información, no una reserva: de dónde sale, a qué hora y adónde va. Las
 * de ida y las de vuelta van en dos bloques con su título —quien sale de la
 * boda a las tres de la madrugada busca «vuelta», no una lista mezclada— y la
 * hora va en grande: es lo que de verdad se mira desde el móvil en la puerta.
 *
 * Salida y destino llevan su palabra delante y no solo una flecha: el color
 * y los iconos no informan por sí solos (§9.1).
 */
@Component({
  selector: 'np-autobuses-publicos',
  imports: [TranslocoDirective, NpIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      @if (rutas().length === 0) {
        <p class="bus__nada">{{ t('publico.autobuses.pronto') }}</p>
      } @else {
        @for (grupo of grupos(); track grupo.sentido) {
          <section class="bus__grupo">
            <h3 class="bus__titulo">
              <np-icon name="bus" />
              {{ t('publico.autobuses.' + grupo.sentido) }}
            </h3>
            <ul class="bus">
              @for (ruta of grupo.rutas; track ruta.id) {
                <li class="bus__ruta">
                  <p class="bus__hora">
                    <np-icon name="clock" />
                    @if (ruta.hora) {
                      <strong>{{ t('publico.autobuses.hora', { hora: ruta.hora }) }}</strong>
                    } @else {
                      <span>{{ t('publico.autobuses.sinHora') }}</span>
                    }
                  </p>
                  @if (ruta.nombre) {
                    <p class="bus__nombre">{{ ruta.nombre }}</p>
                  }
                  <p class="bus__trayecto">
                    <span>
                      <small>{{ t('publico.autobuses.sale') }}</small>
                      {{ ruta.salida }}
                    </span>
                    <span>
                      <small>{{ t('publico.autobuses.va') }}</small>
                      {{ ruta.destino }}
                    </span>
                  </p>
                  @if (ruta.nota) {
                    <p class="bus__nota">{{ ruta.nota }}</p>
                  }
                </li>
              }
            </ul>
          </section>
        }
      }
    </ng-container>
  `,
  styles: `
    :host {
      display: block;
    }
    .bus__grupo + .bus__grupo {
      margin-block-start: var(--np-space-4);
    }
    .bus__titulo {
      display: flex;
      align-items: center;
      gap: var(--np-space-2);
      margin: 0 0 var(--np-space-2);
      font-size: 1rem;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .bus {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-3);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .bus__ruta {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-1);
      padding-block-end: var(--np-space-3);
      border-block-end: 1px solid color-mix(in srgb, currentColor 20%, transparent);
    }
    .bus__ruta p {
      margin: 0;
    }
    .bus__hora {
      display: flex;
      align-items: center;
      gap: var(--np-space-2);
      font-size: 1.25rem;
    }
    .bus__nombre {
      font-weight: var(--np-weight-medium);
    }
    .bus__trayecto {
      display: flex;
      flex-wrap: wrap;
      gap: var(--np-space-1) var(--np-space-4);
    }
    .bus__trayecto span {
      display: flex;
      flex-direction: column;
    }
    .bus__trayecto small {
      font-size: var(--np-text-xs);
      letter-spacing: 0.06em;
      text-transform: uppercase;
      opacity: 0.75;
    }
    .bus__nota {
      font-size: var(--np-text-sm);
      opacity: 0.9;
    }
  `,
})
export class NpAutobusesPublicos {
  readonly autobuses = input<readonly RutaAutobus[] | null>(null);

  /** Se vuelve a sanear aquí, como las demás listas públicas: lo que llega no se da por bueno. */
  protected readonly rutas = computed(() => sanearAutobuses(this.autobuses() ?? []));

  protected readonly grupos = computed(() =>
    (['ida', 'vuelta'] as const satisfies readonly SentidoAutobus[])
      .map((sentido) => ({
        sentido,
        rutas: this.rutas().filter((ruta) => ruta.sentido === sentido),
      }))
      .filter((grupo) => grupo.rutas.length > 0),
  );
}
