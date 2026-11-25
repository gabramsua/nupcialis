import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

import type { NombresPareja } from '../../../core/tenant/tenant-source';
import type { LadoPersona, PersonaPublica } from './cortejo';

/**
 * Las personas importantes de la boda, como las ve el invitado (§8.12).
 *
 * Una tarjeta por persona: foto redonda —o su inicial, si la pareja no puso
 * foto o no confirmó el consentimiento—, nombre, papel y la línea que la
 * presenta. El orden es el de la pareja. Sin teléfono: ese dato no llega a la
 * web (lo descarta la proyección).
 *
 * Sin personas, no pinta nada: una sección vacía debajo de un título es una
 * web a medio hacer.
 */
@Component({
  selector: 'np-cortejo-publico',
  imports: [TranslocoDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      @if (personas().length > 0) {
        <ul class="co">
          @for (persona of personas(); track persona.id) {
            <li class="co__ficha">
              <div class="co__avatar">
                @if (persona.photoUrl; as url) {
                  <img
                    [src]="url"
                    [alt]="t('publico.cortejo.fotoDe', { nombre: persona.name })"
                    width="96"
                    height="96"
                    loading="lazy"
                    decoding="async"
                  />
                } @else {
                  <span aria-hidden="true">{{ inicial(persona.name) }}</span>
                }
              </div>
              <p class="co__nombre">{{ persona.name }}</p>
              <p class="co__papel">{{ persona.role }}</p>
              @if (lado(persona.side); as nombre) {
                <p class="co__lado">{{ t('publico.cortejo.lado', { nombre }) }}</p>
              }
              @if (persona.bio) {
                <p class="co__bio">{{ persona.bio }}</p>
              }
            </li>
          }
        </ul>
      }
    </ng-container>
  `,
  styles: `
    :host {
      display: block;
    }
    .co {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(9.5rem, 1fr));
      gap: var(--np-space-4);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .co__ficha {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--np-space-1);
      text-align: center;
    }
    .co__ficha p {
      margin: 0;
    }
    .co__avatar {
      display: grid;
      place-items: center;
      inline-size: 6rem;
      block-size: 6rem;
      margin-block-end: var(--np-space-2);
      overflow: hidden;
      border: 2px solid color-mix(in srgb, currentColor 30%, transparent);
      border-radius: 50%;
      background: color-mix(in srgb, currentColor 8%, transparent);
      font-size: 2rem;
    }
    .co__avatar img {
      inline-size: 100%;
      block-size: 100%;
      object-fit: cover;
    }
    .co__nombre {
      font-weight: 600;
      overflow-wrap: anywhere;
    }
    .co__papel {
      font-size: var(--np-text-sm);
      letter-spacing: 0.06em;
      text-transform: uppercase;
      opacity: 0.8;
    }
    .co__lado {
      font-size: var(--np-text-xs);
      opacity: 0.7;
    }
    .co__bio {
      font-size: var(--np-text-sm);
      opacity: 0.9;
      overflow-wrap: anywhere;
    }
  `,
})
export class NpCortejoPublico {
  readonly personas = input.required<readonly PersonaPublica[]>();
  /** Para decir «del lado de María». */
  readonly nombres = input.required<NombresPareja>();

  protected inicial(nombre: string): string {
    return nombre.trim().charAt(0).toUpperCase();
  }

  /** El nombre de la persona de la pareja de la que es, o `''` si es de los dos. */
  protected lado(lado: LadoPersona): string {
    if (lado === 'both') return '';
    return (lado === 'A' ? this.nombres().partnerA : this.nombres().partnerB).trim();
  }
}
