import { ChangeDetectionStrategy, Component, input, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoDirective } from '@jsverse/transloco';

import { NpButton } from '../../../design-system/components/button/button';
import { NpField } from '../../../design-system/components/field/field';
import { NpInput } from '../../../design-system/components/field/input';
import { NpIcon } from '../../../design-system/icons/icon';
import { buscarDireccion, type ResultadoDeBusqueda } from '../../panel/mapa/geocodificador';

/** Un sitio tal y como se va montando en el alta. Sin pin, `lat` y `lng` son `null`. */
export interface LugarEditable {
  readonly name: string;
  readonly address: string;
  readonly lat: number | null;
  readonly lng: number | null;
}

export const LUGAR_VACIO: LugarEditable = { name: '', address: '', lat: null, lng: null };

/**
 * Un lugar de la boda (ceremonia o celebración) en el formulario de alta.
 *
 * Es **opcional**: quien da de alta no siempre sabe dónde será, y la pareja lo
 * puede poner o corregir luego desde el mapa de su panel. Se puede buscar con
 * OpenStreetMap o pegar un enlace de Google Maps; si no se busca, queda sin pin
 * y la ficha no se publica hasta que se coloque.
 */
@Component({
  selector: 'np-lugar-de-alta',
  imports: [FormsModule, TranslocoDirective, NpButton, NpField, NpInput, NpIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <fieldset class="lda">
        <legend>{{ etiqueta() }}</legend>

        <np-field [label]="t('superadmin.alta.lugarNombre')">
          <input
            npInput
            [name]="'nombre-' + clave()"
            [attr.name]="'nombre-' + clave()"
            [ngModelOptions]="{ standalone: true }"
            autocomplete="off"
            [ngModel]="value().name"
            (ngModelChange)="cambiar({ name: $event })"
          />
        </np-field>

        <div class="lda__buscar">
          <input
            npInput
            type="search"
            [name]="'buscar-' + clave()"
            [attr.name]="'buscar-' + clave()"
            [ngModelOptions]="{ standalone: true }"
            autocomplete="off"
            [attr.aria-label]="t('superadmin.alta.lugarBuscar')"
            [placeholder]="t('superadmin.alta.lugarBuscarEjemplo')"
            [ngModel]="consulta()"
            (ngModelChange)="consulta.set($event)"
            (keydown.enter)="buscar($event)"
          />
          <button npButton type="button" size="sm" [loading]="buscando()" (click)="buscar()">
            <np-icon name="magnifying-glass" />
            {{ t('superadmin.alta.lugarBuscarBoton') }}
          </button>
        </div>

        @if (aviso()) {
          <p class="lda__nota">{{ t('superadmin.alta.lugarAviso.' + aviso()) }}</p>
        }

        @if (resultados().length > 0) {
          <ul class="lda__resultados">
            @for (r of resultados(); track r.nombre) {
              <li>
                <button type="button" (click)="elegir(r)">
                  <np-icon name="map-pin" />
                  <span>{{ r.nombre }}</span>
                </button>
              </li>
            }
          </ul>
        }

        @if (value().address) {
          <p class="lda__nota">{{ value().address }}</p>
        }
        <p class="lda__nota">
          <np-icon [name]="conPin() ? 'check-circle' : 'info'" />
          {{ conPin() ? t('superadmin.alta.lugarConPin') : t('superadmin.alta.lugarSinPin') }}
        </p>
      </fieldset>
    </ng-container>
  `,
  styles: `
    .lda {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-2);
      margin: 0;
      padding: var(--np-space-3);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-md);
    }
    .lda legend {
      padding-inline: var(--np-space-1);
      font-weight: var(--np-weight-medium);
    }
    .lda__buscar {
      display: flex;
      gap: var(--np-space-2);
    }
    .lda__buscar input {
      flex: 1;
      min-inline-size: 0;
    }
    .lda__nota {
      display: flex;
      align-items: center;
      gap: var(--np-space-1);
      margin: 0;
      font-size: var(--np-text-sm);
      color: var(--np-surface-text-muted);
    }
    .lda__resultados {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-1);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .lda__resultados button {
      display: flex;
      align-items: flex-start;
      gap: var(--np-space-2);
      inline-size: 100%;
      min-block-size: var(--np-tap-target);
      padding: var(--np-space-2);
      text-align: start;
      font: inherit;
      color: inherit;
      background: transparent;
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-md);
      cursor: pointer;
    }
  `,
})
export class LugarDeAlta {
  readonly clave = input.required<string>();
  readonly etiqueta = input.required<string>();
  readonly value = model<LugarEditable>(LUGAR_VACIO);

  protected readonly consulta = signal('');
  protected readonly buscando = signal(false);
  protected readonly resultados = signal<readonly ResultadoDeBusqueda[]>([]);
  protected readonly aviso = signal<'' | 'corta' | 'red' | 'sinResultados'>('');

  protected conPin(): boolean {
    return this.value().lat !== null && this.value().lng !== null;
  }

  protected cambiar(parcial: Partial<LugarEditable>): void {
    this.value.set({ ...this.value(), ...parcial });
  }

  protected async buscar(evento?: Event): Promise<void> {
    // Dentro de un formulario, Enter enviaría el alta entero.
    evento?.preventDefault();
    if (this.buscando()) return;

    this.buscando.set(true);
    this.aviso.set('');
    const respuesta = await buscarDireccion(this.consulta());
    this.buscando.set(false);

    if (!respuesta.ok) {
      this.resultados.set([]);
      this.aviso.set(respuesta.motivo === 'vacia' ? 'corta' : 'red');
      return;
    }

    this.resultados.set(respuesta.resultados);
    this.aviso.set(respuesta.resultados.length === 0 ? 'sinResultados' : '');
  }

  protected elegir(r: ResultadoDeBusqueda): void {
    this.resultados.set([]);
    const nombre = this.value().name.trim();
    this.value.set({
      // Sin nombre escrito, se propone el primer trozo de la dirección: casi
      // siempre es el nombre del sitio. Se puede cambiar.
      name: nombre !== '' ? this.value().name : (r.nombre.split(',')[0] ?? '').trim(),
      address: r.nombre,
      lat: r.lat,
      lng: r.lng,
    });
  }
}
