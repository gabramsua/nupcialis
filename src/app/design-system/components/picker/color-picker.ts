import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

import { NpIcon } from '../../icons/icon';

export interface OpcionDeColor {
  /** El id de la categoría de la paleta: sale de `var(--np-cat-<id>)`. */
  readonly id: string;
  readonly nombre: string;
}

let siguiente = 0;

/**
 * Elegir un color de la paleta viéndolo.
 *
 * Una muestra redonda por color, con su nombre al lado. El color elegido lleva
 * **la marca de «elegido» dentro de la muestra y un marco grueso**: nunca solo
 * el tono, porque no todo el mundo distingue dos verdes (§9.1). Los colores
 * salen de la paleta del sistema; aquí no se inventa ninguno.
 *
 * Mismo mecanismo que `np-icon-picker`: radios de verdad, escondidos.
 */
@Component({
  selector: 'np-color-picker',
  imports: [NpIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cp" role="radiogroup" [attr.aria-label]="etiqueta()">
      @for (o of opciones(); track o.id) {
        <label class="cp__op" [class.cp__op--puesta]="value() === o.id">
          <input
            type="radio"
            class="cp__radio"
            [name]="grupo"
            [value]="o.id"
            [checked]="value() === o.id"
            (change)="value.set(o.id)"
          />
          <span class="cp__muestra" [style.background]="'var(--np-cat-' + o.id + ')'">
            @if (value() === o.id) {
              <np-icon name="check" weight="fill" />
            }
          </span>
          <span class="cp__nombre">{{ o.nombre }}</span>
        </label>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .cp {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(6.25rem, 1fr));
      gap: var(--np-space-2);
    }
    .cp__op {
      position: relative;
      display: flex;
      align-items: center;
      gap: var(--np-space-2);
      min-block-size: var(--np-tap-target);
      padding: var(--np-space-1) var(--np-space-2);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-md);
      background: var(--np-surface-surface);
      cursor: pointer;
    }
    .cp__op:hover {
      background: var(--np-surface-canvas);
    }
    .cp__op--puesta {
      border: 2px solid var(--np-info-solid);
      background: var(--np-info-bg);
      font-weight: var(--np-weight-semibold);
    }
    .cp__op:has(.cp__radio:focus-visible) {
      outline: 2px solid var(--np-info-solid);
      outline-offset: 2px;
    }
    .cp__radio {
      position: absolute;
      inline-size: 1px;
      block-size: 1px;
      margin: 0;
      opacity: 0;
    }
    .cp__muestra {
      display: flex;
      flex: none;
      align-items: center;
      justify-content: center;
      inline-size: 1.75rem;
      block-size: 1.75rem;
      border-radius: 50%;
      color: var(--np-surface-surface);
      font-size: 1rem;
    }
    .cp__nombre {
      font-size: var(--np-text-sm);
    }
  `,
})
export class NpColorPicker {
  readonly opciones = input.required<readonly OpcionDeColor[]>();
  readonly etiqueta = input('');
  readonly value = model<string>('');

  protected readonly grupo = `np-color-picker-${siguiente++}`;
}
