import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  viewChild,
} from '@angular/core';

import { NpIcon } from '../../design-system/icons/icon';
import type { EscaparateHome } from './home';
import { NpHomeCabecera } from './home-cabecera';

/**
 * Lo que verán los invitados: el producto se vende tanto por el panel como por
 * el resultado, y el resultado es lo más bonito que tenemos.
 *
 * Tres piezas, que el superadmin enciende y apaga por separado y de las que
 * elige en qué pantallas se ven (todas, solo móvil o solo escritorio):
 *
 * - **Mosaico**: una sola imagen con las plantillas juntas. Se lee de un
 *   vistazo, pero en un móvil estrecho queda pequeña.
 * - **Diseño**: debajo del mosaico, la pantalla «Diseño» del panel con las
 *   plantillas y las paletas, tal como las elegirán los novios.
 * - **Carrusel**: una captura de móvil por plantilla, para recorrerlas (por
 *   scroll táctil o con las flechas). Es la forma natural en un móvil.
 *
 * De fábrica el mosaico solo sale en pantallas anchas: en una estrecha queda
 * pequeño y el carrusel cuenta lo mismo.
 */
@Component({
  selector: 'np-home-escaparate',
  imports: [NpIcon, NpHomeCabecera],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="he" id="plantillas">
      <np-home-cabecera [titulo]="titulo()" [intro]="intro()" />

      @if (conMosaico()) {
        <div class="he__mosaico" [class]="'he--' + escaparate().mosaic.show">
          @if (escaparate().mosaic.image; as img) {
            <img [src]="img.url" [alt]="img.alt" loading="lazy" width="1508" height="1572" />
          }
        </div>
      }

      @if (conDiseno()) {
        <figure class="he__diseno" [class]="'he--' + escaparate().design.show">
          @if (escaparate().design.image; as img) {
            <img [src]="img.url" [alt]="img.alt" loading="lazy" width="1400" height="1319" />
          }
          @if (escaparate().design.label; as pie) {
            <figcaption>{{ pie }}</figcaption>
          }
        </figure>
      }

      @if (conCarrusel()) {
        <div
          class="he__carrusel"
          [class]="'he--' + escaparate().carousel.show"
          role="region"
          aria-label="Plantillas de la web de boda"
        >
          <button
            type="button"
            class="he__flecha he__flecha--ant"
            aria-label="Plantilla anterior"
            (click)="mover(-1)"
          >
            <np-icon name="caret-left" />
          </button>
          <ul class="he__pista" #pista tabindex="0">
            @for (d of escaparate().carousel.slides; track $index) {
              <li class="he__diapo">
                <figure class="he__movil">
                  <img
                    [src]="d.image.url"
                    [alt]="d.image.alt"
                    loading="lazy"
                    width="585"
                    height="1170"
                  />
                </figure>
                @if (d.label) {
                  <p class="he__etiqueta">{{ d.label }}</p>
                }
              </li>
            }
          </ul>
          <button
            type="button"
            class="he__flecha he__flecha--sig"
            aria-label="Plantilla siguiente"
            (click)="mover(1)"
          >
            <np-icon name="caret-right" />
          </button>
        </div>
      }
    </section>
  `,
  styles: `
    :host {
      display: block;
    }
    .he {
      max-inline-size: 72rem;
      margin-inline: auto;
      padding: clamp(3.5rem, 9cqi, 6.5rem) 1.25rem;
    }
    .he__mosaico {
      display: flex;
      justify-content: center;
      margin-block-end: 2rem;
    }
    .he__mosaico img {
      inline-size: min(100%, 44rem);
      block-size: auto;
    }
    .he__diseno {
      margin: 0 0 2.5rem;
      text-align: center;
    }
    .he__diseno img {
      inline-size: min(100%, 60rem);
      block-size: auto;
      border-radius: 0.9rem;
      box-shadow: var(--h-sombra);
    }
    .he__diseno figcaption {
      margin-block-start: 0.8rem;
      color: var(--h-muted);
      font-size: 0.95rem;
      font-weight: 600;
    }
    .he__carrusel {
      position: relative;
    }
    .he__pista {
      display: flex;
      gap: 1.25rem;
      margin: 0;
      padding: 0.5rem 0.25rem 1rem;
      list-style: none;
      overflow-x: auto;
      scroll-snap-type: x mandatory;
      scroll-padding-inline: 0.25rem;
      scrollbar-width: thin;
    }
    .he__diapo {
      flex: 0 0 min(15rem, 68%);
      scroll-snap-align: center;
      display: grid;
      justify-items: center;
      gap: 0.8rem;
    }
    .he__movil {
      margin: 0;
      padding: 0.45rem;
      border-radius: 2rem;
      background: #17151a;
      box-shadow: var(--h-sombra);
    }
    .he__movil img {
      display: block;
      inline-size: 100%;
      block-size: auto;
      border-radius: 1.6rem;
    }
    .he__etiqueta {
      margin: 0;
      color: var(--h-muted);
      font-size: 0.95rem;
      font-weight: 600;
      text-align: center;
    }
    .he__flecha {
      display: none;
      position: absolute;
      inset-block-start: 40%;
      z-index: 1;
      inline-size: 2.75rem;
      block-size: 2.75rem;
      align-items: center;
      justify-content: center;
      padding: 0;
      border: var(--h-borde);
      border-radius: 50%;
      background: var(--h-surface);
      color: var(--h-text);
      box-shadow: var(--h-sombra);
      cursor: pointer;
    }
    .he__flecha:focus-visible,
    .he__pista:focus-visible {
      outline: 2px solid var(--h-accent);
      outline-offset: 2px;
    }
    .he__flecha--ant {
      inset-inline-start: -0.5rem;
    }
    .he__flecha--sig {
      inset-inline-end: -0.5rem;
    }
    /* Dónde se ve cada pieza: el corte es el de la HOME, una caja de 44 rem. */
    @container home (max-width: 43.99rem) {
      .he--escritorio {
        display: none;
      }
    }
    @container home (min-width: 44rem) {
      .he--movil {
        display: none;
      }
      .he__flecha {
        display: inline-flex;
      }
      .he__diapo {
        flex-basis: 14rem;
      }
    }
    @media (prefers-reduced-motion: no-preference) {
      .he__pista {
        scroll-behavior: smooth;
      }
    }
  `,
})
export class NpHomeEscaparate {
  readonly titulo = input.required<string>();
  readonly intro = input('');
  readonly escaparate = input.required<EscaparateHome>();

  private readonly pista = viewChild<ElementRef<HTMLElement>>('pista');

  protected readonly conMosaico = computed(
    () => this.escaparate().mosaic.enabled && this.escaparate().mosaic.image !== null,
  );
  protected readonly conDiseno = computed(
    () => this.escaparate().design.enabled && this.escaparate().design.image !== null,
  );
  protected readonly conCarrusel = computed(
    () => this.escaparate().carousel.enabled && this.escaparate().carousel.slides.length > 0,
  );

  /** Una diapositiva hacia un lado. */
  protected mover(sentido: -1 | 1): void {
    const pista = this.pista()?.nativeElement;
    if (!pista) return;
    const diapo = pista.querySelector('li');
    const paso = (diapo?.getBoundingClientRect().width ?? 224) + 20;
    pista.scrollBy({ left: sentido * paso });
  }
}
