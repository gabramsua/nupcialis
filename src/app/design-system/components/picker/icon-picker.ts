import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

import type { NpIconName } from '../../icons/icon-name.generated';
import { NpIcon } from '../../icons/icon';

export interface OpcionDeIcono {
  readonly value: NpIconName;
  readonly label: string;
}

let siguiente = 0;

/**
 * Elegir un icono **viendo** los iconos.
 *
 * Una lista desplegable con «Banquete», «Baile» o «Ceremonia» obliga a imaginar
 * el dibujo; aquí se ve cada uno con su nombre debajo y se toca. El nombre no es
 * un adorno: el icono solo no dice qué es, y **el estado elegido no viaja nunca
 * solo en el color** — lleva marco grueso, fondo y la marca de «elegido».
 *
 * Son botones de radio de verdad, escondidos y con la etiqueta como objetivo:
 * se manejan con teclado (flechas), con lector de pantalla y con el dedo, sin
 * una línea de lógica de foco.
 */
@Component({
  selector: 'np-icon-picker',
  imports: [NpIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ip" role="radiogroup" [attr.aria-label]="etiqueta()">
      @for (o of opciones(); track o.value) {
        <label class="ip__op" [class.ip__op--puesta]="value() === o.value">
          <input
            type="radio"
            class="ip__radio"
            [name]="grupo"
            [value]="o.value"
            [checked]="value() === o.value"
            (change)="value.set(o.value)"
          />
          <span class="ip__icono"
            ><np-icon [name]="o.value" [weight]="value() === o.value ? 'fill' : 'regular'"
          /></span>
          <span class="ip__nombre">{{ o.label }}</span>
          @if (value() === o.value) {
            <span class="ip__marca" aria-hidden="true"><np-icon name="check" weight="fill" /></span>
          }
        </label>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .ip {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(5.75rem, 1fr));
      gap: var(--np-space-2);
    }
    .ip__op {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--np-space-1);
      min-block-size: 4.5rem;
      padding: var(--np-space-2);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-md);
      background: var(--np-surface-surface);
      color: var(--np-surface-text);
      text-align: center;
      cursor: pointer;
    }
    .ip__op:hover {
      background: var(--np-surface-canvas);
    }
    .ip__op--puesta {
      border: 2px solid var(--np-info-solid);
      background: var(--np-info-bg);
      color: var(--np-info-text);
      font-weight: var(--np-weight-semibold);
    }
    .ip__op:has(.ip__radio:focus-visible) {
      outline: 2px solid var(--np-info-solid);
      outline-offset: 2px;
    }
    /* Escondido pero operable: se maneja con teclado y lector de pantalla. */
    .ip__radio {
      position: absolute;
      inline-size: 1px;
      block-size: 1px;
      margin: 0;
      opacity: 0;
    }
    .ip__icono {
      display: flex;
      font-size: 1.5rem;
    }
    .ip__nombre {
      font-size: var(--np-text-xs);
      line-height: 1.2;
      overflow-wrap: break-word;
      hyphens: auto;
    }
    .ip__marca {
      position: absolute;
      inset-block-start: 0.25rem;
      inset-inline-end: 0.25rem;
      display: flex;
      font-size: 0.8rem;
    }
  `,
})
export class NpIconPicker {
  readonly opciones = input.required<readonly OpcionDeIcono[]>();
  /** Lo que lee un lector de pantalla al entrar en el grupo. */
  readonly etiqueta = input('');
  readonly value = model<string>('');

  protected readonly grupo = `np-icon-picker-${siguiente++}`;
}
