import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { NP_ICON_SPRITE } from './icon-sprite.providers';
import { NpIconName, NpIconWeight } from './icon-name.generated';

/**
 * Icono del set curado.
 *
 * Por defecto es **decorativo** (`aria-hidden`), y es lo correcto: la regla de
 * §9.1 dice que el color nunca viaja solo, así que un icono siempre va
 * acompañado de su texto, y ese texto es el que lee un lector de pantalla.
 * Repetirlo sería ruido.
 *
 * Para el caso contado en que el icono va solo —un botón de solo icono— hay que
 * pasar `label`, que además fuerza a pensar qué significa.
 */
@Component({
  selector: 'np-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      [attr.aria-hidden]="label() ? null : 'true'"
      [attr.role]="label() ? 'img' : null"
      [attr.aria-label]="label()"
      focusable="false"
    >
      <use [attr.href]="href()"></use>
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      inline-size: var(--np-icon-size, 1.25em);
      block-size: var(--np-icon-size, 1.25em);
      flex: none;
    }
    svg {
      inline-size: 100%;
      block-size: 100%;
      /* Hereda el color del texto que acompaña: nunca se desincroniza de él. */
      fill: currentColor;
    }
  `,
})
export class NpIcon {
  private readonly sprite = inject(NP_ICON_SPRITE);

  readonly name = input.required<NpIconName>();
  /** `regular` inactivo, `fill` activo o seleccionado. */
  readonly weight = input<NpIconWeight>('regular');
  /** Solo cuando el icono va sin texto al lado. */
  readonly label = input<string | null>(null);

  protected readonly href = computed(() => `${this.sprite}#${this.name()}-${this.weight()}`);
}
