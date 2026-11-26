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
  idVigente,
  proponerImportes,
  resolver,
  tareasEnlazadas,
  tareasLibres,
} from '../enlaces/enlaces';
import { NpTareasEnlazadas } from '../enlaces/tareas-enlazadas';
import { ProveedoresStore } from '../proveedores/proveedores.store';
import { pagado } from '../proveedores/proveedores';
import { centimosAEuros, centimosATexto, eurosACentimosOCero } from '../../../shared/dinero';
import { fechaMedia } from '../../../shared/fecha';
import {
  MAX_CATEGORIA,
  MAX_CONCEPTO,
  MAX_NOTAS,
  presupuestoACsv,
  validarBorrador,
  type PartidaDelPanel,
} from './presupuesto';
import { PresupuestoStore } from './presupuesto.store';

/**
 * El presupuesto de la boda.
 *
 * Cada partida tiene lo estimado, lo que ha costado de verdad y si está pagada.
 * La lista nace con las partidas que Nupcialis propone al crear la boda: es una
 * copia de la pareja, que la cambia, amplía o vacía sin que eso afecte a nadie
 * más.
 */
@Component({
  selector: 'np-panel-presupuesto',
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
      <section class="pr">
        <header class="pr__intro">
          <h2>{{ t('panel.presupuesto.titulo') }}</h2>
          <p>{{ t('panel.presupuesto.ayuda') }}</p>
        </header>

        @if (store.fallo(); as f) {
          <np-alert status="declined" [heading]="t('panel.presupuesto.fallo')">
            <p>{{ t('panel.presupuesto.fallos.' + f.tipo) }}</p>
          </np-alert>
        }

        @switch (store.estado()) {
          @case ('cargando') {
            <np-empty-state icon="clock-countdown" [title]="t('panel.presupuesto.cargando')" />
          }
          @default {
            <ul class="pr__fichas">
              <li class="pr__ficha">
                <span>{{ t('panel.presupuesto.estimado') }}</span>
                <strong>{{ euros(store.totales().estimado) }}</strong>
              </li>
              <li class="pr__ficha">
                <span>{{ t('panel.presupuesto.real') }}</span>
                <strong>{{ euros(store.totales().real) }}</strong>
              </li>
              <li class="pr__ficha">
                <span>{{ t('panel.presupuesto.pagado') }}</span>
                <strong>{{ euros(store.totales().pagado) }}</strong>
              </li>
              <li class="pr__ficha">
                <span>{{ t('panel.presupuesto.pendiente') }}</span>
                <strong>{{ euros(store.totales().pendiente) }}</strong>
              </li>
            </ul>

            @if (store.totales().desviacion !== 0) {
              <p class="pr__desviacion">
                <np-icon [name]="store.totales().desviacion > 0 ? 'warning' : 'check-circle'" />
                {{
                  store.totales().desviacion > 0
                    ? t('panel.presupuesto.porEncima', {
                        importe: euros(store.totales().desviacion),
                      })
                    : t('panel.presupuesto.porDebajo', {
                        importe: euros(-store.totales().desviacion),
                      })
                }}
              </p>
            }

            <div class="pr__acciones">
              <button npButton type="button" [disabled]="store.lleno()" (click)="nueva()">
                <np-icon name="plus" />
                {{ t('panel.presupuesto.nueva') }}
              </button>
              <button
                npButton
                variant="secondary"
                type="button"
                [disabled]="store.partidas().length === 0"
                (click)="exportar()"
              >
                <np-icon name="download-simple" />
                {{ t('panel.presupuesto.exportar') }}
              </button>
            </div>

            @if (store.partidas().length === 0) {
              <np-empty-state
                icon="currency-eur"
                [title]="t('panel.presupuesto.vacio')"
                [description]="t('panel.presupuesto.vacioDescripcion')"
              />
            }

            @for (g of store.grupos(); track g.category) {
              <section class="pr__grupo">
                <h3>
                  {{ g.category }}
                  <small>
                    {{
                      t('panel.presupuesto.subtotal', {
                        estimado: euros(g.totales.estimado),
                        real: euros(g.totales.real),
                      })
                    }}
                  </small>
                </h3>
                <ul class="pr__lista">
                  @for (p of g.partidas; track p.id) {
                    <li class="pr__partida">
                      <label class="pr__pagada">
                        <input
                          type="checkbox"
                          [checked]="p.paid"
                          [attr.aria-label]="t('panel.presupuesto.marcarPagada', { c: p.concept })"
                          (change)="marcar(p, $event)"
                        />
                      </label>
                      <div class="pr__datos">
                        <strong [class.pr__tachada]="p.paid">{{ p.concept }}</strong>
                        <span class="pr__cifras">
                          {{ t('panel.presupuesto.estimadoCorto') }}:
                          {{ p.estimatedCents > 0 ? euros(p.estimatedCents) : '—' }} ·
                          {{ t('panel.presupuesto.realCorto') }}:
                          {{ p.actualCents > 0 ? euros(p.actualCents) : '—' }}
                        </span>
                        @if (p.dueOn) {
                          <small>
                            {{ t('panel.presupuesto.vence', { fecha: dia(p.dueOn) }) }}
                          </small>
                        }
                        @if (proveedorDe(p); as proveedor) {
                          <small>
                            <np-icon name="briefcase" />
                            {{ proveedor.name }}
                          </small>
                        }
                        @if (tareasAbiertas(p); as n) {
                          <small>
                            <np-icon name="list-checks" />
                            {{ t('panel.presupuesto.tareasAbiertas', { n }) }}
                          </small>
                        }
                        @if (p.notes) {
                          <small>{{ p.notes }}</small>
                        }
                      </div>
                      <np-status-chip
                        [status]="p.paid ? 'confirmed' : 'pending'"
                        [label]="
                          p.paid
                            ? t('panel.presupuesto.estaPagada')
                            : t('panel.presupuesto.sinPagar')
                        "
                      />
                      <div class="pr__botones">
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
          [heading]="editandoId() ? t('panel.presupuesto.editar') : t('panel.presupuesto.nueva')"
          (closed)="formAbierto.set(false)"
        >
          <form class="pr__form" [formGroup]="form" (ngSubmit)="guardar()">
            <label>
              <span>{{ t('panel.presupuesto.campo.concepto') }}</span>
              <input npInput type="text" formControlName="concept" [attr.maxlength]="maxConcepto" />
            </label>
            <label>
              <span>{{ t('panel.presupuesto.campo.categoria') }}</span>
              <input
                npInput
                type="text"
                formControlName="category"
                list="pr-categorias"
                [attr.maxlength]="maxCategoria"
              />
              <datalist id="pr-categorias">
                @for (c of store.categorias(); track c) {
                  <option [value]="c"></option>
                }
              </datalist>
            </label>
            @if (conProveedores()) {
              <label>
                <span>{{ t('panel.presupuesto.campo.proveedor') }}</span>
                <select
                  npInput
                  formControlName="vendorId"
                  (change)="vendorElegido.set($any($event.target).value)"
                >
                  <option value="">{{ t('panel.presupuesto.campo.sinProveedor') }}</option>
                  @for (v of proveedores.proveedores(); track v.id) {
                    <option [value]="v.id">{{ v.name }}</option>
                  }
                </select>
              </label>
              @if (propuesta(); as pr) {
                <div class="pr__propuesta">
                  <small>
                    {{
                      t('panel.presupuesto.propuesta.pista', {
                        pagado: euros(pr.pagadoCents),
                        acordado:
                          pr.proveedor.agreedCents > 0 ? euros(pr.proveedor.agreedCents) : '—',
                      })
                    }}
                  </small>
                  @if (pr.importes.estimadoCents !== null) {
                    <button
                      npButton
                      variant="secondary"
                      size="sm"
                      type="button"
                      (click)="usarEstimado(pr.importes.estimadoCents)"
                    >
                      {{
                        t('panel.presupuesto.propuesta.estimado', {
                          importe: euros(pr.importes.estimadoCents),
                        })
                      }}
                    </button>
                  }
                  @if (pr.importes.realCents !== null) {
                    <button
                      npButton
                      variant="secondary"
                      size="sm"
                      type="button"
                      (click)="usarReal(pr.importes.realCents)"
                    >
                      {{
                        t('panel.presupuesto.propuesta.real', {
                          importe: euros(pr.importes.realCents),
                        })
                      }}
                    </button>
                  }
                </div>
              }
            }
            <label>
              <span>{{ t('panel.presupuesto.campo.estimado') }}</span>
              <input npInput type="text" inputmode="decimal" formControlName="estimado" />
            </label>
            <label>
              <span>{{ t('panel.presupuesto.campo.real') }}</span>
              <input npInput type="text" inputmode="decimal" formControlName="real" />
              <small>{{ t('panel.presupuesto.campo.realPista') }}</small>
            </label>
            <label>
              <span>{{ t('panel.presupuesto.campo.vence') }}</span>
              <input npInput type="date" formControlName="dueOn" />
            </label>
            <label>
              <span>{{ t('panel.presupuesto.campo.notas') }}</span>
              <textarea
                npInput
                rows="2"
                formControlName="notes"
                [attr.maxlength]="maxNotas"
              ></textarea>
            </label>
            <label class="pr__casilla">
              <input type="checkbox" formControlName="paid" />
              <span>{{ t('panel.presupuesto.campo.pagada') }}</span>
            </label>
            @if (actual(); as ficha) {
              @if (conTareas()) {
                <np-tareas-enlazadas
                  [enlazadas]="tareasDe(ficha)"
                  [libres]="tareasLibresDePartida()"
                  [ocupado]="enlazando() || tareasStore.lleno()"
                  (enlazar)="enlazarTarea($event)"
                  (desenlazar)="desenlazarTarea($event)"
                  (crear)="crearTarea($event)"
                />
              }
            }
            @if (errorForm(); as e) {
              <p class="pr__error" role="alert">
                <np-icon name="warning" />
                {{ e }}
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

      @if (borrando(); as p) {
        <np-modal [open]="true" [heading]="t('common.delete')" (closed)="borrando.set(null)">
          <p>{{ t('panel.presupuesto.borrarConfirmar', { c: p.concept }) }}</p>
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
    .pr,
    .pr__grupo,
    .pr__form {
      display: grid;
      gap: var(--np-space-3);
    }
    .pr {
      gap: var(--np-space-5);
      max-inline-size: 48rem;
    }
    .pr__intro h2,
    .pr__intro p,
    .pr__grupo h3,
    .pr__desviacion {
      margin: 0;
    }
    .pr__intro p,
    .pr__ficha span,
    .pr__datos small,
    .pr__grupo h3 small,
    .pr__form small,
    .pr__desviacion {
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-sm);
    }
    .pr__fichas {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--np-space-3);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    @media (min-width: 40rem) {
      .pr__fichas {
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }
    }
    .pr__ficha,
    .pr__partida {
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-md);
      background: var(--np-surface-surface);
    }
    .pr__ficha {
      display: grid;
      gap: var(--np-space-1);
      padding: var(--np-space-3);
    }
    .pr__ficha strong {
      font-size: var(--np-text-lg);
    }
    .pr__desviacion {
      display: flex;
      align-items: center;
      gap: var(--np-space-1);
    }
    .pr__acciones,
    .pr__botones {
      display: flex;
      flex-wrap: wrap;
      gap: var(--np-space-2);
    }
    .pr__grupo h3 {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      justify-content: space-between;
      gap: var(--np-space-2);
      font-size: var(--np-text-base);
    }
    .pr__lista {
      display: grid;
      gap: var(--np-space-2);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .pr__partida {
      display: grid;
      grid-template-columns: auto 1fr;
      align-items: center;
      gap: var(--np-space-2) var(--np-space-3);
      padding: var(--np-space-3);
    }
    .pr__pagada {
      display: grid;
      place-items: center;
      min-inline-size: var(--np-tap-target);
      min-block-size: var(--np-tap-target);
    }
    .pr__datos {
      display: grid;
      gap: var(--np-space-1);
      min-inline-size: 0;
      overflow-wrap: anywhere;
    }
    .pr__tachada {
      text-decoration: line-through;
      color: var(--np-surface-text-muted);
    }
    .pr__partida np-status-chip,
    .pr__botones {
      grid-column: 2;
    }
    .pr__form label {
      display: grid;
      gap: var(--np-space-1);
    }
    .pr__form .pr__casilla {
      display: flex;
      align-items: center;
      gap: var(--np-space-2);
    }
    .pr__propuesta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--np-space-2);
    }
    .pr__error {
      display: flex;
      align-items: center;
      gap: var(--np-space-1);
      margin: 0;
      color: var(--np-declined-fg);
      font-size: var(--np-text-sm);
    }
  `,
})
export class PanelPresupuesto {
  protected readonly store = inject(PresupuestoStore);
  protected readonly proveedores = inject(ProveedoresStore);
  protected readonly tareasStore = inject(TareasStore);
  private readonly boda = inject(BodaStore);
  private readonly i18n = inject(TranslocoService);

  /** Cada bloque de enlaces existe solo si la boda tiene ese módulo. */
  protected readonly conProveedores = computed(
    () => this.boda.boda()?.modulos['vendors']?.enabled === true,
  );
  protected readonly conTareas = computed(
    () => this.boda.boda()?.modulos['checklist']?.enabled === true,
  );
  protected readonly vendorElegido = signal('');
  protected readonly enlazando = signal(false);

  protected readonly maxConcepto = MAX_CONCEPTO;
  protected readonly maxCategoria = MAX_CATEGORIA;
  protected readonly maxNotas = MAX_NOTAS;

  protected readonly formAbierto = signal(false);
  protected readonly editandoId = signal<string | null>(null);
  protected readonly guardando = signal(false);
  protected readonly errorForm = signal<string | null>(null);
  protected readonly borrando = signal<PartidaDelPanel | null>(null);

  protected readonly form = new FormGroup({
    concept: new FormControl('', { nonNullable: true }),
    category: new FormControl('', { nonNullable: true }),
    estimado: new FormControl('', { nonNullable: true }),
    real: new FormControl('', { nonNullable: true }),
    dueOn: new FormControl('', { nonNullable: true }),
    notes: new FormControl('', { nonNullable: true }),
    paid: new FormControl(false, { nonNullable: true }),
    vendorId: new FormControl('', { nonNullable: true }),
  });

  /** La partida que se está editando, tal como está ahora. */
  protected readonly actual = computed(
    () => this.store.partidas().find((p) => p.id === this.editandoId()) ?? null,
  );

  /**
   * Lo que el proveedor elegido ofrece para rellenar la partida. Es solo una
   * propuesta: no se aplica sin que la pareja pulse el botón.
   */
  protected readonly propuesta = computed(() => {
    const proveedor = resolver(this.proveedores.proveedores(), this.vendorElegido());
    if (!proveedor) return null;
    return {
      proveedor,
      pagadoCents: pagado(proveedor),
      importes: proponerImportes(proveedor),
    };
  });

  /** Para no recalcular el formateador en cada fila. */
  protected readonly euros = (centimos: number): string => centimosAEuros(centimos);
  protected readonly dia = (iso: string): string => fechaMedia(new Date(`${iso}T00:00:00Z`), 'es');

  protected readonly hayPartidas = computed(() => this.store.partidas().length > 0);

  constructor() {
    void this.store.cargar();
    if (this.conProveedores()) void this.proveedores.cargar();
    if (this.conTareas()) void this.tareasStore.cargar();
  }

  protected proveedorDe(p: PartidaDelPanel) {
    return resolver(this.proveedores.proveedores(), p.vendorId);
  }

  protected tareasDe(p: PartidaDelPanel) {
    return tareasEnlazadas(this.tareasStore.tareas(), 'budgetItemId', p.id);
  }

  protected tareasAbiertas(p: PartidaDelPanel): number {
    return this.tareasDe(p).filter((t) => !t.done).length;
  }

  protected tareasLibresDePartida() {
    return tareasLibres(this.tareasStore.tareas(), 'budgetItemId');
  }

  protected usarEstimado(centimos: number): void {
    this.form.patchValue({ estimado: centimosATexto(centimos) });
  }

  protected usarReal(centimos: number): void {
    this.form.patchValue({ real: centimosATexto(centimos) });
  }

  private async enlazar(operacion: () => Promise<unknown>): Promise<void> {
    if (this.enlazando()) return;
    this.enlazando.set(true);
    await operacion();
    this.enlazando.set(false);
  }

  protected enlazarTarea(id: string): Promise<void> {
    const ficha = this.actual();
    if (!ficha) return Promise.resolve();
    return this.enlazar(() => this.tareasStore.enlazar(id, { budgetItemId: ficha.id }));
  }

  protected desenlazarTarea(id: string): Promise<void> {
    return this.enlazar(() => this.tareasStore.enlazar(id, { budgetItemId: null }));
  }

  /** Una tarea nueva ya enlazada a esta partida, a nombre de los dos y sin fecha. */
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
        vendorId: ficha.vendorId,
        budgetItemId: ficha.id,
      }),
    );
  }

  protected nueva(): void {
    this.form.reset({ paid: false, vendorId: '' });
    this.vendorElegido.set('');
    this.editandoId.set(null);
    this.errorForm.set(null);
    this.formAbierto.set(true);
  }

  protected editar(p: PartidaDelPanel): void {
    this.form.reset({
      concept: p.concept,
      category: p.category,
      estimado: p.estimatedCents > 0 ? centimosATexto(p.estimatedCents) : '',
      real: p.actualCents > 0 ? centimosATexto(p.actualCents) : '',
      dueOn: p.dueOn ?? '',
      notes: p.notes,
      paid: p.paid,
      // Un proveedor borrado se ve «sin proveedor» y, al guardar, se limpia.
      vendorId: idVigente(this.proveedores.proveedores(), p.vendorId),
    });
    this.vendorElegido.set(idVigente(this.proveedores.proveedores(), p.vendorId));
    this.editandoId.set(p.id);
    this.errorForm.set(null);
    this.formAbierto.set(true);
  }

  protected async marcar(p: PartidaDelPanel, evento: Event): Promise<void> {
    const casilla = evento.target as HTMLInputElement;
    const ok = await this.store.marcarPagada(p.id, casilla.checked);
    // Si falla, el valor de la lista vuelve al de antes en el mismo instante y
    // Angular no ve cambio: la casilla del DOM hay que devolverla a mano.
    if (!ok) casilla.checked = p.paid;
  }

  protected async guardar(): Promise<void> {
    if (this.guardando()) return;

    const v = this.form.getRawValue();
    const validado = validarBorrador(
      {
        ...v,
        category: v.category,
        estimado: v.estimado,
        real: v.real,
        // Sin el módulo de proveedores el selector no existe: se conserva el
        // enlace que ya hubiera en vez de borrarlo a escondidas.
        vendorId: this.conProveedores() ? v.vendorId : (this.actual()?.vendorId ?? ''),
      },
      eurosACentimosOCero,
    );

    if (!validado.ok) {
      this.errorForm.set(this.i18n.translate(`panel.presupuesto.error.${validado.motivo}`));
      return;
    }

    this.errorForm.set(null);
    this.guardando.set(true);
    const resultado = await this.store.guardar(this.editandoId(), validado.datos);
    this.guardando.set(false);

    if (resultado.ok) this.formAbierto.set(false);
  }

  protected async borrar(): Promise<void> {
    const p = this.borrando();
    if (!p || this.guardando()) return;

    this.guardando.set(true);
    const resultado = await this.store.borrar(p.id);
    this.guardando.set(false);
    if (resultado.ok) this.borrando.set(null);
  }

  protected exportar(): void {
    const texto = (k: string) => this.i18n.translate(`panel.presupuesto.csv.${k}`);
    // BOM para que Excel abra los acentos bien.
    const csv =
      String.fromCharCode(0xfeff) +
      presupuestoACsv(
        this.store.partidas(),
        [
          texto('categoria'),
          texto('concepto'),
          texto('estimado'),
          texto('real'),
          texto('pagada'),
          texto('vence'),
          texto('notas'),
        ],
        texto('si'),
        texto('no'),
      );

    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = 'presupuesto.csv';
    enlace.click();
    URL.revokeObjectURL(url);
  }
}
