import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { NpIcon } from '../../design-system/icons/icon';
import type { EnlaceHome } from './home';

/**
 * El botón de la HOME. Un enlace con forma de botón: lleva a un ancla de la
 * propia página, a un correo o a una web, nunca a una acción.
 *
 * Los colores salen de las variables que pone `np-home-pagina`, así que el
 * mismo botón se ve bien en las tres plantillas.
 */
@Component({
  selector: 'np-home-boton',
  imports: [NpIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a
      class="hb"
      [class.hb--sec]="variante() === 'secundario'"
      [href]="enlace().url"
      [attr.target]="fuera() ? '_blank' : null"
      [attr.rel]="fuera() ? 'noopener' : null"
    >
      {{ enlace().label }}
      @if (variante() === 'primario') {
        <np-icon name="arrow-right" />
      }
    </a>
  `,
  styles: `
    :host {
      display: inline-flex;
    }
    .hb {
      display: inline-flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.95rem 1.7rem;
      border: var(--h-borde-boton, 1.5px solid transparent);
      border-radius: var(--h-radio-boton, 999px);
      background: var(--h-accent);
      color: var(--h-on-accent);
      font-weight: 600;
      text-decoration: none;
      transition:
        transform 0.15s ease,
        box-shadow 0.15s ease;
    }
    .hb:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 24px color-mix(in srgb, var(--h-accent) 35%, transparent);
    }
    .hb:focus-visible {
      outline: 3px solid var(--h-accent);
      outline-offset: 3px;
    }
    .hb--sec {
      border-color: var(--h-text);
      background: transparent;
      color: var(--h-text);
    }
    .hb--sec:hover {
      box-shadow: none;
      background: color-mix(in srgb, var(--h-text) 8%, transparent);
    }
    @media (prefers-reduced-motion: reduce) {
      .hb {
        transition: none;
      }
      .hb:hover {
        transform: none;
      }
    }
  `,
})
export class NpHomeBoton {
  readonly enlace = input.required<EnlaceHome>();
  readonly variante = input<'primario' | 'secundario'>('primario');

  protected readonly fuera = computed(() => /^https:/i.test(this.enlace().url));
}
