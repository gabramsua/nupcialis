import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { TranslocoDirective } from '@jsverse/transloco';

import { NpIcon } from '../../../../design-system/icons/icon';
import { cuentaAtras, type DatosPortada } from '../portada';

/**
 * Plantilla «Clásica»: papel claro, serifa y mucho aire.
 *
 * Los colores se escriben como `var(--np-marca-*, <reserva>)`: si la pareja ha
 * elegido su paleta, la envoltura pública la pone en el host y manda; si no,
 * manda la reserva de esta plantilla. Así una boda recién creada ya se ve bien
 * sin que nadie haya tocado un selector de color.
 */
@Component({
  selector: 'np-plantilla-clasica',
  imports: [DatePipe, TranslocoDirective, NpIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <main class="clasica">
        <div class="clasica__texto">
          <p class="clasica__antetitulo">
            <np-icon name="diamond" weight="fill" />
            {{ t('publico.nosCasamos') }}
          </p>

          <h1 class="clasica__nombres">
            <span>{{ datos().nombres.partnerA }}</span>
            <span class="clasica__amperson">&amp;</span>
            <span>{{ datos().nombres.partnerB }}</span>
          </h1>

          @if (datos().weddingDate; as fecha) {
            <p class="clasica__fecha">
              <np-icon name="calendar" />
              {{ fecha | date: 'fullDate' : undefined : datos().locale }}
            </p>
          }

          @if (faltan(); as restante) {
            <div class="clasica__cuenta">
              <div class="clasica__casilla">
                <span class="clasica__numero">{{ restante.dias }}</span>
                <span class="clasica__unidad">{{ t('publico.dias') }}</span>
              </div>
              <div class="clasica__casilla">
                <span class="clasica__numero">{{ restante.horas }}</span>
                <span class="clasica__unidad">{{ t('publico.horas') }}</span>
              </div>
              <div class="clasica__casilla">
                <span class="clasica__numero">{{ restante.minutos }}</span>
                <span class="clasica__unidad">{{ t('publico.minutos') }}</span>
              </div>
            </div>
          }
        </div>
      </main>
    </ng-container>
  `,
  styles: `
    :host {
      display: block;
      /* Reservas de la plantilla. La paleta de la pareja las pisa si existe. */
      --fondo: var(--np-marca-background, #faf8f6);
      --texto: var(--np-marca-text, #241f1c);
      --acento: var(--np-marca-accent, #e54d69);
      --superficie: var(--np-marca-surface, #ffffff);
      --borde: color-mix(in srgb, var(--texto) 12%, transparent);
      --serifa: 'Cormorant Garamond', georgia, 'Times New Roman', serif;
      --palo: 'Karla', system-ui, sans-serif;
    }
    .clasica {
      display: grid;
      place-content: center;
      min-block-size: 100dvh;
      padding: var(--np-space-6) var(--np-space-5);
      background: var(--fondo);
      color: var(--texto);
      font-family: var(--palo);
      text-align: center;
    }
    .clasica__texto {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--np-space-5);
    }
    .clasica__antetitulo {
      display: flex;
      align-items: center;
      gap: var(--np-space-2);
      margin: 0;
      font-size: var(--np-text-xs);
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: color-mix(in srgb, var(--texto) 65%, transparent);
    }
    .clasica__antetitulo np-icon {
      color: var(--acento);
      --np-icon-size: 1em;
    }
    .clasica__nombres {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-1);
      margin: 0;
      font-family: var(--serifa);
      font-size: clamp(3rem, 2rem + 7vw, 6rem);
      font-weight: 400;
      line-height: 0.95;
      text-wrap: balance;
    }
    .clasica__amperson {
      font-style: italic;
      color: var(--acento);
    }
    .clasica__fecha {
      display: flex;
      align-items: center;
      gap: var(--np-space-2);
      margin: 0;
      font-size: var(--np-text-lg);
      color: color-mix(in srgb, var(--texto) 70%, transparent);
    }
    .clasica__fecha np-icon {
      --np-icon-size: 1.1em;
    }
    .clasica__cuenta {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: var(--np-space-3);
    }
    .clasica__casilla {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--np-space-1);
      min-inline-size: 5.5rem;
      padding: var(--np-space-3) var(--np-space-4);
      border: 1px solid var(--borde);
      border-radius: var(--np-radius-lg);
      background: var(--superficie);
    }
    .clasica__numero {
      font-family: var(--serifa);
      font-size: var(--np-text-2xl);
      line-height: 1;
    }
    .clasica__unidad {
      font-size: var(--np-text-xs);
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: color-mix(in srgb, var(--texto) 60%, transparent);
    }
  `,
})
export class PlantillaClasica {
  readonly datos = input.required<DatosPortada>();

  /**
   * Se calcula una vez al montar, no con un temporizador.
   *
   * Un contador que baja cada segundo obliga a repintar la portada sin parar y
   * no aporta nada: nadie se queda mirando cuántos minutos faltan para una boda
   * que es dentro de nueve meses.
   */
  protected readonly faltan = computed(() => cuentaAtras(this.datos().weddingDate, new Date()));
}
