import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import type { PasoHome } from './home';
import { NpHomeCabecera } from './home-cabecera';

/** «Así de fácil»: los pasos, numerados, en una línea que los une. */
@Component({
  selector: 'np-home-pasos',
  imports: [NpHomeCabecera],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="hp" id="como-funciona">
      <div class="hp__in">
        <np-home-cabecera [titulo]="titulo()" [intro]="intro()" />
        <ol class="hp__lista" [style.--h-pasos]="items().length">
          @for (paso of items(); track $index) {
            <li class="hp__paso">
              <span class="hp__num">{{ $index + 1 }}</span>
              <div>
                <h3 class="hp__titulo">{{ paso.title }}</h3>
                @if (paso.text) {
                  <p class="hp__texto">{{ paso.text }}</p>
                }
              </div>
            </li>
          }
        </ol>
      </div>
    </section>
  `,
  styles: `
    :host {
      display: block;
    }
    .hp {
      padding: clamp(3.5rem, 9cqi, 6.5rem) 1.25rem;
      background: var(--h-bg-alt);
    }
    .hp__in {
      max-inline-size: 60rem;
      margin-inline: auto;
    }
    .hp__lista {
      position: relative;
      display: grid;
      gap: 1.6rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    /* La línea que une los números: pasa por detrás de ellos. */
    .hp__lista::before {
      content: '';
      position: absolute;
      inset-block: 1.4rem;
      inset-inline-start: 1.4rem;
      inline-size: 2px;
      background: color-mix(in srgb, var(--h-accent) 40%, transparent);
    }
    .hp__paso {
      position: relative;
      display: grid;
      grid-template-columns: 2.9rem 1fr;
      gap: 1.2rem;
      align-items: start;
    }
    .hp__num {
      display: grid;
      place-items: center;
      inline-size: 2.9rem;
      block-size: 2.9rem;
      border-radius: 50%;
      background: var(--h-accent);
      color: var(--h-on-accent);
      font-family: var(--h-font-title);
      font-size: 1.3rem;
      font-weight: 700;
    }
    .hp__titulo {
      margin: 0.3rem 0 0.25rem;
      font-family: var(--h-font-title);
      font-size: 1.4rem;
      font-weight: 600;
    }
    .hp__texto {
      margin: 0;
      color: var(--h-muted);
      line-height: 1.55;
    }
    @container home (min-width: 56rem) {
      .hp__lista {
        grid-template-columns: repeat(var(--h-pasos, 4), 1fr);
        gap: 1.5rem;
      }
      .hp__lista::before {
        inset-block: 1.4rem auto;
        inset-inline: 1.4rem 1.4rem;
        inline-size: auto;
        block-size: 2px;
      }
      .hp__paso {
        grid-template-columns: 1fr;
        gap: 1rem;
      }
    }
  `,
})
export class NpHomePasos {
  readonly titulo = input.required<string>();
  readonly intro = input('');
  readonly items = input.required<readonly PasoHome[]>();
}
