import { ChangeDetectionStrategy, Component, input, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoDirective } from '@jsverse/transloco';

import { NpButton } from '../../../design-system/components/button/button';
import { NpField } from '../../../design-system/components/field/field';
import { NpInput } from '../../../design-system/components/field/input';
import { NpIcon } from '../../../design-system/icons/icon';
import { coordenadasDeEnlace } from '../../panel/mapa/geocodificador';

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
 * puede poner o corregir luego desde el mapa de su panel. **No hay buscador
 * propio** (D-53): un botón abre Google Maps en otra pestaña con el nombre ya
 * puesto, se busca allí, y se pega el enlace de vuelta. Si el enlace trae
 * coordenadas, la ficha nace con su pin; si no (los enlaces cortos las esconden),
 * queda sin pin y no se publica hasta que la pareja lo coloque.
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
          <a
            npButton
            variant="secondary"
            size="sm"
            target="_blank"
            rel="noopener"
            [href]="enlaceDeBusqueda()"
          >
            <np-icon name="map-pin" />
            {{ t('superadmin.alta.lugarAbrirMaps') }}
          </a>
        </div>
        <np-field [label]="t('superadmin.alta.lugarEnlace')">
          <input
            npInput
            type="url"
            [name]="'enlace-' + clave()"
            [attr.name]="'enlace-' + clave()"
            [ngModelOptions]="{ standalone: true }"
            autocomplete="off"
            [placeholder]="t('superadmin.alta.lugarEnlaceEjemplo')"
            [ngModel]="enlace()"
            (ngModelChange)="pegar($event)"
          />
        </np-field>

        @if (aviso()) {
          <p class="lda__nota">{{ t('superadmin.alta.lugarAviso.' + aviso()) }}</p>
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
    .lda__nota {
      display: flex;
      align-items: center;
      gap: var(--np-space-1);
      margin: 0;
      font-size: var(--np-text-sm);
      color: var(--np-surface-text-muted);
    }
  `,
})
export class LugarDeAlta {
  readonly clave = input.required<string>();
  readonly etiqueta = input.required<string>();
  readonly value = model<LugarEditable>(LUGAR_VACIO);

  protected readonly enlace = signal('');
  protected readonly aviso = signal<'' | 'sinCoordenadas' | 'noEsEnlace'>('');

  /** Google Maps, buscando lo que se haya escrito como nombre. */
  protected enlaceDeBusqueda(): string {
    const consulta = encodeURIComponent(this.value().name.trim());
    return consulta === ''
      ? 'https://www.google.com/maps'
      : `https://www.google.com/maps/search/?api=1&query=${consulta}`;
  }

  protected conPin(): boolean {
    return this.value().lat !== null && this.value().lng !== null;
  }

  protected cambiar(parcial: Partial<LugarEditable>): void {
    this.value.set({ ...this.value(), ...parcial });
  }

  /** Lee las coordenadas del enlace pegado; sin ellas, el sitio queda sin pin. */
  protected pegar(texto: string): void {
    this.enlace.set(texto);
    const limpio = texto.trim();

    if (limpio === '') {
      this.aviso.set('');
      this.cambiar({ lat: null, lng: null });
      return;
    }
    if (!/^https?:\/\//i.test(limpio)) {
      this.aviso.set('noEsEnlace');
      this.cambiar({ lat: null, lng: null });
      return;
    }

    const coordenadas = coordenadasDeEnlace(limpio);
    this.aviso.set(coordenadas ? '' : 'sinCoordenadas');
    this.cambiar({
      lat: coordenadas?.lat ?? null,
      lng: coordenadas?.lng ?? null,
    });
  }
}
