import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { NpIcon } from '../../design-system/icons/icon';
import type { PanelHome } from './home';
import { NpHomeBoton } from './home-boton';
import { NpHomeCabecera } from './home-cabecera';
import { NpHomeGaleria } from './home-galeria';

/**
 * Los dos planes, cada uno con lo que ven los novios en su panel.
 *
 * Es la sección que enseña el producto **y** lo vende: cada plan lleva su
 * texto, lo que incluye, su cartel de precio con el botón que lleva al
 * formulario, y una galería con flechas de capturas del panel. El precio solo
 * se enseña si se escribe, y la letra pequeña («pago único») es opcional.
 */
@Component({
  selector: 'np-home-paneles',
  imports: [NpIcon, NpHomeBoton, NpHomeCabecera, NpHomeGaleria],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="hn" id="paneles">
      <np-home-cabecera [titulo]="titulo()" [intro]="intro()" />

      <div class="hn__rejilla">
        @for (panel of paneles(); track $index) {
          <article class="hn__panel" [class.hn__panel--fuerte]="$index === 1">
            <p class="hn__etiqueta">{{ panel.label }}</p>
            <h3 class="hn__titulo">{{ panel.title }}</h3>
            <div class="hn__texto" [innerHTML]="panel.text"></div>

            @if (panel.bullets.length > 0) {
              <ul class="hn__vinetas">
                @for (v of panel.bullets; track $index) {
                  <li><np-icon name="check-circle" weight="fill" />{{ v }}</li>
                }
              </ul>
            }

            @if (panel.price || panel.cta.label) {
              <div class="hn__compra">
                @if (panel.price) {
                  <p class="hn__precio">
                    <span class="hn__cifra">{{ panel.price }}</span>
                    @if (panel.priceNote) {
                      <span class="hn__nota">{{ panel.priceNote }}</span>
                    }
                  </p>
                }
                @if (panel.cta.label) {
                  <np-home-boton
                    [enlace]="panel.cta"
                    [variante]="$index === 1 ? 'primario' : 'secundario'"
                  />
                }
              </div>
            }

            @if (panel.shots.length > 0) {
              <np-home-galeria
                class="hn__galeria"
                [capturas]="panel.shots"
                [nombre]="'Capturas del ' + panel.label.toLowerCase()"
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
    .hn {
      max-inline-size: 76rem;
      margin-inline: auto;
      padding: clamp(3.5rem, 9cqi, 6.5rem) 1.25rem;
    }
    .hn__rejilla {
      display: grid;
      gap: 1.4rem;
    }
    .hn__panel {
      display: flex;
      flex-direction: column;
      gap: 0.9rem;
      overflow: hidden;
      padding: clamp(1.5rem, 4cqi, 2.4rem);
      border: var(--h-borde);
      border-radius: var(--h-radio);
      background: var(--h-surface);
      box-shadow: var(--h-sombra);
    }
    .hn__panel--fuerte {
      border-color: var(--h-accent);
      box-shadow:
        var(--h-sombra),
        0 0 0 1px var(--h-accent);
    }
    .hn__etiqueta {
      align-self: flex-start;
      margin: 0;
      padding: 0.3rem 0.8rem;
      border-radius: 999px;
      background: color-mix(in srgb, var(--h-accent) 16%, transparent);
      color: var(--h-accent);
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }
    .hn__titulo {
      margin: 0;
      font-family: var(--h-font-title);
      font-size: clamp(1.6rem, 3.4cqi, 2.2rem);
      font-weight: 600;
      line-height: 1.15;
      text-wrap: balance;
    }
    .hn__texto {
      color: var(--h-muted);
      line-height: 1.6;
    }
    .hn__texto ::ng-deep p {
      margin: 0;
    }
    .hn__vinetas {
      display: grid;
      gap: 0.55rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .hn__vinetas li {
      display: flex;
      gap: 0.6rem;
      align-items: flex-start;
      line-height: 1.4;
    }
    .hn__vinetas np-icon {
      margin-block-start: 0.1rem;
      color: var(--h-accent);
    }
    .hn__compra {
      display: flex;
      flex-wrap: wrap;
      gap: 0.8rem 1.2rem;
      align-items: center;
      margin-block-start: 0.3rem;
    }
    .hn__precio {
      display: inline-flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 0.2rem 0.6rem;
      margin: 0;
      padding: 0.3rem 1rem 0.4rem;
      border: 1px solid var(--h-accent);
      border-radius: var(--h-radio-boton);
      background: var(--h-bg-alt);
    }
    .hn__cifra {
      color: var(--h-accent);
      font-family: var(--h-font-title);
      font-size: 2.4rem;
      font-weight: 700;
      line-height: 1.1;
    }
    .hn__nota {
      color: var(--h-muted);
      font-size: 0.9rem;
      font-weight: 600;
    }
    /* La galería baja hasta el fondo: las dos quedan a la misma altura. */
    .hn__galeria {
      margin-block-start: auto;
    }
    @container home (min-width: 60rem) {
      .hn__rejilla {
        grid-template-columns: 1fr 1fr;
        align-items: stretch;
      }
    }
  `,
})
export class NpHomePaneles {
  readonly titulo = input.required<string>();
  readonly intro = input('');
  readonly paneles = input.required<readonly PanelHome[]>();
}
