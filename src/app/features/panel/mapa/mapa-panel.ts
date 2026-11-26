import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslocoDirective } from '@jsverse/transloco';

import { NpAlert } from '../../../design-system/components/alert/alert';
import { NpButton } from '../../../design-system/components/button/button';
import { NpEmptyState } from '../../../design-system/components/empty-state/empty-state';
import { NpModal } from '../../../design-system/components/modal/modal';
import { NpStatusChip } from '../../../design-system/components/status-chip/status-chip';
import { NpIcon } from '../../../design-system/icons/icon';
import type { NpIconName } from '../../../design-system/icons/icon-name.generated';
import type { FalloUbicaciones, UbicacionDelPanel } from '../../../core/mapa/ubicaciones-gateway';
import { ESTILO_DE_TIPO } from '../../public-site/mapa/leaflet';
import {
  MAX_DESCRIPCION,
  MAX_DIRECCION,
  MAX_NOMBRE,
  MAX_UBICACIONES,
  TIPOS_UBICACION,
  coordenadasValidas,
  horaDelSitio,
  type TipoUbicacion,
} from '../../public-site/mapa/ubicaciones';
import { NpSelectorDePin, type PuntoElegido } from './selector-de-pin';
import { UbicacionesStore } from './ubicaciones.store';
import { NpInput } from '../../../design-system/components/field/input';

/**
 * Los sitios del mapa, donde la pareja los apunta (§8.6).
 *
 * Lo que esta pantalla vigila y la web no puede: **que cada sitio tenga el pin
 * puesto**. Una ficha sin pin no sale en el mapa —ni puede, no hay dónde
 * ponerla—, y lo peor que le puede pasar a una pareja es creer que ha
 * publicado «dónde es la ceremonia» y que el invitado no lo vea. Aquí cada
 * ficha dice con texto, color e icono si se publica o por qué no.
 */
@Component({
  selector: 'np-panel-mapa',
  imports: [
    ReactiveFormsModule,
    TranslocoDirective,
    NpAlert,
    NpButton,
    NpEmptyState,
    NpModal,
    NpStatusChip,
    NpIcon,
    NpSelectorDePin,
    NpInput,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <section class="mpn">
        <header class="mpn__intro">
          <div>
            <h2>{{ t('panel.mapa.titulo') }}</h2>
            <p>{{ t('panel.mapa.ayuda') }}</p>
          </div>
          <button npButton type="button" [disabled]="lleno()" (click)="nuevo()">
            <np-icon name="plus" />
            {{ t('panel.mapa.anadir') }}
          </button>
        </header>

        @if (lleno()) {
          <np-alert status="attention" [heading]="t('panel.mapa.lleno')">
            <p>{{ t('panel.mapa.llenoAyuda', { maximo: maximo }) }}</p>
          </np-alert>
        }

        @if (store.fallo(); as fallo) {
          <np-alert status="declined" [heading]="t('panel.mapa.errorGuardar')">
            <p>{{ textoDelFallo(fallo, t) }}</p>
          </np-alert>
        }

        @switch (store.estado()) {
          @case ('cargando') {
            <np-empty-state icon="map-pin" [title]="t('panel.mapa.cargando')" />
          }
          @default {
            @if (store.ubicaciones().length === 0) {
              <np-empty-state
                icon="map-pin"
                [title]="t('panel.mapa.ninguno')"
                [description]="t('panel.mapa.ningunoDescripcion')"
              />
            } @else {
              @if (sinPin() > 0) {
                <np-alert status="attention" [heading]="t('panel.mapa.avisoSinPin')">
                  <p>{{ t('panel.mapa.avisoSinPinAyuda', { n: sinPin() }) }}</p>
                </np-alert>
              }

              <ul class="mpn__lista">
                @for (sitio of store.ubicaciones(); track sitio.id; let i = $index) {
                  <li
                    class="mpn__ficha"
                    [class.mpn__ficha--apagada]="!sitio.visibleToGuests"
                    [style.--np-pin-color]="color(sitio.type)"
                  >
                    <p class="mpn__cabecera">
                      <span class="mpn__icono"
                        ><np-icon [name]="icono(sitio.type)" weight="fill"
                      /></span>
                      <span class="mpn__texto">
                        <strong>{{ sitio.name || t('panel.mapa.sinNombre') }}</strong>
                        <small>
                          {{ t('panel.mapa.tipo.' + sitio.type) }}
                          @if (sitio.time) {
                            · {{ sitio.time }}
                          }
                        </small>
                      </span>
                    </p>

                    @if (sitio.address) {
                      <p class="mpn__direccion">{{ sitio.address }}</p>
                    }

                    <span class="mpn__estados">
                      @if (!tienePin(sitio)) {
                        <np-status-chip status="pending" [label]="t('panel.mapa.sinPin')" />
                      }
                      @if (!sitio.visibleToGuests) {
                        <np-status-chip status="pending" [label]="t('panel.mapa.interno')" />
                      }
                      @if (sitio.name === '') {
                        <np-status-chip status="declined" [label]="t('panel.mapa.noPublica')" />
                      }
                      @if (sePublica(sitio)) {
                        <np-status-chip status="confirmed" [label]="t('panel.mapa.publicada')" />
                      }
                    </span>

                    <div class="mpn__acciones">
                      <button
                        npButton
                        size="sm"
                        variant="ghost"
                        type="button"
                        [disabled]="i === 0"
                        [attr.aria-label]="t('panel.mapa.subir')"
                        (click)="store.mover(sitio.id, -1)"
                      >
                        <np-icon name="caret-up" />
                      </button>
                      <button
                        npButton
                        size="sm"
                        variant="ghost"
                        type="button"
                        [disabled]="i === store.ubicaciones().length - 1"
                        [attr.aria-label]="t('panel.mapa.bajar')"
                        (click)="store.mover(sitio.id, 1)"
                      >
                        <np-icon name="caret-down" />
                      </button>
                      <button
                        npButton
                        size="sm"
                        variant="ghost"
                        type="button"
                        (click)="alternar(sitio)"
                      >
                        <np-icon [name]="sitio.visibleToGuests ? 'eye' : 'eye-slash'" />
                        {{ sitio.visibleToGuests ? t('panel.mapa.quitar') : t('panel.mapa.poner') }}
                      </button>
                      <button
                        npButton
                        size="sm"
                        variant="ghost"
                        type="button"
                        (click)="editar(sitio)"
                      >
                        <np-icon name="pencil-simple" />
                        {{ t('common.edit') }}
                      </button>
                      <button
                        npButton
                        size="sm"
                        variant="ghost"
                        type="button"
                        (click)="borrando.set(sitio)"
                      >
                        <np-icon name="trash" />
                        {{ t('common.delete') }}
                      </button>
                    </div>
                  </li>
                }
              </ul>
            }
          }
        }

        @if (editando(); as cual) {
          <np-modal
            [open]="true"
            [heading]="cual === 'nuevo' ? t('panel.mapa.nuevo') : t('panel.mapa.editar')"
            (closed)="editando.set(null)"
          >
            <form class="mpn__form" [formGroup]="formulario" (submit)="enviar($event)">
              <label>
                {{ t('panel.mapa.campo.nombre') }}
                <input npInput formControlName="name" [attr.maxlength]="maximoNombre" />
              </label>

              <div class="mpn__pareja">
                <label>
                  {{ t('panel.mapa.campo.tipo') }}
                  <select npInput formControlName="type">
                    @for (tipo of tipos; track tipo) {
                      <option [value]="tipo">{{ t('panel.mapa.tipo.' + tipo) }}</option>
                    }
                  </select>
                </label>
                <label>
                  {{ t('panel.mapa.campo.hora') }}
                  <input npInput formControlName="time" type="time" />
                  <small>{{ t('panel.mapa.campo.horaAyuda') }}</small>
                </label>
              </div>

              <label>
                {{ t('panel.mapa.campo.direccion') }}
                <input npInput formControlName="address" [attr.maxlength]="maximoDireccion" />
              </label>

              <np-selector-de-pin
                [tipo]="formulario.controls.type.value"
                [lat]="pin().lat"
                [lng]="pin().lng"
                [direccion]="formulario.controls.address.value"
                (elegido)="colocar($event)"
              />

              <label>
                {{ t('panel.mapa.campo.descripcion') }}
                <textarea
                  npInput
                  formControlName="description"
                  rows="3"
                  [attr.maxlength]="maximoDescripcion"
                ></textarea>
                <small>{{ t('panel.mapa.campo.descripcionAyuda') }}</small>
              </label>

              <label class="mpn__casilla">
                <input formControlName="visibleToGuests" type="checkbox" />
                <span>{{ t('panel.mapa.campo.visible') }}</span>
              </label>
            </form>

            <div np-modal-actions>
              <button npButton variant="ghost" type="button" (click)="editando.set(null)">
                {{ t('common.cancel') }}
              </button>
              <button
                npButton
                type="button"
                [loading]="guardando()"
                [disabled]="formulario.invalid"
                (click)="guardar()"
              >
                <np-icon name="check" />
                {{ t('common.save') }}
              </button>
            </div>
          </np-modal>
        }

        @if (borrando(); as cual) {
          <np-modal [open]="true" [heading]="t('common.delete')" (closed)="borrando.set(null)">
            <p>{{ t('panel.mapa.confirmarBorrado', { nombre: cual.name }) }}</p>

            <div np-modal-actions>
              <button npButton variant="ghost" type="button" (click)="borrando.set(null)">
                {{ t('common.cancel') }}
              </button>
              <button
                npButton
                variant="danger"
                type="button"
                [loading]="borrandoYa()"
                (click)="borrar()"
              >
                <np-icon name="trash" />
                {{ t('common.delete') }}
              </button>
            </div>
          </np-modal>
        }
      </section>
    </ng-container>
  `,
  styles: `
    .mpn__intro {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-3);
      margin-block-end: var(--np-space-4);
    }
    .mpn__intro h2 {
      margin: 0;
      font-size: var(--np-text-xl);
      font-weight: var(--np-weight-semibold);
    }
    .mpn__intro p {
      margin: var(--np-space-1) 0 0;
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-sm);
    }
    @media (min-width: 48rem) {
      .mpn__intro {
        flex-direction: row;
        align-items: flex-start;
        justify-content: space-between;
      }
      /* El texto cede; el botón no: con el ancho justo, no se encoge. */
      .mpn__intro > div {
        flex: 1 1 0;
        min-inline-size: 0;
      }
      .mpn__intro > button {
        flex: none;
        white-space: nowrap;
      }
    }
    .mpn__lista {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-2);
      margin: var(--np-space-3) 0 0;
      padding: 0;
      list-style: none;
    }
    .mpn__ficha {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-2);
      padding: var(--np-space-3);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-md);
      background: var(--np-surface-surface);
    }
    .mpn__ficha--apagada {
      border-style: dashed;
      background: var(--np-surface-canvas);
    }
    .mpn__cabecera {
      display: flex;
      align-items: center;
      gap: var(--np-space-3);
      margin: 0;
    }
    .mpn__icono {
      display: grid;
      flex: none;
      place-items: center;
      inline-size: 2.25rem;
      block-size: 2.25rem;
      border-radius: 50%;
      background: var(--np-pin-color);
      color: #fff;
    }
    .mpn__texto {
      display: flex;
      flex-direction: column;
    }
    .mpn__texto small,
    .mpn__direccion {
      margin: 0;
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-sm);
    }
    .mpn__estados,
    .mpn__acciones {
      display: flex;
      flex-wrap: wrap;
      gap: var(--np-space-2);
    }
    .mpn__acciones {
      gap: var(--np-space-1);
    }
    .mpn__form {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-3);
    }
    .mpn__form label {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-1);
      font-size: var(--np-text-sm);
    }
    .mpn__pareja {
      display: flex;
      flex-wrap: wrap;
      gap: var(--np-space-3);
    }
    .mpn__pareja label {
      flex: 1;
      min-inline-size: 8rem;
    }
    .mpn__form small {
      color: var(--np-surface-text-muted);
    }
    .mpn__form .mpn__casilla {
      flex-direction: row;
      align-items: center;
      gap: var(--np-space-2);
    }
  `,
})
export class PanelMapa {
  protected readonly store = inject(UbicacionesStore);
  private readonly fb = inject(FormBuilder);

  protected readonly tipos = TIPOS_UBICACION;
  protected readonly maximo = MAX_UBICACIONES;
  protected readonly maximoNombre = MAX_NOMBRE;
  protected readonly maximoDireccion = MAX_DIRECCION;
  protected readonly maximoDescripcion = MAX_DESCRIPCION;

  protected readonly editando = signal<UbicacionDelPanel | 'nuevo' | null>(null);
  protected readonly borrando = signal<UbicacionDelPanel | null>(null);
  protected readonly guardando = signal(false);
  protected readonly borrandoYa = signal(false);

  /** Donde está el pin del formulario. No es un control: lo mueve el mapa. */
  protected readonly pin = signal<{ lat: number | null; lng: number | null }>({
    lat: null,
    lng: null,
  });

  protected readonly lleno = computed(() => this.store.ubicaciones().length >= MAX_UBICACIONES);

  /** Cuántas fichas no saldrán en el mapa por no tener el pin puesto. */
  protected readonly sinPin = computed(
    () =>
      this.store
        .ubicaciones()
        .filter((sitio) => sitio.visibleToGuests && sitio.name !== '' && !this.tienePin(sitio))
        .length,
  );

  protected readonly formulario = this.fb.nonNullable.group({
    name: ['', Validators.required],
    type: ['ceremonia' as TipoUbicacion],
    time: [''],
    address: [''],
    description: [''],
    visibleToGuests: [true],
  });

  constructor() {
    void this.store.cargar();
  }

  protected color(tipo: TipoUbicacion): string {
    return ESTILO_DE_TIPO[tipo].color;
  }

  protected icono(tipo: TipoUbicacion): NpIconName {
    return ESTILO_DE_TIPO[tipo].icono;
  }

  protected tienePin(sitio: UbicacionDelPanel): boolean {
    return coordenadasValidas(sitio.lat, sitio.lng);
  }

  /** Lo mismo que decide el servidor: con nombre, visible y con el pin puesto. */
  protected sePublica(sitio: UbicacionDelPanel): boolean {
    return sitio.name !== '' && sitio.visibleToGuests && this.tienePin(sitio);
  }

  protected nuevo(): void {
    this.formulario.reset({
      name: '',
      type: 'ceremonia',
      time: '',
      address: '',
      description: '',
      visibleToGuests: true,
    });
    this.pin.set({ lat: null, lng: null });
    this.editando.set('nuevo');
  }

  protected editar(sitio: UbicacionDelPanel): void {
    this.formulario.reset({
      name: sitio.name,
      type: sitio.type,
      time: sitio.time ?? '',
      address: sitio.address,
      description: sitio.description,
      visibleToGuests: sitio.visibleToGuests,
    });
    this.pin.set({ lat: sitio.lat, lng: sitio.lng });
    this.editando.set(sitio);
  }

  /** El pin llega del mapa; si vino de una búsqueda, rellena la dirección vacía. */
  protected colocar(punto: PuntoElegido): void {
    this.pin.set({ lat: punto.lat, lng: punto.lng });

    const direccion = this.formulario.controls.address;
    if (punto.direccion && direccion.value.trim() === '') {
      direccion.setValue(punto.direccion.slice(0, MAX_DIRECCION));
    }
  }

  protected enviar(evento: Event): void {
    evento.preventDefault();
    void this.guardar();
  }

  protected async guardar(): Promise<void> {
    const cual = this.editando();
    if (!cual || this.formulario.invalid || this.guardando()) return;

    const valores = this.formulario.getRawValue();
    const nuevo = cual === 'nuevo';
    const { lat, lng } = this.pin();
    const conPin = lat !== null && lng !== null && coordenadasValidas(lat, lng);
    this.guardando.set(true);

    const resultado = await this.store.guardar({
      id: nuevo ? undefined : cual.id,
      type: valores.type,
      name: valores.name.trim(),
      address: valores.address.trim(),
      lat: conPin ? lat : null,
      lng: conPin ? lng : null,
      description: valores.description.trim(),
      time: horaDelSitio(valores.time),
      order: nuevo ? this.store.ubicaciones().length + 1 : cual.order,
      visibleToGuests: valores.visibleToGuests,
    });

    this.guardando.set(false);
    if (resultado.ok) this.editando.set(null);
  }

  /** Quitar del mapa y volver a poner, en un toque. */
  protected async alternar(sitio: UbicacionDelPanel): Promise<void> {
    await this.store.guardar({ ...sitio, visibleToGuests: !sitio.visibleToGuests });
  }

  protected async borrar(): Promise<void> {
    const cual = this.borrando();
    if (!cual || this.borrandoYa()) return;

    this.borrandoYa.set(true);
    const resultado = await this.store.borrar(cual.id);
    this.borrandoYa.set(false);
    if (resultado.ok) this.borrando.set(null);
  }

  protected textoDelFallo(fallo: FalloUbicaciones, t: (clave: string) => string): string {
    switch (fallo.tipo) {
      case 'sin-permiso':
      case 'red':
        return t(`panel.mapa.fallo.${fallo.tipo}`);
      default:
        return t('panel.mapa.fallo.desconocido');
    }
  }
}
