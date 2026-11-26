import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

import { NpIcon } from '../../design-system/icons/icon';
import type { DiapositivaHome } from './home';

/**
 * La galería de capturas de un plan: una pantalla del panel dentro de una
 * ventana de navegador, con flechas para pasar a la anterior y a la siguiente,
 * un contador («2 / 4») y el nombre de la pantalla debajo. Se maneja con el
 * ratón, con el dedo y con el teclado (flechas izquierda y derecha cuando tiene
 * el foco).
 *
 * Da la vuelta: tras la última vuelve a la primera.
 */
@Component({
  selector: 'np-home-galeria',
  imports: [NpIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (actual(); as captura) {
      <div
        class="hq"
        role="group"
        aria-roledescription="galería"
        [attr.aria-label]="nombre()"
        tabindex="0"
        (keydown.arrowleft)="mover(-1)"
        (keydown.arrowright)="mover(1)"
      >
        <figure class="hq__ventana">
          <div class="hq__barra" aria-hidden="true"><i></i><i></i><i></i></div>
          <div class="hq__visor">
            <img
              [src]="captura.image.url"
              [alt]="captura.image.alt"
              width="1400"
              height="916"
              loading="lazy"
            />
            @if (total() > 1) {
              <button
                type="button"
                class="hq__flecha hq__flecha--ant"
                aria-label="Captura anterior"
                (click)="mover(-1)"
              >
                <np-icon name="caret-left" />
              </button>
              <button
                type="button"
                class="hq__flecha hq__flecha--sig"
                aria-label="Captura siguiente"
                (click)="mover(1)"
              >
                <np-icon name="caret-right" />
              </button>
              <span class="hq__cuenta" aria-hidden="true">{{ indice() + 1 }} / {{ total() }}</span>
            }
          </div>
        </figure>
        <p class="hq__etiqueta" aria-live="polite">
          @if (captura.label) {
            {{ captura.label }}
          }
          @if (total() > 1) {
            <span class="hq__oculto">({{ indice() + 1 }} de {{ total() }})</span>
          }
        </p>
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .hq {
      margin-block-start: 0.8rem;
      border-radius: 0.8rem;
    }
    .hq:focus-visible {
      outline: 2px solid var(--h-accent);
      outline-offset: 3px;
    }
    .hq__ventana {
      position: relative;
      margin: 0;
      overflow: hidden;
      border: 1px solid color-mix(in srgb, var(--h-text) 18%, transparent);
      border-radius: 0.7rem;
      background: var(--h-bg);
      box-shadow: 0 6px 30px color-mix(in srgb, var(--h-text) 12%, transparent);
    }
    .hq__barra {
      display: flex;
      gap: 0.35rem;
      padding: 0.55rem 0.8rem;
      border-block-end: 1px solid color-mix(in srgb, var(--h-text) 12%, transparent);
      background: color-mix(in srgb, var(--h-text) 6%, var(--h-surface));
    }
    .hq__barra i {
      inline-size: 0.6rem;
      block-size: 0.6rem;
      border-radius: 50%;
      background: color-mix(in srgb, var(--h-text) 25%, transparent);
    }
    .hq__visor {
      position: relative;
      aspect-ratio: 1400 / 916;
      background: var(--h-bg-alt);
    }
    .hq__visor img {
      display: block;
      inline-size: 100%;
      block-size: 100%;
      object-fit: cover;
    }
    .hq__flecha {
      position: absolute;
      inset-block-start: 50%;
      display: grid;
      place-items: center;
      inline-size: 2.6rem;
      block-size: 2.6rem;
      padding: 0;
      transform: translateY(-50%);
      border: 0;
      border-radius: 50%;
      background: rgb(255 255 255 / 0.92);
      color: #231f20;
      box-shadow: 0 2px 10px rgb(0 0 0 / 0.28);
      cursor: pointer;
    }
    .hq__flecha:hover {
      background: #fff;
    }
    .hq__flecha:focus-visible {
      outline: 3px solid var(--h-accent);
      outline-offset: 2px;
    }
    .hq__flecha--ant {
      inset-inline-start: 0.6rem;
    }
    .hq__flecha--sig {
      inset-inline-end: 0.6rem;
    }
    .hq__cuenta {
      position: absolute;
      inset-inline-end: 0.6rem;
      inset-block-end: 0.6rem;
      padding: 0.15rem 0.7rem;
      border-radius: 999px;
      background: rgb(30 25 28 / 0.78);
      color: #fff;
      font-size: 0.8rem;
      font-weight: 600;
    }
    .hq__etiqueta {
      margin: 0.6rem 0 0.2rem;
      color: var(--h-muted);
      font-size: 0.95rem;
      font-weight: 600;
      text-align: center;
    }
    .hq__oculto {
      position: absolute;
      inline-size: 1px;
      block-size: 1px;
      overflow: hidden;
      clip-path: inset(50%);
    }
  `,
})
export class NpHomeGaleria {
  readonly capturas = input.required<readonly DiapositivaHome[]>();
  /** Para qué plan es: lo lee el lector de pantalla («Capturas del plan básico»). */
  readonly nombre = input('Capturas del panel');

  private readonly posicion = signal(0);
  protected readonly total = computed(() => this.capturas().length);
  /** Si el editor quita capturas, la posición se queda en la última que quede. */
  protected readonly indice = computed(() => Math.min(this.posicion(), this.total() - 1));
  protected readonly actual = computed(() => this.capturas()[this.indice()] ?? null);

  protected mover(delta: -1 | 1): void {
    const n = this.total();
    if (n < 2) return;
    this.posicion.set((this.indice() + delta + n) % n);
  }
}
