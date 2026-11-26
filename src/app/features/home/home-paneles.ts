import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { NpIcon } from '../../design-system/icons/icon';
import type { PanelHome } from './home';
import { NpHomeCabecera } from './home-cabecera';

/**
 * Los dos paneles: lo que ven los novios del plan básico y del extendido.
 *
 * Cada uno lleva una captura real del panel dentro de una ventana de
 * navegador. Es la sección que enseña el producto de verdad: la sencillez del
 * básico frente a todo lo que cabe en el extendido.
 */
@Component({
  selector: 'np-home-paneles',
  imports: [NpIcon, NpHomeCabecera],
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

            @if (panel.image; as img) {
              <figure class="hn__ventana">
                <div class="hn__barra" aria-hidden="true"><i></i><i></i><i></i></div>
                <img [src]="img.url" [alt]="img.alt" loading="lazy" width="1680" height="1144" />
              </figure>
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
      display: grid;
      align-content: start;
      gap: 0.9rem;
      overflow: hidden;
      padding: clamp(1.5rem, 4cqi, 2.4rem) clamp(1.5rem, 4cqi, 2.4rem) 0;
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
      justify-self: start;
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
    /* La captura va dentro de una ventana de navegador que sale por abajo. */
    .hn__ventana {
      margin: 0.8rem 0 0;
      overflow: hidden;
      border: 1px solid color-mix(in srgb, var(--h-text) 18%, transparent);
      border-block-end: 0;
      border-radius: 0.7rem 0.7rem 0 0;
      background: var(--h-bg);
      box-shadow: 0 -4px 30px color-mix(in srgb, var(--h-text) 10%, transparent);
    }
    .hn__barra {
      display: flex;
      gap: 0.35rem;
      padding: 0.55rem 0.8rem;
      border-block-end: 1px solid color-mix(in srgb, var(--h-text) 12%, transparent);
      background: color-mix(in srgb, var(--h-text) 6%, var(--h-surface));
    }
    .hn__barra i {
      inline-size: 0.6rem;
      block-size: 0.6rem;
      border-radius: 50%;
      background: color-mix(in srgb, var(--h-text) 25%, transparent);
    }
    .hn__ventana img {
      display: block;
      inline-size: 100%;
      block-size: auto;
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
