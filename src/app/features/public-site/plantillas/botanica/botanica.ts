import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

import { NpIcon } from '../../../../design-system/icons/icon';
import { fechaLarga } from '../../../../shared/fecha';
import { cuentaAtras, type DatosPortada } from '../portada';

/**
 * Plantilla «Botánica»: portada oscura a sangre, tipografía de mucho contraste.
 *
 * Misma información que la clásica y una impresión completamente distinta. Eso
 * es lo que tiene que dar un catálogo: no cinco variaciones del mismo gris, sino
 * opciones que una pareja reconozca como suyas o como ajenas de un vistazo.
 */
@Component({
  selector: 'np-plantilla-botanica',
  imports: [TranslocoDirective, NpIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <main class="botanica">
        <np-icon name="leaf" class="botanica__hoja" />

        <h1 class="botanica__nombres">
          {{ t('publico.pareja', datos().nombres) }}
        </h1>

        @if (fecha(); as escrita) {
          <p class="botanica__fecha">
            {{ escrita }}
          </p>
        }

        @if (faltan(); as restante) {
          <div class="botanica__cuenta">
            <div class="botanica__casilla">
              <span class="botanica__numero">{{ restante.dias }}</span>
              <span class="botanica__unidad">{{ t('publico.dias') }}</span>
            </div>
            <!--
              Horas y minutos solo si la pareja ha fijado la hora. Sin ella, lo
              que quedaría hasta la medianoche no es lo que queda hasta la boda,
              y enseñarlo sería inventarse una precisión.
            -->
            @if (restante.conHora) {
              <div class="botanica__casilla">
                <span class="botanica__numero">{{ restante.horas }}</span>
                <span class="botanica__unidad">{{ t('publico.horas') }}</span>
              </div>
              <div class="botanica__casilla">
                <span class="botanica__numero">{{ restante.minutos }}</span>
                <span class="botanica__unidad">{{ t('publico.minutos') }}</span>
              </div>
            }
          </div>
        }
      </main>
    </ng-container>
  `,
  styles: `
    :host {
      display: block;
      --fondo: var(--np-marca-background, #1f4436);
      --texto: var(--np-marca-text, #f4f0e8);
      --acento: var(--np-marca-accent, #d9c9a3);
      --serifa: 'DM Serif Display', georgia, 'Times New Roman', serif;
      --palo: 'Jost', system-ui, sans-serif;
    }
    .botanica {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--np-space-5);
      min-block-size: 100dvh;
      padding: var(--np-space-6) var(--np-space-5);
      background: var(--fondo);
      color: var(--texto);
      font-family: var(--palo);
      text-align: center;
    }
    .botanica__hoja {
      --np-icon-size: 2.25rem;
      color: var(--acento);
    }
    .botanica__nombres {
      margin: 0;
      font-family: var(--serifa);
      font-size: clamp(2.75rem, 1.8rem + 6.5vw, 5.5rem);
      font-weight: 400;
      line-height: 1.05;
      letter-spacing: -0.01em;
      text-wrap: balance;
    }
    .botanica__fecha {
      margin: 0;
      font-size: var(--np-text-sm);
      letter-spacing: 0.28em;
      text-transform: uppercase;
      color: color-mix(in srgb, var(--texto) 78%, transparent);
    }
    .botanica__cuenta {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: var(--np-space-6);
      padding-block-start: var(--np-space-5);
      border-block-start: 1px solid color-mix(in srgb, var(--texto) 22%, transparent);
    }
    .botanica__casilla {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--np-space-1);
    }
    .botanica__numero {
      font-family: var(--serifa);
      font-size: var(--np-text-2xl);
      line-height: 1;
    }
    .botanica__unidad {
      font-size: var(--np-text-xs);
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: color-mix(in srgb, var(--texto) 70%, transparent);
    }
  `,
})
export class PlantillaBotanica {
  readonly datos = input.required<DatosPortada>();

  protected readonly fecha = computed(() =>
    fechaLarga(this.datos().weddingDate, this.datos().locale),
  );

  protected readonly faltan = computed(() => cuentaAtras(this.datos(), new Date()));
}
