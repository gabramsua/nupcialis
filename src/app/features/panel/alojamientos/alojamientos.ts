import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslocoDirective } from '@jsverse/transloco';

import { NpAlert } from '../../../design-system/components/alert/alert';
import { NpButton } from '../../../design-system/components/button/button';
import { NpEmptyState } from '../../../design-system/components/empty-state/empty-state';
import { NpModal } from '../../../design-system/components/modal/modal';
import { NpStatusChip } from '../../../design-system/components/status-chip/status-chip';
import { NpIcon } from '../../../design-system/icons/icon';
import type {
  AlojamientoDelPanel,
  FalloAlojamientos,
} from '../../../core/alojamientos/alojamientos-gateway';
import {
  MAX_ALOJAMIENTOS,
  MAX_CODIGO,
  MAX_DESCRIPCION,
  MAX_NOMBRE,
  TIPOS_ALOJAMIENTO,
  plazoDeReserva,
  telefonoValido,
  webValida,
  type TipoAlojamiento,
} from '../../public-site/alojamientos/alojamientos';
import { NpSelectorDeUbicacion } from '../mapa/selector-de-ubicacion';
import { AlojamientosStore } from './alojamientos.store';
import { NpInput } from '../../../design-system/components/field/input';

/**
 * Dónde dormir, donde la pareja lo apunta (§8.10).
 *
 * Esta pantalla existe para el invitado de fuera, que es quien la necesita: él
 * abre la web con prisa, busca cama cerca y reserva la primera que le cuadra.
 * De ahí las tres cosas que esta pantalla vigila y la web no puede:
 *
 * 1. **Que la ficha sea publicable.** Sin nombre no se publica —lo tira
 *    `sanearAlojamientos`— y la pareja tiene que verlo aquí, no descubrirlo
 *    mirando su propia web.
 * 2. **Que el plazo de las habitaciones bloqueadas siga vivo.** Un bloqueo
 *    vencido es la trampa del módulo: el invitado llama al hotel, no hay tarifa
 *    y la culpa parece de la pareja. Se avisa arriba, con días contados.
 * 3. **Que el teléfono y la web sirvan.** Se comprueban con las mismas
 *    funciones que el servidor, así que lo que aquí se marca mal es
 *    exactamente lo que allí se va a caer.
 */
@Component({
  selector: 'np-panel-alojamientos',
  imports: [
    ReactiveFormsModule,
    TranslocoDirective,
    NpAlert,
    NpButton,
    NpEmptyState,
    NpModal,
    NpStatusChip,
    NpIcon,
    NpInput,
    NpSelectorDeUbicacion,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <section class="al">
        <header class="al__intro">
          <div>
            <h2>{{ t('panel.alojamientos.titulo') }}</h2>
            <p>{{ t('panel.alojamientos.ayuda') }}</p>
          </div>
          <button npButton type="button" [disabled]="lleno()" (click)="nuevo()">
            <np-icon name="plus" />
            {{ t('panel.alojamientos.anadir') }}
          </button>
        </header>

        @if (lleno()) {
          <np-alert status="attention" [heading]="t('panel.alojamientos.lleno')">
            <p>{{ t('panel.alojamientos.llenoAyuda', { maximo: maximo }) }}</p>
          </np-alert>
        }

        @if (store.fallo(); as fallo) {
          <np-alert status="declined" [heading]="t('panel.alojamientos.errorGuardar')">
            <p>{{ textoDelFallo(fallo, t) }}</p>
          </np-alert>
        }

        @switch (store.estado()) {
          @case ('cargando') {
            <np-empty-state icon="bed" [title]="t('panel.alojamientos.cargando')" />
          }
          @default {
            @if (store.alojamientos().length === 0) {
              <np-empty-state
                icon="bed"
                [title]="t('panel.alojamientos.ninguno')"
                [description]="t('panel.alojamientos.ningunoDescripcion')"
              />
            } @else {
              @if (avisos().length > 0) {
                <np-alert status="attention" [heading]="t('panel.alojamientos.avisos')">
                  <ul class="al__avisos">
                    @for (aviso of avisos(); track aviso) {
                      <li>{{ aviso }}</li>
                    }
                  </ul>
                </np-alert>
              }

              <ul class="al__lista">
                @for (sitio of store.alojamientos(); track sitio.id) {
                  <li class="al__ficha" [class.al__ficha--apagada]="!sitio.enabled">
                    <p class="al__cabecera">
                      <np-icon [name]="sitio.category === 'camping' ? 'tent' : 'bed'" />
                      <strong>{{ sitio.name || t('panel.alojamientos.sinNombre') }}</strong>
                      <small>{{ t('panel.alojamientos.tipo.' + sitio.category) }}</small>
                    </p>

                    <p class="al__datos">
                      @if (sitio.pricePerNight !== null) {
                        <span>{{
                          t('panel.alojamientos.precio', { euros: sitio.pricePerNight })
                        }}</span>
                      }
                      @if (sitio.distanceKm !== null) {
                        <span>{{
                          t('panel.alojamientos.distancia', { km: sitio.distanceKm })
                        }}</span>
                      }
                      @if (sitio.blockedRooms !== null) {
                        <span>{{
                          t('panel.alojamientos.bloqueadas', { n: sitio.blockedRooms })
                        }}</span>
                      }
                    </p>

                    <span class="al__estados">
                      @if (sitio.recommended) {
                        <np-status-chip
                          status="confirmed"
                          [label]="t('panel.alojamientos.recomendado')"
                        />
                      }
                      @if (!sitio.enabled) {
                        <np-status-chip
                          status="pending"
                          [label]="t('panel.alojamientos.apagado')"
                        />
                      }
                      @if (sitio.name === '') {
                        <np-status-chip
                          status="declined"
                          [label]="t('panel.alojamientos.noPublica')"
                        />
                      }
                      @if (estadoDelPlazo(sitio) === 'cerrado') {
                        <np-status-chip
                          status="declined"
                          [label]="t('panel.alojamientos.plazoVencido')"
                        />
                      }
                    </span>

                    <div class="al__acciones">
                      <button
                        npButton
                        size="sm"
                        variant="ghost"
                        type="button"
                        (click)="alternar(sitio)"
                      >
                        <np-icon [name]="sitio.enabled ? 'eye' : 'eye-slash'" />
                        {{
                          sitio.enabled
                            ? t('panel.alojamientos.quitar')
                            : t('panel.alojamientos.poner')
                        }}
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
            [heading]="
              cual === 'nuevo' ? t('panel.alojamientos.nuevo') : t('panel.alojamientos.editar')
            "
            (closed)="editando.set(null)"
          >
            <form class="al__form" [formGroup]="formulario" (submit)="enviar($event)">
              <label>
                {{ t('panel.alojamientos.campo.nombre') }}
                <input npInput formControlName="name" [attr.maxlength]="maximoNombre" />
              </label>

              <label>
                {{ t('panel.alojamientos.campo.tipo') }}
                <select npInput formControlName="category">
                  @for (tipo of tipos; track tipo) {
                    <option [value]="tipo">{{ t('panel.alojamientos.tipo.' + tipo) }}</option>
                  }
                </select>
              </label>

              <label>
                {{ t('panel.alojamientos.campo.descripcion') }}
                <textarea
                  npInput
                  formControlName="description"
                  rows="3"
                  [attr.maxlength]="maximoDescripcion"
                ></textarea>
              </label>

              <div class="al__pareja">
                <label>
                  {{ t('panel.alojamientos.campo.precio') }}
                  <input npInput formControlName="pricePerNight" type="number" min="0" step="1" />
                </label>
                <label>
                  {{ t('panel.alojamientos.campo.distancia') }}
                  <input npInput formControlName="distanceKm" type="number" min="0" step="0.1" />
                </label>
              </div>

              <div class="al__pareja">
                <label>
                  {{ t('panel.alojamientos.campo.telefono') }}
                  <input npInput formControlName="phone" type="tel" inputmode="tel" />
                  @if (telefonoMal()) {
                    <small class="al__mal">{{ t('panel.alojamientos.campo.telefonoMal') }}</small>
                  }
                </label>
                <label>
                  {{ t('panel.alojamientos.campo.web') }}
                  <input npInput formControlName="website" type="url" inputmode="url" />
                  @if (webMal()) {
                    <small class="al__mal">{{ t('panel.alojamientos.campo.webMal') }}</small>
                  }
                </label>
              </div>

              <label>
                {{ t('panel.alojamientos.campo.codigo') }}
                <input npInput formControlName="discountCode" [attr.maxlength]="maximoCodigo" />
                <small>{{ t('panel.alojamientos.campo.codigoAyuda') }}</small>
              </label>

              <div class="al__pareja">
                <label>
                  {{ t('panel.alojamientos.campo.bloqueadas') }}
                  <input npInput formControlName="blockedRooms" type="number" min="0" step="1" />
                </label>
                <label>
                  {{ t('panel.alojamientos.campo.plazo') }}
                  <input npInput formControlName="bookingDeadline" type="date" />
                  <small>{{ t('panel.alojamientos.campo.plazoAyuda') }}</small>
                </label>
              </div>

              <np-selector-de-ubicacion
                [value]="formulario.controls.locationId.value"
                (valueChange)="formulario.controls.locationId.setValue($event)"
              />

              <label class="al__casilla">
                <input formControlName="recommended" type="checkbox" />
                <span>{{ t('panel.alojamientos.campo.recomendado') }}</span>
              </label>
              <label class="al__casilla">
                <input formControlName="enabled" type="checkbox" />
                <span>{{ t('panel.alojamientos.campo.activo') }}</span>
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
                {{ t('common.save') }}
              </button>
            </div>
          </np-modal>
        }

        @if (borrando(); as cual) {
          <np-modal [open]="true" [heading]="t('common.delete')" (closed)="borrando.set(null)">
            <p>{{ t('panel.alojamientos.confirmarBorrado', { nombre: cual.name }) }}</p>

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
    .al__intro {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-3);
      margin-block-end: var(--np-space-4);
    }
    .al__intro h2 {
      margin: 0;
      font-size: var(--np-text-xl);
      font-weight: var(--np-weight-semibold);
    }
    .al__intro p {
      margin: var(--np-space-1) 0 0;
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-sm);
    }
    @media (min-width: 48rem) {
      .al__intro {
        flex-direction: row;
        align-items: flex-start;
        justify-content: space-between;
      }
    }
    .al__avisos {
      margin: var(--np-space-1) 0 0;
      padding-inline-start: 1.1em;
    }
    .al__lista {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-2);
      margin: var(--np-space-3) 0 0;
      padding: 0;
      list-style: none;
    }
    .al__ficha {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-2);
      padding: var(--np-space-3);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-md);
      background: var(--np-surface-surface);
    }
    .al__ficha--apagada {
      border-style: dashed;
      background: var(--np-surface-canvas);
    }
    .al__cabecera {
      display: flex;
      align-items: center;
      gap: var(--np-space-2);
      margin: 0;
    }
    .al__cabecera small {
      color: var(--np-surface-text-muted);
    }
    .al__datos {
      display: flex;
      flex-wrap: wrap;
      gap: var(--np-space-1) var(--np-space-3);
      margin: 0;
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-sm);
    }
    .al__estados,
    .al__acciones {
      display: flex;
      flex-wrap: wrap;
      gap: var(--np-space-2);
    }
    .al__acciones {
      gap: var(--np-space-1);
    }
    .al__form {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-3);
    }
    .al__form label {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-1);
      font-size: var(--np-text-sm);
    }
    .al__pareja {
      display: flex;
      flex-wrap: wrap;
      gap: var(--np-space-3);
    }
    .al__pareja label {
      flex: 1;
      min-inline-size: 8rem;
    }
    .al__form small {
      color: var(--np-surface-text-muted);
    }
    .al__mal {
      color: var(--np-declined-fg);
    }
    .al__form .al__casilla {
      flex-direction: row;
      align-items: center;
      gap: var(--np-space-2);
    }
  `,
})
export class PanelAlojamientos {
  protected readonly store = inject(AlojamientosStore);
  private readonly fb = inject(FormBuilder);

  protected readonly tipos = TIPOS_ALOJAMIENTO;
  protected readonly maximo = MAX_ALOJAMIENTOS;
  protected readonly maximoNombre = MAX_NOMBRE;
  protected readonly maximoDescripcion = MAX_DESCRIPCION;
  protected readonly maximoCodigo = MAX_CODIGO;

  protected readonly editando = signal<AlojamientoDelPanel | 'nuevo' | null>(null);
  protected readonly borrando = signal<AlojamientoDelPanel | null>(null);
  protected readonly guardando = signal(false);
  protected readonly borrandoYa = signal(false);

  /** Lo que se publica es lo activo: a partir de ahí, el límite es el de la web. */
  protected readonly lleno = computed(
    () => this.store.alojamientos().filter((sitio) => sitio.enabled).length >= MAX_ALOJAMIENTOS,
  );

  protected readonly formulario = this.fb.nonNullable.group({
    name: ['', Validators.required],
    category: ['hotel' as TipoAlojamiento],
    description: [''],
    // Angular pone `NumberValueAccessor` en un `input[type=number]`, así que
    // estos tres controles valen `number | null` y no texto: lo que no es un
    // número llega ya como `null`.
    pricePerNight: [null as number | null],
    distanceKm: [null as number | null],
    phone: [''],
    website: [''],
    discountCode: [''],
    blockedRooms: [null as number | null],
    bookingDeadline: [''],
    recommended: [false],
    locationId: [''],
    enabled: [true],
  });

  /**
   * Lo que la pareja no puede ver mirando la lista.
   *
   * Todo lo que sale aquí tiene consecuencia para el invitado: una ficha que no
   * se publica, un bloqueo que ya no existe o unas habitaciones reservadas sin
   * fecha hasta la que valen.
   */
  protected readonly avisos = computed(() => {
    const avisos: string[] = [];
    const activos = this.store.alojamientos().filter((sitio) => sitio.enabled);

    if (activos.length === 0) {
      avisos.push(
        'Ningún alojamiento está activo: la sección sale vacía en la web. Activa al menos uno o quita la sección.',
      );
    }

    for (const sitio of this.store.alojamientos()) {
      const nombre = sitio.name || 'Sin nombre';

      if (sitio.name === '') {
        avisos.push('Hay una ficha sin nombre: tal como está no se publica.');
        continue;
      }

      if (!sitio.enabled) continue;

      const plazo = plazoDeReserva(sitio.bookingDeadline);

      if (plazo.estado === 'cerrado') {
        avisos.push(
          `El plazo de «${nombre}» ya ha vencido: el invitado ve que el bloqueo se ha acabado. Amplíalo o quita la fecha.`,
        );
      } else if (plazo.estado === 'ultimos' || plazo.estado === 'hoy') {
        const dias = plazo.estado === 'hoy' ? 'hoy' : `en ${plazo.dias} días`;
        avisos.push(`El plazo de «${nombre}» acaba ${dias}: avisa a quien falte por reservar.`);
      } else if (sitio.blockedRooms !== null && sitio.bookingDeadline === null) {
        avisos.push(
          `«${nombre}» tiene ${sitio.blockedRooms} habitaciones bloqueadas sin fecha límite: pon hasta cuándo valen.`,
        );
      }

      if (sitio.phone === null && sitio.website === null) {
        avisos.push(`«${nombre}» no tiene teléfono ni web: el invitado no puede reservar.`);
      }
    }

    return avisos;
  });

  /** Lo mismo que comprueba el servidor, mientras se escribe. */
  protected readonly telefonoMal = computed(() => {
    const valor = this.valores().phone.trim();
    return valor !== '' && telefonoValido(valor) === null;
  });

  protected readonly webMal = computed(() => {
    const valor = this.valores().website.trim();
    return valor !== '' && webValida(valor) === null;
  });

  /** El valor del formulario como signal, para que los avisos se recalculen. */
  private readonly valores = signal(this.formulario.getRawValue());

  constructor() {
    this.formulario.valueChanges.subscribe(() => this.valores.set(this.formulario.getRawValue()));
    void this.store.cargar();
  }

  protected estadoDelPlazo(sitio: AlojamientoDelPanel): string {
    return plazoDeReserva(sitio.bookingDeadline).estado;
  }

  protected nuevo(): void {
    this.formulario.reset({
      name: '',
      category: 'hotel',
      description: '',
      pricePerNight: null,
      distanceKm: null,
      phone: '',
      website: '',
      discountCode: '',
      blockedRooms: null,
      bookingDeadline: '',
      recommended: false,
      locationId: '',
      enabled: true,
    });
    this.editando.set('nuevo');
  }

  protected editar(sitio: AlojamientoDelPanel): void {
    this.formulario.reset({
      name: sitio.name,
      category: sitio.category,
      description: sitio.description,
      pricePerNight: sitio.pricePerNight,
      distanceKm: sitio.distanceKm,
      phone: sitio.phone ?? '',
      website: sitio.website ?? '',
      discountCode: sitio.discountCode,
      blockedRooms: sitio.blockedRooms,
      bookingDeadline: sitio.bookingDeadline ?? '',
      recommended: sitio.recommended,
      locationId: sitio.locationId ?? '',
      enabled: sitio.enabled,
    });
    this.editando.set(sitio);
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
    this.guardando.set(true);

    const resultado = await this.store.guardar({
      id: nuevo ? undefined : cual.id,
      name: valores.name.trim(),
      category: valores.category,
      description: valores.description.trim(),
      pricePerNight: positivo(valores.pricePerNight),
      distanceKm: positivo(valores.distanceKm),
      // Se guarda ya normalizado: así lo que la pareja ve al volver es lo mismo
      // que va a usar la web para el enlace.
      phone: telefonoValido(valores.phone),
      website: webValida(valores.website),
      discountCode: valores.discountCode.trim(),
      blockedRooms: positivo(valores.blockedRooms),
      bookingDeadline: valores.bookingDeadline === '' ? null : valores.bookingDeadline,
      recommended: valores.recommended,
      locationId: valores.locationId === '' ? null : valores.locationId,
      enabled: valores.enabled,
      // El orden dentro de su grupo. Los recomendados van antes en cualquier caso.
      order: nuevo ? this.store.alojamientos().length + 1 : cual.order,
    });

    this.guardando.set(false);
    if (resultado.ok) this.editando.set(null);
  }

  /** Quitar de la web y volver a poner, en un toque. */
  protected async alternar(sitio: AlojamientoDelPanel): Promise<void> {
    const { id, ...resto } = sitio;
    await this.store.guardar({ ...resto, id, enabled: !sitio.enabled });
  }

  protected async borrar(): Promise<void> {
    const cual = this.borrando();
    if (!cual || this.borrandoYa()) return;

    this.borrandoYa.set(true);
    const resultado = await this.store.borrar(cual.id);
    this.borrandoYa.set(false);
    if (resultado.ok) this.borrando.set(null);
  }

  protected textoDelFallo(fallo: FalloAlojamientos, t: (clave: string) => string): string {
    switch (fallo.tipo) {
      case 'sin-permiso':
      case 'red':
        return t(`panel.alojamientos.fallo.${fallo.tipo}`);
      default:
        return t('panel.alojamientos.fallo.desconocido');
    }
  }
}

/**
 * Un número que se pueda publicar, o `null`.
 *
 * Un precio en negativo no se guarda como número: el saneador del servidor lo
 * tiraría igual (ver `numero` en el dominio) y es mejor que no llegue.
 */
function positivo(valor: number | null): number | null {
  if (valor === null || !Number.isFinite(valor) || valor < 0) return null;
  return Math.round(valor * 100) / 100;
}
