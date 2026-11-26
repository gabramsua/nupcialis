import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * El título y la entradilla de una sección de la HOME.
 *
 * `intro` es HTML que ya salió saneado del servidor; Angular lo vuelve a sanear
 * al pintarlo.
 */
@Component({
  selector: 'np-home-cabecera',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="hc">
      @if (etiqueta()) {
        <p class="hc__etiqueta">{{ etiqueta() }}</p>
      }
      <h2 class="hc__titulo">{{ titulo() }}</h2>
      @if (intro()) {
        <div class="hc__intro" [innerHTML]="intro()"></div>
      }
    </header>
  `,
  styles: `
    :host {
      display: block;
    }
    .hc {
      display: grid;
      gap: 1rem;
      max-inline-size: 46rem;
      margin-inline: auto;
      margin-block-end: clamp(2rem, 6cqi, 3.5rem);
      text-align: center;
    }
    .hc__etiqueta {
      margin: 0;
      color: var(--h-accent);
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0.18em;
      text-transform: uppercase;
    }
    .hc__titulo {
      margin: 0;
      font-family: var(--h-font-title);
      font-size: clamp(1.9rem, 5cqi, 3.1rem);
      font-weight: 600;
      line-height: 1.12;
      text-wrap: balance;
    }
    .hc__intro {
      color: var(--h-muted);
      font-size: clamp(1.02rem, 2cqi, 1.18rem);
      line-height: 1.6;
    }
    .hc__intro ::ng-deep p {
      margin: 0;
    }
  `,
})
export class NpHomeCabecera {
  readonly titulo = input.required<string>();
  readonly intro = input('');
  readonly etiqueta = input('');
}
