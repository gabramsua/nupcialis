import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

import { NpIcon } from '../../../design-system/icons/icon';
import { FAQS_PARA_BUSCADOR, agrupadas, filtrarFaqs, type FaqPublica } from './faqs';

/**
 * Las preguntas frecuentes, como las ve el invitado (§8.9).
 *
 * Vive aquí y no dentro de cada plantilla porque el comportamiento es el mismo
 * para las doce del catálogo: agrupar, plegar y, si hay muchas, buscar. Lo que
 * cambia de una plantilla a otra son los colores y la tipografía, y esos los
 * hereda.
 *
 * Plegadas con `<details>`, que es HTML y no JavaScript: funciona antes de que
 * arranque Angular, se abre con el teclado y lo lee un lector de pantalla sin
 * que haya que explicarle nada. El invitado que abre esto está de pie en la
 * calle buscando a qué hora sale el autobús.
 */
@Component({
  selector: 'np-faqs-publicas',
  imports: [TranslocoDirective, NpIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      @if (conBuscador()) {
        <label class="faqs__buscador">
          <np-icon name="magnifying-glass" />
          <input
            type="search"
            [placeholder]="t('publico.faqs.buscar')"
            [value]="busqueda()"
            (input)="buscar($event)"
          />
        </label>
      }

      @if (grupos().length === 0) {
        <p class="faqs__nada">{{ t('publico.faqs.nada') }}</p>
      }

      @for (grupo of grupos(); track grupo.categoria) {
        <section class="faqs__grupo">
          @if (grupo.categoria) {
            <h3>{{ grupo.categoria }}</h3>
          }
          @for (faq of grupo.preguntas; track faq.id) {
            <details>
              <summary>
                <np-icon [name]="faq.icon" />
                <span>{{ faq.question }}</span>
              </summary>
              <!--
                La respuesta llega saneada del servidor (regla de oro 5) y
                Angular la vuelve a sanear al pintarla.
              -->
              <div class="np-rico" [innerHTML]="faq.answer"></div>
            </details>
          }
        </section>
      }
    </ng-container>
  `,
  styles: `
    :host {
      display: block;
    }
    .faqs__buscador {
      display: flex;
      align-items: center;
      gap: var(--np-space-2);
      margin-block-end: var(--np-space-4);
      padding-inline: var(--np-space-3);
      border: 1px solid currentColor;
      border-radius: var(--np-radius-full);
      opacity: 0.85;
    }
    .faqs__buscador input {
      flex: 1;
      min-block-size: var(--np-tap-target);
      border: 0;
      background: transparent;
      color: inherit;
      font: inherit;
    }
    .faqs__buscador input:focus {
      outline: none;
    }
    .faqs__grupo + .faqs__grupo {
      margin-block-start: var(--np-space-5);
    }
    .faqs__grupo h3 {
      margin: 0 0 var(--np-space-2);
      font-size: var(--np-text-sm);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      opacity: 0.7;
    }
    details {
      border-block-end: 1px solid color-mix(in srgb, currentColor 20%, transparent);
    }
    /* Todo el renglón es el área pulsable: en el móvil, acertarle a un
       triángulo de doce píxeles con el pulgar no es razonable. */
    summary {
      display: flex;
      align-items: center;
      gap: var(--np-space-2);
      min-block-size: var(--np-tap-target);
      padding-block: var(--np-space-2);
      cursor: pointer;
      list-style: none;
    }
    summary::-webkit-details-marker {
      display: none;
    }
    summary span {
      flex: 1;
    }
    /* El signo de que se abre y se cierra, con el icono que ya está ahí. */
    summary::after {
      content: '+';
      font-size: 1.25em;
      line-height: 1;
      opacity: 0.6;
    }
    details[open] summary::after {
      content: '–';
    }
    details .np-rico {
      padding-block: 0 var(--np-space-3);
      padding-inline-start: calc(var(--np-space-2) + 1.25em);
      opacity: 0.9;
    }
    .faqs__nada {
      margin: 0;
      opacity: 0.7;
    }
  `,
})
export class NpFaqsPublicas {
  readonly faqs = input.required<readonly FaqPublica[]>();

  protected readonly busqueda = signal('');

  /**
   * El buscador solo aparece cuando hay muchas (§8.9).
   *
   * Con seis preguntas delante, un buscador es un trasto: se leen las seis
   * antes de escribir la primera letra.
   */
  protected readonly conBuscador = computed(() => this.faqs().length > FAQS_PARA_BUSCADOR);

  protected readonly grupos = computed(() => agrupadas(filtrarFaqs(this.faqs(), this.busqueda())));

  protected buscar(evento: Event): void {
    this.busqueda.set((evento.target as HTMLInputElement).value);
  }
}
