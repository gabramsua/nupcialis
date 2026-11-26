import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';

import { PUERTA_LLAMADAS } from '../../../core/llamadas/llamadas-gateway';
import { PUERTA_GESTION, type FalloGestion } from '../../../core/superadmin/gestion-gateway';
import { NpAlert } from '../../../design-system/components/alert/alert';
import { NpButton } from '../../../design-system/components/button/button';
import { NpEmptyState } from '../../../design-system/components/empty-state/empty-state';
import { NpInput } from '../../../design-system/components/field/input';
import { NpModal } from '../../../design-system/components/modal/modal';
import { NpStatusChip } from '../../../design-system/components/status-chip/status-chip';
import { NpIcon } from '../../../design-system/icons/icon';
import { centimosAEuros, centimosATexto, eurosACentimosOCero } from '../../../shared/dinero';
import { textoDeFalloSuperadmin } from '../texto-de-fallo';
import type { BodaMinima, Pago } from '../gestion/gestion';
import {
  leerLiquidacion,
  leerProveedor,
  leerProveedores,
  saldosPorProveedor,
  type Proveedor,
  type ProveedorEnEdicion,
} from './proveedores';

type Carga = 'cargando' | 'lista' | 'error';

const MOTIVOS_PROVEEDOR: Record<string, string> = {
  nombre: 'superadmin.proveedores.error.nombre',
  codigo: 'superadmin.proveedores.error.codigo',
  'codigo-repetido': 'superadmin.proveedores.error.codigoRepetido',
  precio: 'superadmin.proveedores.error.tarifa',
  tarifa: 'superadmin.proveedores.error.tarifa',
  contacto: 'superadmin.proveedores.error.contacto',
  email: 'superadmin.proveedores.error.email',
  telefono: 'superadmin.proveedores.error.telefono',
};

const MOTIVOS_LIQUIDACION: Record<string, string> = {
  proveedor: 'superadmin.proveedores.error.noExiste',
  seleccion: 'superadmin.proveedores.error.seleccion',
  fecha: 'superadmin.proveedores.error.fecha',
  'ya-cobrado': 'superadmin.proveedores.error.yaCobrado',
  'otro-proveedor': 'superadmin.proveedores.error.otroProveedor',
  'no-existe': 'superadmin.proveedores.error.noExiste',
  demasiados: 'superadmin.proveedores.error.demasiados',
};

function hoy(): string {
  const f = new Date();
  return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;
}

/**
 * Proveedores comercializadores (D-26, F0.7.8–9): quién nos trae bodas, a qué
 * tarifa, y **cuánto nos debe**. El saldo sale de los cobros de Finanzas —no se
 * guarda— y se liquida en bloque: todo lo marcado pasa a cobrado, o nada.
 */
@Component({
  selector: 'np-proveedores',
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
      <header class="pv__cab">
        <h1>{{ t('superadmin.proveedores.titulo') }}</h1>
        <p>{{ t('superadmin.proveedores.ayuda') }}</p>
        <div>
          <button npButton type="button" (click)="nuevo()">
            <np-icon name="plus" />
            {{ t('superadmin.proveedores.nuevo') }}
          </button>
        </div>
      </header>

      <main class="pv__cuerpo">
        @switch (carga()) {
          @case ('cargando') {
            <np-empty-state icon="clock-countdown" [title]="t('superadmin.proveedores.cargando')" />
          }
          @case ('error') {
            <np-alert status="declined" [heading]="t('superadmin.proveedores.errorCarga')">
              <p>{{ textoDeFallo(fallo(), t) }}</p>
              <button npButton size="sm" type="button" (click)="cargar()">
                <np-icon name="arrows-clockwise" />
                {{ t('common.retry') }}
              </button>
            </np-alert>
          }
          @default {
            @if (aviso(); as a) {
              <np-alert status="confirmed" [heading]="t('superadmin.proveedores.liquidado')">
                <p>{{ a }}</p>
              </np-alert>
            }
            @if (saldos().length === 0) {
              <np-empty-state
                icon="storefront"
                [title]="t('superadmin.proveedores.ninguno')"
                [description]="t('superadmin.proveedores.ningunoDescripcion')"
              />
            } @else {
              <p class="pv__total">
                {{ t('superadmin.proveedores.debenTotal', { importe: euros(totalPendiente()) }) }}
              </p>
              @for (s of saldos(); track s.proveedor.id) {
                <section class="pv__prov" [attr.aria-labelledby]="'pv-' + s.proveedor.id">
                  <div class="pv__fila">
                    <h2 [id]="'pv-' + s.proveedor.id">{{ s.proveedor.name }}</h2>
                    <np-status-chip
                      [status]="s.proveedor.active ? 'confirmed' : 'pending'"
                      [label]="
                        t(
                          s.proveedor.active
                            ? 'superadmin.proveedores.activo'
                            : 'superadmin.proveedores.inactivo'
                        )
                      "
                    />
                    <code>{{ s.proveedor.code }}</code>
                  </div>
                  <dl class="pv__cifras">
                    <div>
                      <dt>{{ t('superadmin.proveedores.bodas') }}</dt>
                      <dd>{{ s.bodas }}</dd>
                    </div>
                    <div>
                      <dt>{{ t('superadmin.proveedores.debe') }}</dt>
                      <dd>{{ euros(s.pendienteCents) }}</dd>
                    </div>
                    <div>
                      <dt>{{ t('superadmin.proveedores.liquidadoYa') }}</dt>
                      <dd>{{ euros(s.liquidadoCents) }}</dd>
                    </div>
                    <div>
                      <dt>{{ t('superadmin.proveedores.tarifa') }}</dt>
                      <dd>
                        {{ euros(s.proveedor.wholesalePrice.basic) }} /
                        {{ euros(s.proveedor.wholesalePrice.extended) }}
                      </dd>
                    </div>
                  </dl>
                  <div class="pv__acciones">
                    <button
                      npButton
                      size="sm"
                      variant="secondary"
                      type="button"
                      (click)="editar(s.proveedor)"
                    >
                      <np-icon name="pencil-simple" />
                      {{ t('superadmin.proveedores.editar') }}
                    </button>
                    @if (s.pendientes.length > 0) {
                      <button
                        npButton
                        size="sm"
                        type="button"
                        [attr.aria-expanded]="abierto() === s.proveedor.id"
                        (click)="alternarLiquidacion(s.proveedor.id)"
                      >
                        <np-icon name="check-circle" />
                        {{ t('superadmin.proveedores.liquidar', { n: s.pendientes.length }) }}
                      </button>
                    }
                  </div>

                  @if (abierto() === s.proveedor.id) {
                    <div class="pv__liq">
                      <ul>
                        @for (p of s.pendientes; track p.id) {
                          <li>
                            <label>
                              <input
                                type="checkbox"
                                [checked]="marcados().has(p.id)"
                                (change)="alternarCobro(p.id)"
                              />
                              <a [routerLink]="['/superadmin/bodas', p.weddingId]">
                                {{ nombreDe(p.weddingId, t) }}
                              </a>
                              <span>{{ p.concept }}</span>
                              <strong>{{ euros(p.amountCents) }}</strong>
                            </label>
                          </li>
                        }
                      </ul>
                      <label class="pv__fecha">
                        <span>{{ t('superadmin.proveedores.fechaCobro') }}</span>
                        <input
                          npInput
                          type="date"
                          [value]="fecha()"
                          (change)="fecha.set($any($event.target).value)"
                        />
                      </label>
                      @if (errorLiquidacion(); as e) {
                        <p class="pv__error" role="alert">
                          <np-icon name="warning" />
                          {{ t(e) }}
                        </p>
                      }
                      <div class="pv__acciones">
                        <button
                          npButton
                          variant="ghost"
                          size="sm"
                          type="button"
                          (click)="marcarTodos(s.pendientes)"
                        >
                          {{ t('superadmin.proveedores.marcarTodos') }}
                        </button>
                        <button
                          npButton
                          type="button"
                          [disabled]="marcados().size === 0"
                          [loading]="guardando()"
                          (click)="liquidar(s.proveedor.id, t)"
                        >
                          <np-icon name="check" />
                          {{
                            t('superadmin.proveedores.liquidarSeleccion', {
                              n: marcados().size,
                              importe: euros(importeMarcado(s.pendientes)),
                            })
                          }}
                        </button>
                      </div>
                    </div>
                  }
                </section>
              }
            }
          }
        }
      </main>

      @if (formAbierto()) {
        <np-modal
          [open]="true"
          [heading]="
            editandoId()
              ? t('superadmin.proveedores.editarTitulo')
              : t('superadmin.proveedores.nuevo')
          "
          (closed)="formAbierto.set(false)"
        >
          <form class="pv__form" [formGroup]="form" (ngSubmit)="guardar()">
            <label>
              <span>{{ t('superadmin.proveedores.campo.nombre') }}</span>
              <input npInput type="text" formControlName="name" maxlength="80" />
            </label>
            <label>
              <span>{{ t('superadmin.proveedores.campo.codigo') }}</span>
              <input npInput type="text" formControlName="code" maxlength="32" />
              <small>{{ t('superadmin.proveedores.campo.codigoAyuda') }}</small>
            </label>
            <label>
              <span>{{ t('superadmin.proveedores.campo.contacto') }}</span>
              <input npInput type="text" formControlName="contactName" maxlength="80" />
            </label>
            <label>
              <span>{{ t('superadmin.proveedores.campo.email') }}</span>
              <input npInput type="email" formControlName="email" maxlength="120" />
            </label>
            <label>
              <span>{{ t('superadmin.proveedores.campo.telefono') }}</span>
              <input npInput type="tel" formControlName="phone" maxlength="30" />
            </label>
            <label>
              <span>{{ t('superadmin.proveedores.campo.tarifaBasico') }}</span>
              <input npInput type="text" inputmode="decimal" formControlName="basic" />
            </label>
            <label>
              <span>{{ t('superadmin.proveedores.campo.tarifaExtendido') }}</span>
              <input npInput type="text" inputmode="decimal" formControlName="extended" />
            </label>
            <label class="pv__check">
              <input type="checkbox" formControlName="active" />
              <span>{{ t('superadmin.proveedores.campo.activo') }}</span>
            </label>
            @if (errorForm(); as e) {
              <p class="pv__error" role="alert">
                <np-icon name="warning" />
                {{ t(e) }}
              </p>
            }
          </form>
          <div np-modal-actions>
            <button npButton variant="ghost" type="button" (click)="formAbierto.set(false)">
              {{ t('common.cancel') }}
            </button>
            <button npButton type="button" [loading]="guardando()" (click)="guardar()">
              <np-icon name="check" />
              {{ t('common.save') }}
            </button>
          </div>
        </np-modal>
      }
    </ng-container>
  `,
  styles: `
    :host {
      display: block;
    }
    .pv__cab,
    .pv__cuerpo {
      display: grid;
      gap: var(--np-space-3);
      padding: var(--np-space-4);
      max-inline-size: 70rem;
      margin-inline: auto;
    }
    .pv__cab {
      padding-block-end: 0;
    }
    .pv__cab h1,
    .pv__cab p,
    .pv__prov h2,
    .pv__total {
      margin: 0;
    }
    .pv__cab p,
    .pv__cifras dt,
    .pv__form small {
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-sm);
    }
    .pv__prov {
      display: grid;
      gap: var(--np-space-3);
      padding: var(--np-space-3);
      background: var(--np-surface-surface);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-md);
    }
    .pv__fila,
    .pv__acciones {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--np-space-2);
    }
    .pv__cifras {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
      gap: var(--np-space-3);
      margin: 0;
    }
    .pv__cifras dd {
      margin: 0;
      font-weight: 600;
    }
    .pv__liq ul {
      display: grid;
      gap: var(--np-space-2);
      margin: 0 0 var(--np-space-3);
      padding: 0;
      list-style: none;
    }
    .pv__liq li label {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--np-space-2);
    }
    .pv__fecha,
    .pv__form label:not(.pv__check) {
      display: grid;
      gap: var(--np-space-1);
    }
    .pv__form {
      display: grid;
      gap: var(--np-space-3);
    }
    .pv__check {
      display: flex;
      align-items: center;
      gap: var(--np-space-2);
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
export class PantallaProveedores {
  private readonly llamadas = inject(PUERTA_LLAMADAS);
  private readonly gestion = inject(PUERTA_GESTION);

  protected readonly carga = signal<Carga>('cargando');
  protected readonly fallo = signal<FalloGestion | null>(null);
  protected readonly proveedores = signal<readonly Proveedor[]>([]);
  protected readonly pagos = signal<readonly Pago[]>([]);
  private readonly bodas = signal<ReadonlyMap<string, BodaMinima>>(new Map());

  protected readonly saldos = computed(() => saldosPorProveedor(this.proveedores(), this.pagos()));
  protected readonly totalPendiente = computed(() =>
    this.saldos().reduce((t, s) => t + s.pendienteCents, 0),
  );

  protected readonly abierto = signal<string | null>(null);
  protected readonly marcados = signal<ReadonlySet<string>>(new Set());
  protected readonly fecha = signal(hoy());
  protected readonly errorLiquidacion = signal<string | null>(null);
  protected readonly aviso = signal<string | null>(null);

  protected readonly formAbierto = signal(false);
  protected readonly editandoId = signal<string | null>(null);
  protected readonly guardando = signal(false);
  protected readonly errorForm = signal<string | null>(null);

  protected readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true }),
    code: new FormControl('', { nonNullable: true }),
    contactName: new FormControl('', { nonNullable: true }),
    email: new FormControl('', { nonNullable: true }),
    phone: new FormControl('', { nonNullable: true }),
    basic: new FormControl('', { nonNullable: true }),
    extended: new FormControl('', { nonNullable: true }),
    active: new FormControl(true, { nonNullable: true }),
  });

  constructor() {
    void this.cargar();
  }

  protected async cargar(): Promise<void> {
    this.carga.set('cargando');
    const [prov, fin] = await Promise.all([
      this.llamadas.llamar('listPartners', {}, leerProveedores),
      this.gestion.finanzas(),
    ]);
    if (!prov.ok || !fin.ok) {
      this.fallo.set(!prov.ok ? prov.fallo : !fin.ok ? fin.fallo : null);
      this.carga.set('error');
      return;
    }
    this.proveedores.set(prov.datos);
    this.pagos.set(fin.datos.pagos);
    this.bodas.set(new Map(fin.datos.bodas.map((b) => [b.weddingId, b])));
    this.carga.set('lista');
  }

  protected euros(centimos: number): string {
    return centimosAEuros(centimos);
  }

  protected nombreDe(weddingId: string, t: (clave: string, params?: object) => string): string {
    const b = this.bodas().get(weddingId);
    return b ? t('publico.pareja', b.couple) : weddingId;
  }

  protected textoDeFallo(fallo: FalloGestion | null, t: (clave: string) => string): string {
    return textoDeFalloSuperadmin(fallo, t);
  }

  // ---------- liquidación ----------

  protected alternarLiquidacion(id: string): void {
    this.abierto.set(this.abierto() === id ? null : id);
    this.marcados.set(new Set());
    this.errorLiquidacion.set(null);
    this.aviso.set(null);
  }

  protected alternarCobro(id: string): void {
    const nuevo = new Set(this.marcados());
    if (!nuevo.delete(id)) nuevo.add(id);
    this.marcados.set(nuevo);
  }

  protected marcarTodos(pendientes: readonly Pago[]): void {
    this.marcados.set(new Set(pendientes.map((p) => p.id)));
  }

  protected importeMarcado(pendientes: readonly Pago[]): number {
    const m = this.marcados();
    return pendientes.filter((p) => m.has(p.id)).reduce((t, p) => t + p.amountCents, 0);
  }

  protected async liquidar(
    partnerId: string,
    t: (clave: string, params?: object) => string,
  ): Promise<void> {
    this.errorLiquidacion.set(null);
    this.guardando.set(true);
    const r = await this.llamadas.llamar(
      'settlePartnerPayments',
      { partnerId, paymentIds: [...this.marcados()], paidOn: this.fecha() },
      leerLiquidacion,
    );
    this.guardando.set(false);

    if (!r.ok) {
      this.errorLiquidacion.set(
        r.fallo.tipo === 'invalido'
          ? (MOTIVOS_LIQUIDACION[r.fallo.motivo] ?? 'superadmin.proveedores.error.otro')
          : 'superadmin.proveedores.error.otro',
      );
      return;
    }

    const hechos = this.marcados();
    const dia = this.fecha();
    this.pagos.update((todos) =>
      todos.map((p) =>
        hechos.has(p.id) ? { ...p, status: 'paid', method: 'partner_cash', paidOn: dia } : p,
      ),
    );
    this.aviso.set(
      t('superadmin.proveedores.liquidadoTexto', {
        n: r.datos.liquidados,
        importe: this.euros(r.datos.totalCents),
      }),
    );
    this.abierto.set(null);
    this.marcados.set(new Set());
  }

  // ---------- formulario ----------

  protected nuevo(): void {
    this.editandoId.set(null);
    this.errorForm.set(null);
    this.form.reset({
      name: '',
      code: '',
      contactName: '',
      email: '',
      phone: '',
      basic: '',
      extended: '',
      active: true,
    });
    this.formAbierto.set(true);
  }

  protected editar(p: Proveedor): void {
    this.editandoId.set(p.id);
    this.errorForm.set(null);
    this.form.reset({
      name: p.name,
      code: p.code,
      contactName: p.contactName,
      email: p.email,
      phone: p.phone,
      basic: p.wholesalePrice.basic === 0 ? '' : centimosATexto(p.wholesalePrice.basic),
      extended: p.wholesalePrice.extended === 0 ? '' : centimosATexto(p.wholesalePrice.extended),
      active: p.active,
    });
    this.formAbierto.set(true);
  }

  protected async guardar(): Promise<void> {
    const v = this.form.getRawValue();
    const basic = eurosACentimosOCero(v.basic);
    const extended = eurosACentimosOCero(v.extended);
    if (basic === null || extended === null) {
      this.errorForm.set(MOTIVOS_PROVEEDOR['tarifa'] ?? null);
      return;
    }
    const partner: ProveedorEnEdicion = {
      name: v.name,
      code: v.code,
      contactName: v.contactName,
      email: v.email,
      phone: v.phone,
      wholesalePrice: { basic, extended },
      active: v.active,
    };

    this.errorForm.set(null);
    this.guardando.set(true);
    const r = await this.llamadas.llamar(
      'savePartner',
      { partnerId: this.editandoId() ?? '', partner },
      leerProveedor,
    );
    this.guardando.set(false);

    if (!r.ok) {
      this.errorForm.set(
        r.fallo.tipo === 'invalido'
          ? (MOTIVOS_PROVEEDOR[r.fallo.motivo] ?? 'superadmin.proveedores.error.otro')
          : 'superadmin.proveedores.error.otro',
      );
      return;
    }

    const guardado = r.datos;
    this.proveedores.update((lista) =>
      lista.some((p) => p.id === guardado.id)
        ? lista.map((p) => (p.id === guardado.id ? guardado : p))
        : [...lista, guardado],
    );
    this.formAbierto.set(false);
  }
}
