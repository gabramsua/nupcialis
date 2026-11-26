import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import type { HeroHome } from './home';
import { NpHomeBoton } from './home-boton';

/**
 * La primera pantalla: lo que ve quien llega a nupcialis.com.
 *
 * Una frase que diga qué es y a quién sirve, un botón claro y una imagen del
 * producto. La imagen es lo que más vende —se ve la web de la boda y el panel—,
 * y por eso no lleva marco de fondo: es un PNG/WebP con transparencia que
 * funciona igual en las tres plantillas.
 *
 * La plantilla cambia la composición: en «Editorial» el texto va a la izquierda
 * y la imagen a la derecha; en las otras dos todo va centrado.
 */
@Component({
  selector: 'np-home-hero',
  imports: [NpHomeBoton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="hr" [attr.data-plantilla]="plantilla()">
      <div class="hr__fondo" aria-hidden="true"></div>
      <div class="hr__in">
        <div class="hr__texto">
          @if (hero().eyebrow) {
            <p class="hr__eyebrow">{{ hero().eyebrow }}</p>
          }
          <h1 class="hr__titulo">{{ hero().title }}</h1>
          @if (hero().subtitle) {
            <div class="hr__sub" [innerHTML]="hero().subtitle"></div>
          }
          <div class="hr__ctas">
            @if (hero().cta.label) {
              <np-home-boton [enlace]="hero().cta" />
            }
            @if (hero().secondary.label) {
              <np-home-boton [enlace]="hero().secondary" variante="secundario" />
            }
          </div>
          @if (hero().note) {
            <p class="hr__nota">{{ hero().note }}</p>
          }
        </div>

        @if (hero().image; as img) {
          <img class="hr__img" [src]="img.url" [alt]="img.alt" width="1360" height="960" />
        }
      </div>
    </section>
  `,
  styles: `
    :host {
      display: block;
    }
    .hr {
      position: relative;
      overflow: hidden;
      padding: clamp(3rem, 9cqi, 6.5rem) 1.25rem clamp(2.5rem, 6cqi, 4rem);
    }
    .hr__fondo {
      position: absolute;
      inset: 0;
      background:
        radial-gradient(
          60rem 30rem at 15% -5%,
          color-mix(in srgb, var(--h-accent) 22%, transparent),
          transparent 70%
        ),
        radial-gradient(
          48rem 28rem at 95% 20%,
          color-mix(in srgb, var(--h-accent) 14%, transparent),
          transparent 70%
        );
    }
    .hr__in {
      position: relative;
      display: grid;
      gap: clamp(2rem, 5cqi, 3.5rem);
      max-inline-size: 72rem;
      margin-inline: auto;
      justify-items: center;
      text-align: center;
    }
    .hr__texto {
      display: grid;
      gap: 1.4rem;
      justify-items: center;
      max-inline-size: 48rem;
      animation: hr-sube 0.8s ease both;
    }
    .hr__eyebrow {
      margin: 0;
      color: var(--h-accent);
      font-size: 0.8rem;
      font-weight: 700;
      letter-spacing: 0.2em;
      text-transform: uppercase;
    }
    .hr__titulo {
      margin: 0;
      font-family: var(--h-font-title);
      font-size: clamp(2.3rem, 7.4cqi, 4.7rem);
      font-weight: 600;
      line-height: 1.04;
      letter-spacing: -0.01em;
      text-wrap: balance;
    }
    .hr__sub {
      color: var(--h-muted);
      font-size: clamp(1.05rem, 2.2cqi, 1.28rem);
      line-height: 1.6;
    }
    .hr__sub ::ng-deep p {
      margin: 0;
    }
    .hr__sub ::ng-deep strong {
      color: var(--h-text);
    }
    .hr__ctas {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 0.8rem;
    }
    .hr__nota {
      margin: 0;
      color: var(--h-muted);
      font-size: 0.92rem;
    }
    .hr__img {
      inline-size: min(100%, 60rem);
      block-size: auto;
      filter: drop-shadow(0 30px 40px color-mix(in srgb, var(--h-text) 18%, transparent));
      animation: hr-sube 1s 0.15s ease both;
    }
    @container home (min-width: 62rem) {
      .hr[data-plantilla='editorial'] .hr__in {
        grid-template-columns: 1fr 1.1fr;
        align-items: center;
        text-align: start;
      }
      .hr[data-plantilla='editorial'] .hr__texto,
      .hr[data-plantilla='editorial'] .hr__ctas {
        justify-items: start;
        justify-content: flex-start;
      }
      .hr[data-plantilla='editorial'] .hr__titulo {
        font-size: clamp(2.6rem, 4.1cqi, 3.9rem);
      }
    }
    @keyframes hr-sube {
      from {
        opacity: 0;
        transform: translateY(18px);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .hr__texto,
      .hr__img {
        animation: none;
      }
    }
  `,
})
export class NpHomeHero {
  readonly hero = input.required<HeroHome>();
  readonly plantilla = input<string>('luz');
}
