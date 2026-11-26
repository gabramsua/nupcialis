import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

import { NpButton } from '../../../design-system/components/button/button';
import { NpInput } from '../../../design-system/components/field/input';
import {
  NpIconPicker,
  type OpcionDeIcono,
} from '../../../design-system/components/picker/icon-picker';
import { NpIcon } from '../../../design-system/icons/icon';
import { NP_ICON_SPRITE } from '../../../design-system/icons/icon-sprite.providers';
import type { NpIconName } from '../../../design-system/icons/icon-name.generated';
import { ICONOS_HOME, type ImagenHome } from '../../home/home';
import { NpEditorRico } from '../../panel/web/editor-rico';

/**
 * Los campos del editor de la HOME. Son tontos a propósito: reciben el valor y
 * avisan del cambio; la pantalla es la que sabe dónde va cada cosa.
 */

let siguienteId = 0;

/** Una línea o un párrafo de texto plano. `filas` > 1 lo hace un `textarea`. */
@Component({
  selector: 'np-hc-texto',
  imports: [NpInput],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="hc">
      <label class="hc__etiqueta" [for]="id">{{ etiqueta() }}</label>
      @if (filas() > 1) {
        <textarea
          npInput
          [id]="id"
          [rows]="filas()"
          [maxLength]="maximo()"
          [value]="valor()"
          (input)="cambia.emit(texto($event))"
        ></textarea>
      } @else {
        <input
          npInput
          type="text"
          [id]="id"
          [maxLength]="maximo()"
          [value]="valor()"
          [placeholder]="pista()"
          (input)="cambia.emit(texto($event))"
        />
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .hc {
      display: grid;
      gap: var(--np-space-1);
    }
    .hc__etiqueta {
      font-size: var(--np-text-sm);
      font-weight: var(--np-weight-medium);
    }
  `,
})
export class NpHcTexto {
  protected readonly id = `hc-${siguienteId++}`;
  readonly etiqueta = input.required<string>();
  readonly valor = input('');
  readonly maximo = input(240);
  readonly filas = input(1);
  readonly pista = input('');
  readonly cambia = output<string>();

  protected texto(e: Event): string {
    return (e.target as HTMLInputElement | HTMLTextAreaElement).value;
  }
}

/** Texto con formato (Jodit). El saneado es del servidor, no de aquí. */
@Component({
  selector: 'np-hc-html',
  imports: [NpEditorRico],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="hc">
      <span class="hc__etiqueta">{{ etiqueta() }}</span>
      <np-editor-rico [valor]="valor()" [maximo]="maximo()" (cambia)="cambia.emit($event)" />
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .hc {
      display: grid;
      gap: var(--np-space-1);
    }
    .hc__etiqueta {
      font-size: var(--np-text-sm);
      font-weight: var(--np-weight-medium);
    }
  `,
})
export class NpHcHtml {
  readonly etiqueta = input.required<string>();
  readonly valor = input('');
  readonly maximo = input(1500);
  readonly cambia = output<string>();
}

/** Elegir un icono de los de la HOME, plegado hasta que se toca. */
@Component({
  selector: 'np-hc-icono',
  imports: [NpIcon, NpIconPicker, TranslocoDirective],
  // Los iconos de la HOME viven en su propia hoja, no en la del panel.
  providers: [{ provide: NP_ICON_SPRITE, useValue: '/icons/home.svg' }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <button
        type="button"
        class="hi__boton"
        [attr.aria-expanded]="abierto()"
        (click)="abierto.set(!abierto())"
      >
        <np-icon [name]="actual()" weight="fill" />
        <span>{{ t('superadmin.home.icono') }}: {{ nombre(valor()) }}</span>
      </button>
      @if (abierto()) {
        <np-icon-picker
          [opciones]="opciones"
          [etiqueta]="t('superadmin.home.icono')"
          [value]="valor()"
          (valueChange)="elige($event)"
        />
      }
    </ng-container>
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--np-space-2);
    }
    .hi__boton {
      display: inline-flex;
      align-items: center;
      gap: var(--np-space-2);
      justify-self: start;
      padding: var(--np-space-1) var(--np-space-3);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-md);
      background: var(--np-surface-surface);
      color: inherit;
      font: inherit;
      font-size: var(--np-text-sm);
      cursor: pointer;
    }
  `,
})
export class NpHcIcono {
  readonly valor = input.required<string>();
  readonly cambia = output<string>();

  protected readonly abierto = signal(false);
  protected readonly opciones: readonly OpcionDeIcono[] = ICONOS_HOME.map((id) => ({
    value: id as NpIconName,
    label: this.nombre(id),
  }));
  protected readonly actual = computed(() => this.valor() as NpIconName);

  protected nombre(id: string): string {
    return id.replace(/-/g, ' ');
  }

  protected elige(id: string): void {
    this.cambia.emit(id);
    this.abierto.set(false);
  }
}

/** Una imagen: miniatura, cambiar, quitar, volver a la de serie y texto alternativo. */
@Component({
  selector: 'np-hc-imagen',
  imports: [NpButton, NpHcTexto, TranslocoDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <div class="hm">
        <span class="hc__etiqueta">{{ etiqueta() }}</span>

        <div class="hm__fila">
          <div class="hm__marco">
            @if (imagen(); as i) {
              <img [src]="i.url" [alt]="i.alt" />
            } @else {
              <span class="hm__vacia">{{ t('superadmin.home.sinImagen') }}</span>
            }
          </div>

          <div class="hm__acciones">
            <label class="hm__subir">
              <input type="file" accept="image/*" (change)="elegida($event)" />
              <span class="np-button" data-variant="secondary" data-size="sm">{{
                t(imagen() ? 'superadmin.home.cambiarImagen' : 'superadmin.home.subirImagen')
              }}</span>
            </label>
            @if (imagen()) {
              <button npButton variant="ghost" size="sm" type="button" (click)="quitar.emit()">
                {{ t('superadmin.home.quitarImagen') }}
              </button>
            }
            @if (hayOtra()) {
              <button npButton variant="ghost" size="sm" type="button" (click)="deSerie.emit()">
                {{ t('superadmin.home.imagenDeSerie') }}
              </button>
            }
            @if (subiendo()) {
              <small role="status">{{ t('superadmin.home.subiendo') }}</small>
            }
          </div>
        </div>

        @if (imagen(); as i) {
          <np-hc-texto
            [etiqueta]="t('superadmin.home.textoAlternativo')"
            [valor]="i.alt"
            [maximo]="160"
            (cambia)="alt.emit($event)"
          />
        }
      </div>
    </ng-container>
  `,
  styles: `
    :host {
      display: block;
    }
    .hm {
      display: grid;
      gap: var(--np-space-2);
    }
    .hc__etiqueta {
      font-size: var(--np-text-sm);
      font-weight: var(--np-weight-medium);
    }
    .hm__fila {
      display: flex;
      flex-wrap: wrap;
      gap: var(--np-space-3);
      align-items: center;
    }
    .hm__marco {
      display: grid;
      place-items: center;
      inline-size: 10rem;
      block-size: 6.5rem;
      overflow: hidden;
      border: 1px dashed var(--np-surface-border);
      border-radius: var(--np-radius-md);
      background: var(--np-surface-canvas);
    }
    .hm__marco img {
      max-inline-size: 100%;
      max-block-size: 100%;
      object-fit: contain;
    }
    .hm__vacia,
    small {
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-sm);
    }
    .hm__acciones {
      display: flex;
      flex-wrap: wrap;
      gap: var(--np-space-2);
      align-items: center;
    }
    .hm__subir {
      cursor: pointer;
    }
    .hm__subir input {
      position: absolute;
      inline-size: 1px;
      block-size: 1px;
      opacity: 0;
    }
    .hm__subir:focus-within .np-button {
      outline: 2px solid var(--np-focus-ring, currentColor);
      outline-offset: 2px;
    }
  `,
})
export class NpHcImagen {
  readonly etiqueta = input.required<string>();
  readonly imagen = input<ImagenHome | null>(null);
  /** La imagen de serie, para ofrecer volver a ella. */
  readonly deFabrica = input<ImagenHome | null>(null);
  readonly subiendo = input(false);

  readonly elegir = output<File>();
  readonly quitar = output<void>();
  readonly deSerie = output<void>();
  readonly alt = output<string>();

  /** Solo se ofrece volver a la de serie si no es ya la que hay. */
  protected hayOtra(): boolean {
    const f = this.deFabrica();
    return f !== null && this.imagen()?.url !== f.url;
  }

  protected elegida(e: Event): void {
    const entrada = e.target as HTMLInputElement;
    const fichero = entrada.files?.[0];
    if (fichero) this.elegir.emit(fichero);
    entrada.value = '';
  }
}
