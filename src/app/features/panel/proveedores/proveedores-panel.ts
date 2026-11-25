import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';

import { NpAlert } from '../../../design-system/components/alert/alert';
import { NpButton } from '../../../design-system/components/button/button';
import { NpEmptyState } from '../../../design-system/components/empty-state/empty-state';
import { NpInput } from '../../../design-system/components/field/input';
import { NpModal } from '../../../design-system/components/modal/modal';
import { NpStatusChip } from '../../../design-system/components/status-chip/status-chip';
import { NpIcon } from '../../../design-system/icons/icon';
import { BodaStore } from '../boda.store';
import { TareasStore } from '../checklist/tareas.store';
import {
  partidasDeProveedor,
  partidasLibres,
  tareasEnlazadas,
  tareasLibres,
} from '../enlaces/enlaces';
import { NpTareasEnlazadas } from '../enlaces/tareas-enlazadas';
import { PresupuestoStore } from '../presupuesto/presupuesto.store';
import type { NpStatus } from '../../../design-system/tokens/semantic.generated';
import { centimosAEuros, centimosATexto, eurosACentimosOCero } from '../../../shared/dinero';
import { fechaMedia } from '../../../shared/fecha';
import {
  ESTADOS_PROVEEDOR,
  MAX_CATEGORIA,
  MAX_CONCEPTO_PAGO,
  MAX_CONTACTO,
  MAX_CONTRATOS,
  MAX_NOMBRE,
  MAX_NOTAS,
  MAX_PAGOS,
  nombreDeContrato,
  pagado,
  pendiente,
  validarPago,
  validarProveedor,
  type EstadoProveedor,
  type PagoDeProveedor,
  type ProveedorDelPanel,
} from './proveedores';
import { ProveedoresStore } from './proveedores.store';

/** 20 MB, lo que admiten las reglas de Storage. */
const MAX_BYTES_CONTRATO = 20 * 1024 * 1024;

/** El estado visual de cada estado del proveedor: color, icono y texto, nunca solo color. */
const ESTADO_VISUAL: Record<EstadoProveedor, NpStatus> = {
  candidate: 'pending',
  contracted: 'info',
  paid: 'confirmed',
  discarded: 'declined',
};

/**
 * Los proveedores de la boda.
 *
 * Una ficha por proveedor con su estado, lo presupuestado, lo acordado, los
 * pagos hechos y los contratos en PDF. Dentro de cada categoría se comparan los
 * candidatos: el de presupuesto más bajo sale marcado. Es solo de la pareja:
 * nada de esto se publica.
 */
@Component({
  selector: 'np-panel-proveedores',
  imports: [
    ReactiveFormsModule,
    TranslocoDirective,
    NpAlert,
    NpButton,
    NpEmptyState,
    NpIcon,
    NpInput,
    NpModal,
    NpStatusChip,
    NpTareasEnlazadas,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <section class="pv">
        <header class="pv__intro">
          <h2>{{ t('panel.proveedores.titulo') }}</h2>
          <p>{{ t('panel.proveedores.ayuda') }}</p>
        </header>

        @if (store.fallo(); as f) {
          <np-alert status="declined" [heading]="t('panel.proveedores.fallo')">
            <p>{{ t('panel.proveedores.fallos.' + f.tipo) }}</p>
          </np-alert>
        }

        @switch (store.estado()) {
          @case ('cargando') {
            <np-empty-state icon="clock-countdown" [title]="t('panel.proveedores.cargando')" />
          }
          @default {
            <ul class="pv__fichas">
              <li class="pv__ficha">
                <span>{{ t('panel.proveedores.contratados') }}</span>
                <strong>{{ store.totales().contratados }}</strong>
              </li>
              <li class="pv__ficha">
                <span>{{ t('panel.proveedores.acordado') }}</span>
                <strong>{{ euros(store.totales().acordado) }}</strong>
              </li>
              <li class="pv__ficha">
                <span>{{ t('panel.proveedores.pagado') }}</span>
                <strong>{{ euros(store.totales().pagado) }}</strong>
              </li>
              <li class="pv__ficha">
                <span>{{ t('panel.proveedores.pendiente') }}</span>
                <strong>{{ euros(store.totales().pendiente) }}</strong>
              </li>
            </ul>

            <div class="pv__acciones">
              <button npButton type="button" [disabled]="store.lleno()" (click)="nuevo()">
                <np-icon name="plus" />
                {{ t('panel.proveedores.nuevo') }}
              </button>
            </div>

            @if (store.proveedores().length === 0) {
              <np-empty-state
                icon="briefcase"
                [title]="t('panel.proveedores.vacio')"
                [description]="t('panel.proveedores.vacioDescripcion')"
              />
            }

            @for (g of store.grupos(); track g.category) {
              <section class="pv__grupo">
                <h3>{{ g.category }}</h3>
                <ul class="pv__lista">
                  @for (p of g.proveedores; track p.id) {
                    <li
                      class="pv__proveedor"
                      [class.pv__proveedor--descartado]="p.status === 'discarded'"
                    >
                      <div class="pv__cabecera">
                        <strong>{{ p.name }}</strong>
                        <np-status-chip
                          [status]="visual(p.status)"
                          [label]="t('panel.proveedores.estado.' + p.status)"
                        />
                        @if (g.masBarato === p.id) {
                          <np-status-chip
                            status="confirmed"
                            [label]="t('panel.proveedores.masBarato')"
                          />
                        }
                      </div>

                      @if (p.contactName) {
                        <span class="pv__contacto">{{ p.contactName }}</span>
                      }

                      <ul class="pv__enlaces">
                        @if (p.phone; as telefono) {
                          <li>
                            <a [href]="'tel:' + telefono">
                              <np-icon name="device-mobile" />
                              {{ telefono }}
                            </a>
                          </li>
                        }
                        @if (p.email; as correo) {
                          <li>
                            <a [href]="'mailto:' + correo">
                              <np-icon name="envelope" />
                              {{ correo }}
                            </a>
                          </li>
                        }
                        @if (p.website; as web) {
                          <li>
                            <a [href]="web" target="_blank" rel="noopener noreferrer">
                              <np-icon name="link-simple" />
                              {{ t('panel.proveedores.web') }}
                            </a>
                          </li>
                        }
                      </ul>

                      <span class="pv__cifras">
                        {{ t('panel.proveedores.presupuestado') }}:
                        {{ p.quotedCents > 0 ? euros(p.quotedCents) : '—' }} ·
                        {{ t('panel.proveedores.acordadoCorto') }}:
                        {{ p.agreedCents > 0 ? euros(p.agreedCents) : '—' }}
                      </span>

                      @if (p.agreedCents > 0 || p.payments.length > 0) {
                        <span class="pv__cifras">
                          {{ t('panel.proveedores.pagado') }}: {{ euros(pagos(p)) }} ·
                          {{ t('panel.proveedores.pendiente') }}: {{ euros(falta(p)) }}
                        </span>
                      }

                      @if (p.rating) {
                        <small>{{ t('panel.proveedores.valoracion', { n: p.rating }) }}</small>
                      }
                      @if (p.contractPaths.length > 0) {
                        <small>
                          <np-icon name="file-text" />
                          {{ t('panel.proveedores.contratosN', { n: p.contractPaths.length }) }}
                        </small>
                      }
                      @if (tareasAbiertas(p); as n) {
                        <small>
                          <np-icon name="list-checks" />
                          {{ t('panel.proveedores.tareasAbiertas', { n }) }}
                        </small>
                      }
                      @if (partidasDe(p).length > 0) {
                        <small>
                          <np-icon name="currency-eur" />
                          {{ t('panel.proveedores.enPresupuesto') }}:
                          {{ nombresDePartidas(p) }}
                        </small>
                      }
                      @if (p.notes) {
                        <small class="pv__notas">{{ p.notes }}</small>
                      }

                      <div class="pv__botones">
                        <button
                          npButton
                          size="sm"
                          variant="ghost"
                          type="button"
                          (click)="editar(p)"
                        >
                          <np-icon name="pencil-simple" />
                          {{ t('common.edit') }}
                        </button>
                        <button
                          npButton
                          size="sm"
                          variant="ghost"
                          type="button"
                          (click)="borrando.set(p)"
                        >
                          <np-icon name="trash" />
                          {{ t('common.delete') }}
                        </button>
                      </div>
                    </li>
                  }
                </ul>
              </section>
            }
          }
        }
      </section>

      @if (formAbierto()) {
        <np-modal
          [open]="true"
          [heading]="editandoId() ? t('panel.proveedores.editar') : t('panel.proveedores.nuevo')"
          (closed)="cerrarForm()"
        >
          <form class="pv__form" [formGroup]="form" (ngSubmit)="guardar()">
            <label>
              <span>{{ t('panel.proveedores.campo.nombre') }}</span>
              <input npInput type="text" formControlName="name" [attr.maxlength]="maxNombre" />
            </label>
            <label>
              <span>{{ t('panel.proveedores.campo.categoria') }}</span>
              <input
                npInput
                type="text"
                formControlName="category"
                list="pv-categorias"
                [attr.maxlength]="maxCategoria"
              />
              <datalist id="pv-categorias">
                @for (c of store.categorias(); track c) {
                  <option [value]="c"></option>
                }
              </datalist>
            </label>
            <label>
              <span>{{ t('panel.proveedores.campo.estado') }}</span>
              <select npInput formControlName="status">
                @for (e of estados; track e) {
                  <option [value]="e">{{ t('panel.proveedores.estado.' + e) }}</option>
                }
              </select>
            </label>
            <label>
              <span>{{ t('panel.proveedores.campo.contacto') }}</span>
              <input
                npInput
                type="text"
                formControlName="contactName"
                [attr.maxlength]="maxContacto"
              />
            </label>
            <label>
              <span>{{ t('panel.proveedores.campo.telefono') }}</span>
              <input npInput type="tel" formControlName="phone" />
            </label>
            <label>
              <span>{{ t('panel.proveedores.campo.email') }}</span>
              <input npInput type="email" formControlName="email" />
            </label>
            <label>
              <span>{{ t('panel.proveedores.campo.web') }}</span>
              <input npInput type="text" inputmode="url" formControlName="website" />
            </label>
            <label>
              <span>{{ t('panel.proveedores.campo.presupuesto') }}</span>
              <input npInput type="text" inputmode="decimal" formControlName="quoted" />
            </label>
            <label>
              <span>{{ t('panel.proveedores.campo.acordado') }}</span>
              <input npInput type="text" inputmode="decimal" formControlName="agreed" />
              <small>{{ t('panel.proveedores.campo.acordadoPista') }}</small>
            </label>
            <label>
              <span>{{ t('panel.proveedores.campo.valoracion') }}</span>
              <select npInput formControlName="rating">
                <option [value]="0">{{ t('panel.proveedores.sinValorar') }}</option>
                @for (n of [1, 2, 3, 4, 5]; track n) {
                  <option [value]="n">{{ t('panel.proveedores.valoracion', { n }) }}</option>
                }
              </select>
            </label>
            <label>
              <span>{{ t('panel.proveedores.campo.notas') }}</span>
              <textarea
                npInput
                rows="3"
                formControlName="notes"
                [attr.maxlength]="maxNotas"
              ></textarea>
            </label>

            <fieldset class="pv__bloque">
              <legend>{{ t('panel.proveedores.pagos.titulo') }}</legend>
              @if (pagosForm().length === 0) {
                <small>{{ t('panel.proveedores.pagos.vacio') }}</small>
              }
              <ul class="pv__pagos">
                @for (pago of pagosForm(); track $index) {
                  <li>
                    <span>
                      {{ dia(pago.on) }} · {{ euros(pago.amountCents) }}
                      @if (pago.concept) {
                        · {{ pago.concept }}
                      }
                    </span>
                    <button
                      npButton
                      size="sm"
                      variant="ghost"
                      type="button"
                      [attr.aria-label]="t('panel.proveedores.pagos.quitar')"
                      (click)="quitarPago($index)"
                    >
                      <np-icon name="trash" />
                    </button>
                  </li>
                }
              </ul>
              @if (pagosForm().length < maxPagos) {
                <div class="pv__nuevo-pago" [formGroup]="pago">
                  <input
                    npInput
                    type="text"
                    inputmode="decimal"
                    formControlName="importe"
                    [placeholder]="t('panel.proveedores.pagos.importe')"
                    [attr.aria-label]="t('panel.proveedores.pagos.importe')"
                  />
                  <input
                    npInput
                    type="date"
                    formControlName="fecha"
                    [attr.aria-label]="t('panel.proveedores.pagos.fecha')"
                  />
                  <input
                    npInput
                    type="text"
                    formControlName="concepto"
                    [placeholder]="t('panel.proveedores.pagos.concepto')"
                    [attr.aria-label]="t('panel.proveedores.pagos.concepto')"
                    [attr.maxlength]="maxConceptoPago"
                  />
                  <button npButton variant="secondary" type="button" (click)="anadirPago()">
                    <np-icon name="plus" />
                    {{ t('panel.proveedores.pagos.anadir') }}
                  </button>
                </div>
              }
              @if (errorPago(); as e) {
                <p class="pv__error" role="alert">
                  <np-icon name="warning" />
                  {{ e }}
                </p>
              }
            </fieldset>

            <fieldset class="pv__bloque">
              <legend>{{ t('panel.proveedores.contratos.titulo') }}</legend>
              @if (!actual()) {
                <small>{{ t('panel.proveedores.contratos.primeroGuarda') }}</small>
              } @else {
                @if (actual()!.contractPaths.length === 0) {
                  <small>{{ t('panel.proveedores.contratos.vacio') }}</small>
                }
                <ul class="pv__pagos">
                  @for (ruta of actual()!.contractPaths; track ruta) {
                    <li>
                      <button
                        npButton
                        size="sm"
                        variant="ghost"
                        type="button"
                        (click)="abrir(ruta)"
                      >
                        <np-icon name="file-text" />
                        {{ nombreContrato(ruta) }}
                      </button>
                      <button
                        npButton
                        size="sm"
                        variant="ghost"
                        type="button"
                        [attr.aria-label]="t('panel.proveedores.contratos.quitar')"
                        (click)="quitarContrato(ruta)"
                      >
                        <np-icon name="trash" />
                      </button>
                    </li>
                  }
                </ul>
                @if (actual()!.contractPaths.length < maxContratos) {
                  <label class="pv__subir">
                    <span class="pv__subir-texto">
                      <np-icon name="upload-simple" />
                      {{ t('panel.proveedores.contratos.subir') }}
                    </span>
                    <input
                      type="file"
                      accept="application/pdf"
                      [disabled]="subiendo()"
                      (change)="subirContrato($event)"
                    />
                  </label>
                }
              }
              @if (errorContrato(); as e) {
                <p class="pv__error" role="alert">
                  <np-icon name="warning" />
                  {{ e }}
                </p>
              }
            </fieldset>

            @if (actual(); as ficha) {
              @if (conTareas()) {
                <np-tareas-enlazadas
                  [enlazadas]="tareasDe(ficha)"
                  [libres]="tareasLibresDeProveedor()"
                  [ocupado]="enlazando() || tareasStore.lleno()"
                  (enlazar)="enlazarTarea($event)"
                  (desenlazar)="desenlazarTarea($event)"
                  (crear)="crearTarea($event)"
                />
              }
              @if (conPresupuesto()) {
                <fieldset class="pv__bloque">
                  <legend>{{ t('panel.enlaces.partidas.titulo') }}</legend>
                  @if (partidasDe(ficha).length === 0) {
                    <small>{{ t('panel.enlaces.partidas.ninguna') }}</small>
                  } @else {
                    <ul class="pv__pagos">
                      @for (partida of partidasDe(ficha); track partida.id) {
                        <li>
                          <span>
                            {{ partida.concept }} ·
                            {{ euros(partida.actualCents || partida.estimatedCents) }}
                          </span>
                          <button
                            npButton
                            size="sm"
                            variant="ghost"
                            type="button"
                            [disabled]="enlazando()"
                            [attr.aria-label]="
                              t('panel.enlaces.partidas.quitarDe', { p: partida.concept })
                            "
                            (click)="desenlazarPartida(partida.id)"
                          >
                            <np-icon name="x" />
                            {{ t('panel.enlaces.partidas.quitar') }}
                          </button>
                        </li>
                      }
                    </ul>
                  }
                  @if (partidasSinProveedor().length > 0) {
                    <label>
                      {{ t('panel.enlaces.partidas.enlazarExistente') }}
                      <select
                        npInput
                        [value]="partidaElegida()"
                        (change)="partidaElegida.set($any($event.target).value)"
                      >
                        <option value="">{{ t('panel.enlaces.partidas.elige') }}</option>
                        @for (partida of partidasSinProveedor(); track partida.id) {
                          <option [value]="partida.id" [selected]="partidaElegida() === partida.id">
                            {{ partida.concept }}
                          </option>
                        }
                      </select>
                    </label>
                    <button
                      npButton
                      variant="secondary"
                      size="sm"
                      type="button"
                      [disabled]="enlazando() || partidaElegida() === ''"
                      (click)="enlazarPartida()"
                    >
                      {{ t('panel.enlaces.partidas.enlazar') }}
                    </button>
                  }
                </fieldset>
              }
            }

            @if (errorForm(); as e) {
              <p class="pv__error" role="alert">
                <np-icon name="warning" />
                {{ e }}
              </p>
            }
          </form>
          <div np-modal-actions>
            <button npButton variant="ghost" type="button" (click)="cerrarForm()">
              {{ t('common.cancel') }}
            </button>
            <button npButton type="button" [loading]="guardando()" (click)="guardar()">
              <np-icon name="check" />
              {{ t('common.save') }}
            </button>
          </div>
        </np-modal>
      }

      @if (borrando(); as p) {
        <np-modal [open]="true" [heading]="t('common.delete')" (closed)="borrando.set(null)">
          <p>{{ t('panel.proveedores.borrarConfirmar', { c: p.name }) }}</p>
          @if (p.contractPaths.length > 0) {
            <p>{{ t('panel.proveedores.borrarContratos', { n: p.contractPaths.length }) }}</p>
          }
          <div np-modal-actions>
            <button npButton variant="ghost" type="button" (click)="borrando.set(null)">
              {{ t('common.cancel') }}
            </button>
            <button
              npButton
              variant="danger"
              type="button"
              [loading]="guardando()"
              (click)="borrar()"
            >
              <np-icon name="trash" />
              {{ t('common.delete') }}
            </button>
          </div>
        </np-modal>
      }
    </ng-container>
  `,
  styles: `
    .pv,
    .pv__grupo,
    .pv__form {
      display: grid;
      gap: var(--np-space-3);
    }
    .pv {
      gap: var(--np-space-5);
      max-inline-size: 48rem;
    }
    .pv__intro h2,
    .pv__intro p,
    .pv__grupo h3 {
      margin: 0;
    }
    .pv__intro p,
    .pv__ficha span,
    .pv__proveedor small,
    .pv__contacto,
    .pv__form small {
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-sm);
    }
    .pv__fichas {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--np-space-3);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    @media (min-width: 40rem) {
      .pv__fichas {
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }
    }
    .pv__ficha,
    .pv__proveedor {
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-md);
      background: var(--np-surface-surface);
    }
    .pv__ficha {
      display: grid;
      gap: var(--np-space-1);
      padding: var(--np-space-3);
    }
    .pv__ficha strong {
      font-size: var(--np-text-lg);
    }
    .pv__acciones,
    .pv__botones,
    .pv__cabecera,
    .pv__enlaces {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--np-space-2);
    }
    .pv__grupo h3 {
      font-size: var(--np-text-base);
    }
    .pv__lista,
    .pv__enlaces,
    .pv__pagos {
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .pv__lista {
      display: grid;
      gap: var(--np-space-2);
    }
    .pv__proveedor {
      display: grid;
      gap: var(--np-space-1);
      padding: var(--np-space-3);
      overflow-wrap: anywhere;
    }
    .pv__proveedor--descartado {
      opacity: 0.7;
    }
    .pv__enlaces a {
      display: inline-flex;
      align-items: center;
      gap: var(--np-space-1);
      min-block-size: var(--np-tap-target);
      color: var(--np-surface-text);
    }
    .pv__notas {
      white-space: pre-line;
    }
    .pv__form label {
      display: grid;
      gap: var(--np-space-1);
    }
    .pv__bloque {
      display: grid;
      gap: var(--np-space-2);
      margin: 0;
      padding: var(--np-space-3);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-md);
    }
    .pv__pagos {
      display: grid;
      gap: var(--np-space-1);
    }
    .pv__pagos li {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--np-space-2);
    }
    .pv__nuevo-pago {
      display: grid;
      gap: var(--np-space-2);
    }
    .pv__subir {
      display: flex;
      align-items: center;
      gap: var(--np-space-2);
    }
    .pv__subir-texto {
      display: inline-flex;
      align-items: center;
      gap: var(--np-space-1);
      color: var(--np-surface-text);
    }
    .pv__error {
      display: flex;
      align-items: center;
      gap: var(--np-space-1);
      margin: 0;
      color: var(--np-declined-fg);
      font-size: var(--np-text-sm);
    }
  `,
})
export class PanelProveedores {
  protected readonly store = inject(ProveedoresStore);
  protected readonly tareasStore = inject(TareasStore);
  protected readonly presupuesto = inject(PresupuestoStore);
  private readonly boda = inject(BodaStore);
  private readonly i18n = inject(TranslocoService);

  /** Los bloques de tareas y partidas existen solo si la boda tiene ese módulo. */
  protected readonly conTareas = computed(
    () => this.boda.boda()?.modulos['checklist']?.enabled === true,
  );
  protected readonly conPresupuesto = computed(
    () => this.boda.boda()?.modulos['budget']?.enabled === true,
  );
  protected readonly enlazando = signal(false);
  protected readonly partidaElegida = signal('');

  protected readonly estados = ESTADOS_PROVEEDOR;
  protected readonly maxNombre = MAX_NOMBRE;
  protected readonly maxCategoria = MAX_CATEGORIA;
  protected readonly maxContacto = MAX_CONTACTO;
  protected readonly maxNotas = MAX_NOTAS;
  protected readonly maxPagos = MAX_PAGOS;
  protected readonly maxConceptoPago = MAX_CONCEPTO_PAGO;
  protected readonly maxContratos = MAX_CONTRATOS;

  protected readonly formAbierto = signal(false);
  protected readonly editandoId = signal<string | null>(null);
  protected readonly guardando = signal(false);
  protected readonly subiendo = signal(false);
  protected readonly errorForm = signal<string | null>(null);
  protected readonly errorPago = signal<string | null>(null);
  protected readonly errorContrato = signal<string | null>(null);
  protected readonly borrando = signal<ProveedorDelPanel | null>(null);
  protected readonly pagosForm = signal<readonly PagoDeProveedor[]>([]);

  /** La ficha que se está editando, **tal como está ahora** (tras subir un contrato, por ejemplo). */
  protected readonly actual = computed(
    () => this.store.proveedores().find((p) => p.id === this.editandoId()) ?? null,
  );

  protected readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true }),
    category: new FormControl('', { nonNullable: true }),
    status: new FormControl<EstadoProveedor>('candidate', { nonNullable: true }),
    contactName: new FormControl('', { nonNullable: true }),
    phone: new FormControl('', { nonNullable: true }),
    email: new FormControl('', { nonNullable: true }),
    website: new FormControl('', { nonNullable: true }),
    quoted: new FormControl('', { nonNullable: true }),
    agreed: new FormControl('', { nonNullable: true }),
    rating: new FormControl(0, { nonNullable: true }),
    notes: new FormControl('', { nonNullable: true }),
  });

  protected readonly pago = new FormGroup({
    importe: new FormControl('', { nonNullable: true }),
    fecha: new FormControl('', { nonNullable: true }),
    concepto: new FormControl('', { nonNullable: true }),
  });

  protected readonly euros = (centimos: number): string => centimosAEuros(centimos);
  protected readonly dia = (iso: string): string => fechaMedia(new Date(`${iso}T00:00:00Z`), 'es');
  protected readonly visual = (estado: EstadoProveedor): NpStatus => ESTADO_VISUAL[estado];
  protected readonly pagos = pagado;
  protected readonly falta = pendiente;
  protected readonly nombreContrato = nombreDeContrato;

  constructor() {
    void this.store.cargar();
    if (this.conTareas()) void this.tareasStore.cargar();
    if (this.conPresupuesto()) void this.presupuesto.cargar();
  }

  protected tareasDe(p: ProveedorDelPanel) {
    return tareasEnlazadas(this.tareasStore.tareas(), 'vendorId', p.id);
  }

  protected tareasAbiertas(p: ProveedorDelPanel): number {
    return this.tareasDe(p).filter((t) => !t.done).length;
  }

  protected tareasLibresDeProveedor() {
    return tareasLibres(this.tareasStore.tareas(), 'vendorId');
  }

  protected partidasDe(p: ProveedorDelPanel) {
    return partidasDeProveedor(this.presupuesto.partidas(), p.id);
  }

  protected nombresDePartidas(p: ProveedorDelPanel): string {
    return this.partidasDe(p)
      .map((x) => x.concept)
      .join(', ');
  }

  protected partidasSinProveedor() {
    return partidasLibres(this.presupuesto.partidas());
  }

  /** Corre una operación de enlace con el botón bloqueado mientras dura. */
  private async enlazar(operacion: () => Promise<unknown>): Promise<void> {
    if (this.enlazando()) return;
    this.enlazando.set(true);
    await operacion();
    this.enlazando.set(false);
  }

  protected enlazarTarea(id: string): Promise<void> {
    const ficha = this.actual();
    if (!ficha) return Promise.resolve();
    return this.enlazar(() => this.tareasStore.enlazar(id, { vendorId: ficha.id }));
  }

  protected desenlazarTarea(id: string): Promise<void> {
    return this.enlazar(() => this.tareasStore.enlazar(id, { vendorId: null }));
  }

  /** Una tarea nueva ya enlazada: en «Proveedores», a nombre de los dos, sin fecha. */
  protected crearTarea(titulo: string): Promise<void> {
    const ficha = this.actual();
    if (!ficha) return Promise.resolve();
    return this.enlazar(() =>
      this.tareasStore.guardar({
        title: titulo,
        description: '',
        category: 'Proveedores',
        dueDate: null,
        assignedTo: 'both',
        priority: 'normal',
        vendorId: ficha.id,
        budgetItemId: null,
      }),
    );
  }

  protected enlazarPartida(): Promise<void> {
    const ficha = this.actual();
    const id = this.partidaElegida();
    if (!ficha || id === '') return Promise.resolve();
    this.partidaElegida.set('');
    return this.enlazar(() => this.presupuesto.enlazarProveedor(id, ficha.id));
  }

  protected desenlazarPartida(id: string): Promise<void> {
    return this.enlazar(() => this.presupuesto.enlazarProveedor(id, null));
  }

  protected nuevo(): void {
    this.form.reset({ status: 'candidate', rating: 0 });
    this.pago.reset();
    this.pagosForm.set([]);
    this.editandoId.set(null);
    this.limpiarErrores();
    this.formAbierto.set(true);
  }

  protected editar(p: ProveedorDelPanel): void {
    this.form.reset({
      name: p.name,
      category: p.category,
      status: p.status,
      contactName: p.contactName,
      phone: p.phone ?? '',
      email: p.email ?? '',
      website: p.website ?? '',
      quoted: p.quotedCents > 0 ? centimosATexto(p.quotedCents) : '',
      agreed: p.agreedCents > 0 ? centimosATexto(p.agreedCents) : '',
      rating: p.rating ?? 0,
      notes: p.notes,
    });
    this.pago.reset();
    this.pagosForm.set(p.payments);
    this.editandoId.set(p.id);
    this.limpiarErrores();
    this.formAbierto.set(true);
  }

  protected cerrarForm(): void {
    this.formAbierto.set(false);
  }

  protected anadirPago(): void {
    const v = this.pago.getRawValue();
    const validado = validarPago(v, eurosACentimosOCero);
    if (!validado.ok) {
      this.errorPago.set(this.i18n.translate(`panel.proveedores.pagos.error.${validado.motivo}`));
      return;
    }
    this.errorPago.set(null);
    this.pagosForm.update((lista) =>
      [...lista, validado.pago].sort((a, b) => a.on.localeCompare(b.on)),
    );
    this.pago.reset();
  }

  protected quitarPago(indice: number): void {
    this.pagosForm.update((lista) => lista.filter((_, i) => i !== indice));
  }

  protected async guardar(): Promise<void> {
    if (this.guardando()) return;

    const v = this.form.getRawValue();
    const validado = validarProveedor({ ...v, rating: Number(v.rating) }, eurosACentimosOCero);

    if (!validado.ok) {
      this.errorForm.set(this.i18n.translate(`panel.proveedores.error.${validado.motivo}`));
      return;
    }

    this.errorForm.set(null);
    this.guardando.set(true);
    const resultado = await this.store.guardar(this.editandoId(), {
      ...validado.datos,
      payments: this.pagosForm(),
      // Los contratos se suben y se quitan aparte; aquí se conservan tal cual.
      contractPaths: this.actual()?.contractPaths ?? [],
    });
    this.guardando.set(false);

    if (resultado.ok) this.formAbierto.set(false);
  }

  protected async subirContrato(evento: Event): Promise<void> {
    const entrada = evento.target as HTMLInputElement;
    const fichero = entrada.files?.[0];
    const ficha = this.actual();
    entrada.value = '';
    if (!fichero || !ficha || this.subiendo()) return;

    if (fichero.type !== 'application/pdf') {
      this.errorContrato.set(this.i18n.translate('panel.proveedores.contratos.error.tipo'));
      return;
    }
    if (fichero.size > MAX_BYTES_CONTRATO) {
      this.errorContrato.set(this.i18n.translate('panel.proveedores.contratos.error.tamano'));
      return;
    }

    this.errorContrato.set(null);
    this.subiendo.set(true);
    const ok = await this.store.subirContrato(ficha, fichero);
    this.subiendo.set(false);
    if (!ok) {
      this.errorContrato.set(this.i18n.translate('panel.proveedores.contratos.error.subida'));
    }
  }

  protected async quitarContrato(ruta: string): Promise<void> {
    const ficha = this.actual();
    if (!ficha) return;
    this.errorContrato.set(null);
    await this.store.quitarContrato(ficha, ruta);
  }

  protected async abrir(ruta: string): Promise<void> {
    const url = await this.store.urlDeContrato(ruta);
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
    else this.errorContrato.set(this.i18n.translate('panel.proveedores.contratos.error.abrir'));
  }

  protected async borrar(): Promise<void> {
    const p = this.borrando();
    if (!p || this.guardando()) return;

    this.guardando.set(true);
    const resultado = await this.store.borrar(p);
    this.guardando.set(false);
    if (resultado.ok) this.borrando.set(null);
  }

  private limpiarErrores(): void {
    this.errorForm.set(null);
    this.errorPago.set(null);
    this.errorContrato.set(null);
  }
}
