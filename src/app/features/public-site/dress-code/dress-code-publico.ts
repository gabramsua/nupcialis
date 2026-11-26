import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

import { NpIcon } from '../../../design-system/icons/icon';
import { DRESS_CODE_VACIO, tieneDressCode, type DressCodePublico } from './dress-code';

/**
 * Cómo vestir, como lo ve el invitado (§8.11).
 *
 * Dos decisiones que vienen de los requisitos y no son negociables:
 *
 * 1. **Cada muestra lleva su nombre escrito.** Un cuadradito verde no comunica
 *    «verde oliva» a nadie, y menos a quien lo mira en un móvil al sol o con
 *    daltonismo. El nombre sale de la lista cerrada del dominio, así que no
 *    hay forma de que una muestra salga sin él.
 * 2. **Lo que hay que evitar se distingue de lo que se sugiere** por algo más
 *    que el sitio donde está: lleva su título, su icono y la muestra tachada.
 *    Equivocarse aquí es presentarse de blanco a una boda.
 *
 * Los avisos prácticos van al final y en grande: «la ceremonia es sobre
 * hierba» cambia los zapatos que se pone alguien mucho más que tres párrafos
 * sobre el estilo.
 */
@Component({
  selector: 'np-dress-code-publico',
  imports: [TranslocoDirective, NpIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      @if (!hayAlgo()) {
        <p class="dc__nada">{{ t('publico.dressCode.pronto') }}</p>
      } @else {
        <div class="dc">
          @if (dress().descripcion) {
            <!--
              Viene saneado del servidor (regla de oro 5): lo que llega aquí ya
              ha pasado por el saneador en la proyección pública.
            -->
            <div class="np-rico dc__texto" [innerHTML]="dress().descripcion"></div>
          }

          @if (dress().sugeridos.length > 0) {
            <section class="dc__paleta">
              <h3>
                <np-icon name="dress" />
                {{ t('publico.dressCode.sugeridos') }}
              </h3>
              <ul>
                @for (color of dress().sugeridos; track color.id) {
                  <li>
                    <span class="dc__muestra" [style.background]="color.hex"></span>
                    {{ color.nombre }}
                  </li>
                }
              </ul>
            </section>
          }

          @if (dress().evitar.length > 0) {
            <section class="dc__paleta dc__paleta--evitar">
              <h3>
                <np-icon name="x-circle" />
                {{ t('publico.dressCode.evitar') }}
              </h3>
              <ul>
                @for (color of dress().evitar; track color.id) {
                  <li>
                    <span class="dc__muestra dc__muestra--evitar" [style.background]="color.hex">
                    </span>
                    {{ color.nombre }}
                  </li>
                }
              </ul>
            </section>
          }

          @if (dress().avisos.length > 0) {
            <ul class="dc__avisos">
              @for (aviso of dress().avisos; track aviso) {
                <li>
                  <np-icon name="warning" />
                  <span>{{ aviso }}</span>
                </li>
              }
            </ul>
          }
        </div>
      }
    </ng-container>
  `,
  styles: `
    .dc {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .dc__nada {
      margin: 0;
      opacity: 0.75;
    }
    .dc__paleta h3 {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      margin: 0 0 0.6rem;
      font-size: 1rem;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .dc__paleta ul {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem 1.2rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .dc__paleta li {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.95rem;
    }
    /* El borde no es decoración: sin él, la muestra de «blanco» desaparece
       sobre el papel claro de la plantilla y queda el nombre solo. */
    .dc__muestra {
      inline-size: 1.4rem;
      block-size: 1.4rem;
      border: 1px solid rgb(0 0 0 / 25%);
      border-radius: 50%;
    }
    /* Tachada: lo que no hay que ponerse se ve que no hay que ponerse sin
       leer el título de la lista. */
    .dc__muestra--evitar {
      position: relative;
      overflow: hidden;
    }
    .dc__muestra--evitar::after {
      position: absolute;
      inset-block-start: 50%;
      inset-inline: -10%;
      border-block-start: 2px solid rgb(255 255 255 / 85%);
      box-shadow: 0 1px 0 rgb(0 0 0 / 45%);
      content: '';
    }
    .dc__avisos {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .dc__avisos li {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      font-size: 0.95rem;
    }
    .dc__avisos np-icon {
      flex: none;
      margin-block-start: 0.1rem;
    }
  `,
})
export class NpDressCodePublico {
  readonly dressCode = input<DressCodePublico | null>(null);

  /**
   * Se vuelve a pasar por el dominio, igual que las otras listas públicas.
   *
   * Lo que llega es una entrada del componente, y la pone quien lo monta:
   * aquí no se da por bueno.
   */
  protected readonly dress = computed<DressCodePublico>(() => this.dressCode() ?? DRESS_CODE_VACIO);

  protected readonly hayAlgo = computed(() => tieneDressCode(this.dress()));
}
