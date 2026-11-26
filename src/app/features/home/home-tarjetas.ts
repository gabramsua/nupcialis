import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { NpIcon } from '../../design-system/icons/icon';
import type { NpIconName } from '../../design-system/icons/icon-name.generated';
import type { ItemHome } from './home';
import { NpHomeCabecera } from './home-cabecera';

/**
 * Una rejilla de tarjetas con icono. Sirve para dos secciones:
 *
 * - **promesa**: tres tarjetas grandes, lo que Nupcialis hace por vosotros.
 * - **libertad**: hasta ocho tarjetas compactas y una frase de cierre. Es la
 *   sección que dice que los novios son los dueños de su boda.
 */
@Component({
  selector: 'np-home-tarjetas',
  imports: [NpIcon, NpHomeCabecera],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="ht" [class.ht--compacta]="variante() === 'libertad'" [id]="ancla()">
      <np-home-cabecera [titulo]="titulo()" [intro]="intro()" [etiqueta]="etiqueta()" />

      <ul class="ht__lista" [style.--ht-cols]="columnas()">
        @for (item of items(); track $index) {
          <li class="ht__item">
            <span class="ht__icono"><np-icon [name]="icono(item.icon)" weight="fill" /></span>
            <h3 class="ht__titulo">{{ item.title }}</h3>
            @if (item.text) {
              <p class="ht__texto">{{ item.text }}</p>
            }
          </li>
        }
      </ul>

      @if (cierre()) {
        <p class="ht__cierre">{{ cierre() }}</p>
      }
    </section>
  `,
  styles: `
    :host {
      display: block;
    }
    .ht {
      max-inline-size: 72rem;
      margin-inline: auto;
      padding: clamp(3.5rem, 9cqi, 6.5rem) 1.25rem;
    }
    .ht__lista {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 15rem), 1fr));
      gap: 1.1rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .ht__item {
      display: grid;
      align-content: start;
      gap: 0.6rem;
      padding: clamp(1.4rem, 3cqi, 2rem);
      border: var(--h-borde);
      border-radius: var(--h-radio);
      background: var(--h-surface);
      box-shadow: var(--h-sombra);
    }
    .ht__icono {
      display: grid;
      place-items: center;
      inline-size: 3rem;
      block-size: 3rem;
      margin-block-end: 0.4rem;
      border-radius: 50%;
      background: color-mix(in srgb, var(--h-accent) 16%, transparent);
      color: var(--h-accent);
      font-size: 1.5rem;
    }
    .ht__titulo {
      margin: 0;
      font-family: var(--h-font-title);
      font-size: 1.45rem;
      font-weight: 600;
      line-height: 1.2;
    }
    .ht__texto {
      margin: 0;
      color: var(--h-muted);
      line-height: 1.55;
    }
    .ht--compacta .ht__lista {
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 13rem), 1fr));
    }
    .ht--compacta .ht__item {
      padding: 1.25rem;
    }
    .ht--compacta .ht__icono {
      inline-size: 2.5rem;
      block-size: 2.5rem;
      font-size: 1.25rem;
    }
    .ht--compacta .ht__titulo {
      font-size: 1.2rem;
    }
    .ht__cierre {
      margin: clamp(2rem, 6cqi, 3.5rem) 0 0;
      font-family: var(--h-font-title);
      font-size: clamp(1.4rem, 3.4cqi, 2.1rem);
      font-style: italic;
      text-align: center;
      text-wrap: balance;
    }
    @container home (min-width: 56rem) {
      .ht:not(.ht--compacta) .ht__lista {
        grid-template-columns: repeat(3, 1fr);
      }
      /* Seis tarjetas en 3+3, ocho en 4+4: nunca cinco y una huérfana. */
      .ht--compacta .ht__lista {
        grid-template-columns: repeat(var(--ht-cols, 4), 1fr);
      }
    }
  `,
})
export class NpHomeTarjetas {
  readonly variante = input<'promesa' | 'libertad'>('promesa');
  readonly titulo = input.required<string>();
  readonly intro = input('');
  readonly etiqueta = input('');
  readonly items = input.required<readonly ItemHome[]>();
  readonly cierre = input('');
  readonly ancla = input<string | null>(null);

  /** Columnas anchas que reparten sin huérfanas: 3 si caben a tres, 4 si a cuatro. */
  protected readonly columnas = computed(() => {
    const n = this.items().length;
    return n % 4 === 0 ? 4 : n % 3 === 0 ? 3 : n > 4 ? 4 : Math.max(n, 1);
  });

  /** Los nombres ya se validaron al sanear; aquí solo se le da tipo. */
  protected icono(nombre: string): NpIconName {
    return nombre as NpIconName;
  }
}
