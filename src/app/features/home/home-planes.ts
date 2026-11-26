import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { NpIcon } from '../../design-system/icons/icon';
import type { PlanHome } from './home';
import { NpHomeBoton } from './home-boton';
import { NpHomeCabecera } from './home-cabecera';

/**
 * Los dos planes lado a lado. Sale solo si el superadmin lo enciende: los
 * precios no están decididos (D-02), así que de fábrica va apagada y, aun
 * encendida, el precio solo se enseña si se escribe.
 */
@Component({
  selector: 'np-home-planes',
  imports: [NpIcon, NpHomeBoton, NpHomeCabecera],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="hl" id="planes">
      <np-home-cabecera [titulo]="titulo()" [intro]="intro()" />

      <div class="hl__rejilla">
        @for (plan of planes(); track $index) {
          <article class="hl__plan" [class.hl__plan--fuerte]="$index === 1">
            <h3 class="hl__nombre">{{ plan.name }}</h3>
            <p class="hl__lema">{{ plan.tagline }}</p>
            @if (plan.price) {
              <p class="hl__precio">{{ plan.price }}</p>
            }
            <ul class="hl__lista">
              @for (item of plan.items; track $index) {
                <li><np-icon name="check-circle" weight="fill" />{{ item }}</li>
              }
            </ul>
            @if (plan.cta.label) {
              <np-home-boton
                [enlace]="plan.cta"
                [variante]="$index === 1 ? 'primario' : 'secundario'"
              />
            }
          </article>
        }
      </div>
    </section>
  `,
  styles: `
    :host {
      display: block;
    }
    .hl {
      max-inline-size: 60rem;
      margin-inline: auto;
      padding: clamp(3.5rem, 9cqi, 6.5rem) 1.25rem;
    }
    .hl__rejilla {
      display: grid;
      gap: 1.2rem;
    }
    .hl__plan {
      display: grid;
      align-content: start;
      justify-items: start;
      gap: 0.8rem;
      padding: clamp(1.5rem, 4cqi, 2.2rem);
      border: var(--h-borde);
      border-radius: var(--h-radio);
      background: var(--h-surface);
      box-shadow: var(--h-sombra);
    }
    .hl__plan--fuerte {
      border-color: var(--h-accent);
    }
    .hl__nombre {
      margin: 0;
      font-family: var(--h-font-title);
      font-size: 1.9rem;
      font-weight: 600;
    }
    .hl__lema {
      margin: 0;
      color: var(--h-muted);
    }
    .hl__precio {
      margin: 0;
      font-family: var(--h-font-title);
      font-size: 2.4rem;
      font-weight: 700;
    }
    .hl__lista {
      display: grid;
      gap: 0.55rem;
      margin: 0.4rem 0 0.8rem;
      padding: 0;
      list-style: none;
    }
    .hl__lista li {
      display: flex;
      gap: 0.6rem;
    }
    .hl__lista np-icon {
      margin-block-start: 0.1rem;
      color: var(--h-accent);
    }
    @container home (min-width: 44rem) {
      .hl__rejilla {
        grid-template-columns: 1fr 1fr;
      }
    }
  `,
})
export class NpHomePlanes {
  readonly titulo = input.required<string>();
  readonly intro = input('');
  readonly planes = input.required<readonly PlanHome[]>();
}
