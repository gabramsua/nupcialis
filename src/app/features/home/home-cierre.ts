import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import type { CierreHome, PieHome } from './home';
import { NpHomeBoton } from './home-boton';

/**
 * La última pantalla: la invitación a empezar, y el pie con lo legal.
 *
 * El bloque de cierre es el único con fondo de acento: es donde se decide.
 */
@Component({
  selector: 'np-home-cierre',
  imports: [NpHomeBoton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (cierre().enabled) {
      <section class="hz" id="escribenos">
        <div class="hz__caja">
          <h2 class="hz__titulo">{{ cierre().title }}</h2>
          @if (cierre().text) {
            <div class="hz__texto" [innerHTML]="cierre().text"></div>
          }
          @if (cierre().cta.label) {
            <np-home-boton [enlace]="cierre().cta" />
          }
          @if (cierre().contact) {
            <p class="hz__contacto">{{ cierre().contact }}</p>
          }
        </div>
      </section>
    }

    <footer class="hz__pie">
      <p>{{ pie().text }}</p>
      @if (pie().links.length > 0) {
        <nav aria-label="Información legal">
          @for (e of pie().links; track $index) {
            <a [href]="e.url">{{ e.label }}</a>
          }
        </nav>
      }
    </footer>
  `,
  styles: `
    :host {
      display: block;
    }
    .hz {
      padding: clamp(2rem, 6cqi, 4rem) 1.25rem clamp(3rem, 8cqi, 5.5rem);
    }
    .hz__caja {
      display: grid;
      gap: 1.2rem;
      justify-items: center;
      max-inline-size: 60rem;
      margin-inline: auto;
      padding: clamp(2.4rem, 8cqi, 5rem) clamp(1.4rem, 5cqi, 3rem);
      border-radius: calc(var(--h-radio) * 1.4);
      background:
        radial-gradient(
          40rem 20rem at 100% 0,
          color-mix(in srgb, #fff 18%, transparent),
          transparent 70%
        ),
        var(--h-accent);
      color: var(--h-on-accent);
      text-align: center;
    }
    .hz__titulo {
      margin: 0;
      font-family: var(--h-font-title);
      font-size: clamp(2rem, 5.4cqi, 3.4rem);
      font-weight: 600;
      line-height: 1.1;
      text-wrap: balance;
    }
    .hz__texto {
      max-inline-size: 36rem;
      font-size: 1.12rem;
      line-height: 1.55;
    }
    .hz__texto ::ng-deep p {
      margin: 0;
    }
    /* El botón del cierre se invierte: sobre el acento, el acento no se ve. */
    .hz__caja np-home-boton {
      --h-accent: var(--h-inv-bg);
      --h-on-accent: var(--h-inv-fg);
    }
    .hz__contacto {
      margin: 0;
      font-size: 0.95rem;
      opacity: 0.9;
    }
    .hz__pie {
      display: flex;
      flex-wrap: wrap;
      gap: 0.8rem 1.6rem;
      align-items: center;
      justify-content: space-between;
      max-inline-size: 72rem;
      margin-inline: auto;
      padding: 1.5rem 1.25rem 2.5rem;
      border-block-start: 1px solid color-mix(in srgb, var(--h-text) 14%, transparent);
      color: var(--h-muted);
      font-size: 0.9rem;
    }
    .hz__pie p {
      margin: 0;
    }
    .hz__pie nav {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem 1.2rem;
    }
    .hz__pie a {
      color: inherit;
    }
  `,
})
export class NpHomeCierre {
  readonly cierre = input.required<CierreHome>();
  readonly pie = input.required<PieHome>();
}
