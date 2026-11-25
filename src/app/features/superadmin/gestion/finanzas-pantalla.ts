import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';

import { PUERTA_GESTION, type FalloGestion } from '../../../core/superadmin/gestion-gateway';
import { NpAlert } from '../../../design-system/components/alert/alert';
import { NpButton } from '../../../design-system/components/button/button';
import { NpEmptyState } from '../../../design-system/components/empty-state/empty-state';
import { NpInput } from '../../../design-system/components/field/input';
import { NpModal } from '../../../design-system/components/modal/modal';
import { NpStatusChip } from '../../../design-system/components/status-chip/status-chip';
import { NpIcon } from '../../../design-system/icons/icon';
import { fechaMedia } from '../../../shared/fecha';
import {
  ESTADOS_PAGO,
  METODOS_PAGO,
  centimosAEuros,
  centimosATexto,
  diaAFecha,
  eurosACentimos,
  pagosACsv,
  totalesDePagos,
  type BodaMinima,
  type DatosDeFinanzas,
  type EstadoPago,
  type MetodoPago,
  type Pago,
} from './gestion';

type Carga = 'cargando' | 'lista' | 'error';

/** Los campos del formulario que el servidor puede rechazar, y su mensaje. */
const MOTIVOS: Record<string, string> = {
  boda: 'superadmin.finanzas.error.boda',
  importe: 'superadmin.finanzas.error.importe',
  concepto: 'superadmin.finanzas.error.concepto',
  metodo: 'superadmin.finanzas.error.metodo',
  estado: 'superadmin.finanzas.error.estado',
  fecha: 'superadmin.finanzas.error.fecha',
  factura: 'superadmin.finanzas.error.factura',
  notas: 'superadmin.finanzas.error.notas',
};

/**
 * Los cobros de Nupcialis (S1.3e).
 *
 * No hay pasarela: es el libro de cuentas de Gabriel. Cada cobro cuelga de una
 * boda y lleva su método (Bizum, transferencia, efectivo) y el número de la
 * factura, que se emite fuera de aquí. Lo que no hace es inventar precios: el
 * importe lo escribe quien cobra (D-02 sigue abierta).
 */
/**
 * ¿Cae este cobro dentro del rango? Los días son `AAAA-MM-DD`, así que comparar
 * cadenas es comparar fechas. Con rango puesto, lo que no tiene fecha de cobro
 * (lo pendiente) queda fuera: no se sabe en qué periodo caería.
 */
export function enRango(dia: string | null, desde: string, hasta: string): boolean {
  if (desde === '' && hasta === '') return true;
  if (!dia) return false;
  return (desde === '' || dia >= desde) && (hasta === '' || dia <= hasta);
}

function iso(f: Date): string {
  const m = String(f.getMonth() + 1).padStart(2, '0');
  const d = String(f.getDate()).padStart(2, '0');
  return `${f.getFullYear()}-${m}-${d}`;
}

/** Los extremos de un rango rápido, a partir de «hoy». `todo` los vacía. */
export function limitesDeRango(
  rango: 'mes' | 'mesAnterior' | 'anio' | 'todo',
  hoy: Date,
): readonly [string, string] {
  const a = hoy.getFullYear();
  const m = hoy.getMonth();
  switch (rango) {
    case 'mes':
      return [iso(new Date(a, m, 1)), iso(new Date(a, m + 1, 0))];
    case 'mesAnterior':
      return [iso(new Date(a, m - 1, 1)), iso(new Date(a, m, 0))];
    case 'anio':
      return [`${a}-01-01`, `${a}-12-31`];
    default:
      return ['', ''];
  }
}

@Component({
  selector: 'np-finanzas',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    TranslocoDirective,
    NpAlert,
    NpButton,
    NpEmptyState,
    NpIcon,
    NpInput,
    NpModal,
    NpStatusChip,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <header class="fi__cabecera">
        <a class="fi__volver" routerLink="/superadmin">
          <np-icon name="arrow-left" />
          {{ t('superadmin.ficha.volver') }}
        </a>
        <h1>{{ t('superadmin.finanzas.titulo') }}</h1>
      </header>

      <main class="fi__cuerpo">
        @switch (carga()) {
          @case ('cargando') {
            <np-empty-state icon="clock-countdown" [title]="t('superadmin.finanzas.cargando')" />
          }
          @case ('error') {
            <np-alert status="declined" [heading]="t('superadmin.finanzas.errorCarga')">
              <p>{{ textoDeFallo(fallo(), t) }}</p>
              <button npButton size="sm" type="button" (click)="cargar()">
                <np-icon name="arrows-clockwise" />
                {{ t('common.retry') }}
              </button>
            </np-alert>
          }
          @default {
            @if (datos(); as d) {
              <ul class="fi__fichas">
                <li class="fi__ficha">
                  <np-icon name="check-circle" />
                  <strong>{{ euros(totales().cobrado) }}</strong>
                  <span>{{ t('superadmin.finanzas.cobrado') }}</span>
                </li>
                <li class="fi__ficha">
                  <np-icon name="clock" />
                  <strong>{{ euros(totales().pendiente) }}</strong>
                  <span>{{ t('superadmin.finanzas.pendiente') }}</span>
                </li>
                <li class="fi__ficha">
                  <np-icon name="file-text" />
                  <strong>{{ totales().cobros }}</strong>
                  <span>{{ t('superadmin.finanzas.cobros') }}</span>
                </li>
              </ul>

              @if (d.recortado) {
                <np-alert status="pending" [heading]="t('superadmin.finanzas.recortado')" />
              }

              <div class="fi__barra" role="search">
                <label>
                  <span>{{ t('superadmin.finanzas.filtroBoda') }}</span>
                  <select
                    npInput
                    [value]="filtroBoda()"
                    (change)="filtroBoda.set($any($event.target).value)"
                  >
                    <option value="">{{ t('superadmin.finanzas.todasLasBodas') }}</option>
                    @for (b of bodasOrdenadas(); track b.weddingId) {
                      <option [value]="b.weddingId">{{ nombreDe(b.weddingId, t) }}</option>
                    }
                  </select>
                </label>
                <label>
                  <span>{{ t('superadmin.finanzas.filtroEstado') }}</span>
                  <select
                    npInput
                    [value]="filtroEstado()"
                    (change)="filtroEstado.set($any($event.target).value)"
                  >
                    <option value="">{{ t('superadmin.finanzas.todos') }}</option>
                    @for (e of estados; track e) {
                      <option [value]="e">{{ t('superadmin.finanzas.estado.' + e) }}</option>
                    }
                  </select>
                </label>
                <label>
                  <span>{{ t('superadmin.finanzas.desde') }}</span>
                  <input
                    npInput
                    type="date"
                    [value]="desde()"
                    [max]="hasta() || null"
                    (change)="desde.set($any($event.target).value)"
                  />
                </label>
                <label>
                  <span>{{ t('superadmin.finanzas.hasta') }}</span>
                  <input
                    npInput
                    type="date"
                    [value]="hasta()"
                    [min]="desde() || null"
                    (change)="hasta.set($any($event.target).value)"
                  />
                </label>
                <div
                  class="fi__rapidos"
                  role="group"
                  [attr.aria-label]="t('superadmin.finanzas.rango')"
                >
                  @for (r of rangos; track r) {
                    <button
                      npButton
                      variant="ghost"
                      size="sm"
                      type="button"
                      (click)="aplicarRango(r)"
                    >
                      {{ t('superadmin.finanzas.rangos.' + r) }}
                    </button>
                  }
                </div>
                @if (hayRango()) {
                  <p class="fi__aviso">{{ t('superadmin.finanzas.rangoAviso') }}</p>
                }
                <div class="fi__acciones">
                  <button
                    npButton
                    variant="secondary"
                    type="button"
                    [disabled]="visibles().length === 0"
                    (click)="exportar(t)"
                  >
                    <np-icon name="download-simple" />
                    {{ t('superadmin.finanzas.exportar') }}
                  </button>
                  <button npButton type="button" (click)="nuevo()">
                    <np-icon name="plus" />
                    {{ t('superadmin.finanzas.nuevo') }}
                  </button>
                </div>
              </div>

              @if (visibles().length === 0) {
                <np-empty-state
                  icon="currency-eur"
                  [title]="t('superadmin.finanzas.ninguno')"
                  [description]="t('superadmin.finanzas.ningunoDescripcion')"
                />
              } @else {
                <div class="np-table-scroll">
                  <table class="np-table">
                    <thead>
                      <tr>
                        <th>{{ t('superadmin.finanzas.columna.boda') }}</th>
                        <th>{{ t('superadmin.finanzas.columna.concepto') }}</th>
                        <th>{{ t('superadmin.finanzas.columna.importe') }}</th>
                        <th>{{ t('superadmin.finanzas.columna.metodo') }}</th>
                        <th>{{ t('superadmin.finanzas.columna.estado') }}</th>
                        <th>{{ t('superadmin.finanzas.columna.factura') }}</th>
                        <th>{{ t('superadmin.bodas.columna.acciones') }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (p of visibles(); track p.id) {
                        <tr>
                          <td>
                            <a [routerLink]="['/superadmin/bodas', p.weddingId]">
                              {{ nombreDe(p.weddingId, t) }}
                            </a>
                          </td>
                          <td>{{ p.concept }}</td>
                          <td>{{ euros(p.amountCents) }}</td>
                          <td>{{ t('superadmin.finanzas.metodo.' + p.method) }}</td>
                          <td>
                            <np-status-chip
                              [status]="p.status === 'paid' ? 'confirmed' : 'pending'"
                              [label]="t('superadmin.finanzas.estado.' + p.status)"
                            />
                            @if (p.paidOn) {
                              <div class="fi__tenue">{{ dia(p.paidOn) }}</div>
                            }
                          </td>
                          <td>{{ p.invoiceNumber || t('superadmin.finanzas.sinFactura') }}</td>
                          <td>
                            <div class="fi__acciones">
                              <button
                                npButton
                                size="sm"
                                variant="secondary"
                                type="button"
                                (click)="editar(p)"
                              >
                                <np-icon name="pencil-simple" />
                                {{ t('superadmin.finanzas.editar') }}
                              </button>
                              <button
                                npButton
                                size="sm"
                                variant="danger"
                                type="button"
                                (click)="pedirBorrado(p)"
                              >
                                <np-icon name="trash" />
                                {{ t('common.delete') }}
                              </button>
                            </div>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            }
          }
        }
      </main>

      @if (formAbierto()) {
        <np-modal
          [open]="true"
          [heading]="
            editandoId() ? t('superadmin.finanzas.editarTitulo') : t('superadmin.finanzas.nuevo')
          "
          (closed)="cerrarForm()"
        >
          <form class="fi__form" [formGroup]="form" (ngSubmit)="guardar()">
            <label>
              <span>{{ t('superadmin.finanzas.campo.boda') }}</span>
              <select npInput formControlName="weddingId">
                <option value="">{{ t('superadmin.finanzas.elegirBoda') }}</option>
                @for (b of bodasOrdenadas(); track b.weddingId) {
                  <option [value]="b.weddingId">{{ nombreDe(b.weddingId, t) }}</option>
                }
              </select>
            </label>
            <label>
              <span>{{ t('superadmin.finanzas.campo.concepto') }}</span>
              <input npInput type="text" formControlName="concept" maxlength="120" />
            </label>
            <label>
              <span>{{ t('superadmin.finanzas.campo.importe') }}</span>
              <input npInput type="text" inputmode="decimal" formControlName="importe" />
            </label>
            <label>
              <span>{{ t('superadmin.finanzas.campo.metodo') }}</span>
              <select npInput formControlName="method">
                @for (m of metodos; track m) {
                  <option [value]="m">{{ t('superadmin.finanzas.metodo.' + m) }}</option>
                }
              </select>
            </label>
            <label>
              <span>{{ t('superadmin.finanzas.campo.estado') }}</span>
              <select npInput formControlName="status">
                @for (e of estados; track e) {
                  <option [value]="e">{{ t('superadmin.finanzas.estado.' + e) }}</option>
                }
              </select>
            </label>
            @if (form.controls.status.value === 'paid') {
              <label>
                <span>{{ t('superadmin.finanzas.campo.fecha') }}</span>
                <input npInput type="date" formControlName="paidOn" />
              </label>
            }
            <label>
              <span>{{ t('superadmin.finanzas.campo.factura') }}</span>
              <input npInput type="text" formControlName="invoiceNumber" maxlength="40" />
            </label>
            <label>
              <span>{{ t('superadmin.finanzas.campo.notas') }}</span>
              <textarea npInput rows="3" formControlName="notes" maxlength="500"></textarea>
            </label>
            @if (errorForm(); as e) {
              <p class="fi__error" role="alert">
                <np-icon name="warning" />
                {{ t(e) }}
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

      @if (porBorrar(); as p) {
        <np-modal
          [open]="true"
          [heading]="t('superadmin.finanzas.borrarTitulo')"
          (closed)="porBorrar.set(null)"
        >
          <p>
            {{
              t('superadmin.finanzas.borrarConfirmar', {
                concepto: p.concept,
                importe: euros(p.amountCents),
              })
            }}
          </p>
          <div np-modal-actions>
            <button npButton variant="ghost" type="button" (click)="porBorrar.set(null)">
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
    :host {
      display: block;
      min-block-size: 100dvh;
      background: var(--np-surface-canvas);
    }
    .fi__cabecera {
      display: grid;
      gap: var(--np-space-2);
      padding: var(--np-space-4);
      background: var(--np-surface-surface);
      border-block-end: 1px solid var(--np-surface-border);
    }
    .fi__cabecera h1 {
      margin: 0;
      font-size: var(--np-text-xl);
    }
    .fi__volver {
      display: inline-flex;
      align-items: center;
      gap: var(--np-space-1);
      font-size: var(--np-text-sm);
      color: var(--np-surface-text-muted);
    }
    .fi__cuerpo {
      display: grid;
      gap: var(--np-space-4);
      padding: var(--np-space-4);
      max-inline-size: 70rem;
      margin-inline: auto;
    }
    .fi__fichas {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: var(--np-space-3);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .fi__ficha {
      display: grid;
      gap: var(--np-space-1);
      padding: var(--np-space-3);
      background: var(--np-surface-surface);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-md);
    }
    .fi__ficha np-icon {
      color: var(--np-cat-rosa);
    }
    .fi__ficha strong {
      font-size: var(--np-text-lg);
    }
    .fi__ficha span,
    .fi__tenue {
      font-size: var(--np-text-xs);
      color: var(--np-surface-text-muted);
    }
    .fi__barra {
      display: grid;
      gap: var(--np-space-3);
      align-items: end;
    }
    .fi__barra label,
    .fi__form label {
      display: grid;
      gap: var(--np-space-1);
    }
    .fi__rapidos {
      display: flex;
      flex-wrap: wrap;
      gap: var(--np-space-1);
    }
    .fi__aviso {
      margin: 0;
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-sm);
    }
    .fi__acciones {
      display: flex;
      flex-wrap: wrap;
      gap: var(--np-space-2);
    }
    .fi__form {
      display: grid;
      gap: var(--np-space-3);
    }
    .fi__error {
      display: flex;
      align-items: center;
      gap: var(--np-space-1);
      margin: 0;
      color: var(--np-declined-fg);
      font-size: var(--np-text-sm);
    }
    @media (min-width: 40rem) {
      .fi__barra {
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }
      .fi__rapidos,
      .fi__aviso,
      .fi__acciones {
        grid-column: 1 / -1;
      }
    }
  `,
})
export class PantallaFinanzas {
  private readonly puerta = inject(PUERTA_GESTION);

  protected readonly metodos = METODOS_PAGO;
  protected readonly estados = ESTADOS_PAGO;

  protected readonly carga = signal<Carga>('cargando');
  protected readonly fallo = signal<FalloGestion | null>(null);
  protected readonly datos = signal<DatosDeFinanzas | null>(null);

  protected readonly filtroBoda = signal('');
  protected readonly filtroEstado = signal('');
  /** Rango de fechas de cobro, en `AAAA-MM-DD`; vacío = sin límite por ese lado. */
  protected readonly desde = signal('');
  protected readonly hasta = signal('');
  protected readonly rangos = ['mes', 'mesAnterior', 'anio', 'todo'] as const;
  protected readonly hayRango = computed(() => this.desde() !== '' || this.hasta() !== '');

  protected readonly formAbierto = signal(false);
  protected readonly editandoId = signal<string | null>(null);
  protected readonly guardando = signal(false);
  protected readonly errorForm = signal<string | null>(null);
  protected readonly porBorrar = signal<Pago | null>(null);

  protected readonly form = new FormGroup({
    weddingId: new FormControl('', { nonNullable: true }),
    concept: new FormControl('', { nonNullable: true }),
    importe: new FormControl('', { nonNullable: true }),
    method: new FormControl<MetodoPago>('bizum', { nonNullable: true }),
    status: new FormControl<EstadoPago>('pending', { nonNullable: true }),
    paidOn: new FormControl('', { nonNullable: true }),
    invoiceNumber: new FormControl('', { nonNullable: true }),
    notes: new FormControl('', { nonNullable: true }),
  });

  private readonly bodasPorId = computed(
    () => new Map((this.datos()?.bodas ?? []).map((b) => [b.weddingId, b])),
  );

  protected readonly bodasOrdenadas = computed<readonly BodaMinima[]>(() =>
    [...(this.datos()?.bodas ?? [])].sort((a, b) => a.slug.localeCompare(b.slug, 'es')),
  );

  /** Los más recientes primero; lo pendiente, antes que lo ya cobrado. */
  protected readonly visibles = computed(() => {
    const boda = this.filtroBoda();
    const estado = this.filtroEstado();
    const desde = this.desde();
    const hasta = this.hasta();
    return (this.datos()?.pagos ?? [])
      .filter(
        (p) =>
          (boda === '' || p.weddingId === boda) &&
          (estado === '' || p.status === estado) &&
          enRango(p.paidOn, desde, hasta),
      )
      .sort(
        (a, b) =>
          Number(a.status === 'paid') - Number(b.status === 'paid') ||
          (b.paidOn ?? '').localeCompare(a.paidOn ?? '') ||
          a.concept.localeCompare(b.concept, 'es'),
      );
  });

  protected readonly totales = computed(() => totalesDePagos(this.visibles()));

  constructor() {
    void this.cargar();
  }

  protected async cargar(): Promise<void> {
    this.carga.set('cargando');
    const r = await this.puerta.finanzas();
    if (r.ok) {
      this.datos.set(r.datos);
      this.carga.set('lista');
    } else {
      this.fallo.set(r.fallo);
      this.carga.set('error');
    }
  }

  protected aplicarRango(rango: 'mes' | 'mesAnterior' | 'anio' | 'todo'): void {
    const [d, h] = limitesDeRango(rango, new Date());
    this.desde.set(d);
    this.hasta.set(h);
  }

  protected euros(centimos: number): string {
    return centimosAEuros(centimos);
  }

  protected dia(dia: string): string {
    return fechaMedia(diaAFecha(dia), 'es');
  }

  protected nombreDe(weddingId: string, t: (clave: string, params?: object) => string): string {
    const b = this.bodasPorId().get(weddingId);
    if (!b) return weddingId;
    const nombres = t('publico.pareja', b.couple);
    return b.slug ? `${nombres} (${b.slug})` : nombres;
  }

  // ---------- formulario ----------

  protected nuevo(): void {
    this.editandoId.set(null);
    this.errorForm.set(null);
    this.form.reset({
      weddingId: this.filtroBoda(),
      concept: '',
      importe: '',
      method: 'bizum',
      status: 'pending',
      paidOn: '',
      invoiceNumber: '',
      notes: '',
    });
    this.formAbierto.set(true);
  }

  protected editar(p: Pago): void {
    this.editandoId.set(p.id);
    this.errorForm.set(null);
    this.form.reset({
      weddingId: p.weddingId,
      concept: p.concept,
      importe: centimosATexto(p.amountCents),
      method: p.method,
      status: p.status,
      paidOn: p.paidOn ?? '',
      invoiceNumber: p.invoiceNumber,
      notes: p.notes,
    });
    this.formAbierto.set(true);
  }

  protected cerrarForm(): void {
    this.formAbierto.set(false);
  }

  protected async guardar(): Promise<void> {
    const v = this.form.getRawValue();

    // El importe se comprueba aquí para no hacer un viaje a servidor con algo
    // que ni es un número; el resto lo valida la función, que es quien manda.
    const amountCents = eurosACentimos(v.importe);
    if (amountCents === null) {
      this.errorForm.set(MOTIVOS['importe'] ?? null);
      return;
    }

    this.errorForm.set(null);
    this.guardando.set(true);
    const r = await this.puerta.guardarPago(this.editandoId(), {
      weddingId: v.weddingId,
      amountCents,
      concept: v.concept,
      method: v.method,
      status: v.status,
      paidOn: v.status === 'paid' ? v.paidOn : null,
      invoiceNumber: v.invoiceNumber,
      notes: v.notes,
    });
    this.guardando.set(false);

    if (!r.ok) {
      this.errorForm.set(
        r.fallo.tipo === 'invalido'
          ? (MOTIVOS[r.fallo.motivo] ?? 'superadmin.finanzas.error.otro')
          : 'superadmin.finanzas.error.otro',
      );
      return;
    }

    const actual = this.datos();
    if (actual) {
      const nuevo = r.datos;
      const existe = actual.pagos.some((p) => p.id === nuevo.id);
      this.datos.set({
        ...actual,
        pagos: existe
          ? actual.pagos.map((p) => (p.id === nuevo.id ? nuevo : p))
          : [...actual.pagos, nuevo],
      });
    }
    this.formAbierto.set(false);
  }

  protected pedirBorrado(p: Pago): void {
    this.porBorrar.set(p);
  }

  protected async borrar(): Promise<void> {
    const p = this.porBorrar();
    if (!p) return;

    this.guardando.set(true);
    const r = await this.puerta.borrarPago(p.id);
    this.guardando.set(false);
    this.porBorrar.set(null);
    if (!r.ok) {
      this.fallo.set(r.fallo);
      this.carga.set('error');
      return;
    }

    const actual = this.datos();
    if (actual) this.datos.set({ ...actual, pagos: actual.pagos.filter((x) => x.id !== p.id) });
  }

  // ---------- exportación ----------

  /** Descarga lo que se está viendo, no todo: es lo que uno espera al filtrar. */
  protected exportar(t: (clave: string, params?: object) => string): void {
    const cabecera = [
      'boda',
      'concepto',
      'importe',
      'metodo',
      'estado',
      'fechaCobro',
      'factura',
      'notas',
    ].map((c) => t(`superadmin.finanzas.csv.${c}`));

    const csv = pagosACsv(this.visibles(), (id) => this.nombreDe(id, t), cabecera);
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `cobros-nupcialis-${new Date().toISOString().slice(0, 10)}.csv`;
    enlace.click();
    URL.revokeObjectURL(url);
  }

  protected textoDeFallo(fallo: FalloGestion | null, t: (clave: string) => string): string {
    switch (fallo?.tipo) {
      case 'sin-permiso':
        return t('superadmin.estadisticas.falloPermiso');
      case 'sin-verificar':
        return t('superadmin.estadisticas.falloVerificar');
      case 'red':
        return t('superadmin.estadisticas.falloRed');
      case 'error':
        return fallo.mensaje;
      default:
        return t('superadmin.estadisticas.falloOtro');
    }
  }
}
