import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { TranslocoDirective } from '@jsverse/transloco';

import type { FalloTareas } from '../../../core/checklist/tareas-gateway';
import { NpAlert } from '../../../design-system/components/alert/alert';
import { NpButton } from '../../../design-system/components/button/button';
import { NpEmptyState } from '../../../design-system/components/empty-state/empty-state';
import { NpModal } from '../../../design-system/components/modal/modal';
import { NpStatusChip } from '../../../design-system/components/status-chip/status-chip';
import { NpIcon } from '../../../design-system/icons/icon';
import type { NpIconName } from '../../../design-system/icons/icon-name.generated';
import { fechaMedia } from '../../../shared/fecha';
import { BodaStore } from '../boda.store';
import {
  CATEGORIAS_BASE,
  MAX_CATEGORIA_TAREA,
  MAX_DESCRIPCION_TAREA,
  MAX_TITULO_TAREA,
  PRIORIDADES,
  FILTROS_DE_ESTADO,
  RESPONSABLES,
  SIN_FILTROS,
  agruparTareas,
  campoDeFecha,
  erroresDeTarea,
  fechaDeCampo,
  filtrarTareas,
  plazoDeTarea,
  resumirTareas,
  type EstadoDeTarea,
  type ErrorDeTarea,
  type FiltroDeResponsable,
  type FiltrosDeTareas,
  type Prioridad,
  type Responsable,
  type TareaDelPanel,
} from './tareas';
import { TareasStore } from './tareas.store';
import { NpInput } from '../../../design-system/components/field/input';

/** Cómo se pinta cada estado: chip semántico e icono. Siempre con texto y fecha. */
const ESTILO_DE_ESTADO: Record<
  EstadoDeTarea,
  { readonly chip: 'confirmed' | 'pending' | 'declined' | 'info' | 'attention'; icono: NpIconName }
> = {
  vencida: { chip: 'declined', icono: 'warning' },
  'esta-semana': { chip: 'pending', icono: 'clock-countdown' },
  proxima: { chip: 'info', icono: 'calendar' },
  'sin-fecha': { chip: 'attention', icono: 'circle-dashed' },
  hecha: { chip: 'confirmed', icono: 'check-circle' },
};

const ICONO_RESPONSABLE: Record<Responsable, NpIconName> = {
  A: 'user',
  B: 'user',
  both: 'users',
};

/**
 * La lista de tareas de la pareja (§8.17).
 *
 * Contesta tres cosas, por este orden: **qué quema ya** (vencidas y de esta
 * semana, arriba y en color), **a quién le toca** (filtro por persona y
 * responsable en cada tarea) y **cuánto llevan** (la barra de arriba).
 *
 * Marcar una tarea es un toque y se refleja al instante. Lo hecho se esconde
 * por defecto: una lista que crece sin parar con lo ya tachado deja de
 * enseñar lo que falta.
 */
@Component({
  selector: 'np-panel-checklist',
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
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <section class="tk">
        <header class="tk__intro">
          <div>
            <h2>{{ t('panel.checklist.titulo') }}</h2>
            <p>{{ t('panel.checklist.ayuda') }}</p>
          </div>
          <button npButton type="button" [disabled]="store.lleno()" (click)="nueva()">
            <np-icon name="plus" />
            {{ t('panel.checklist.anadir') }}
          </button>
        </header>

        @if (store.fallo(); as fallo) {
          <np-alert status="declined" [heading]="t('panel.checklist.fallo')">
            <p>{{ textoDeFallo(fallo, t) }}</p>
          </np-alert>
        }

        @switch (store.estado()) {
          @case ('cargando') {
            <np-empty-state icon="clock-countdown" [title]="t('panel.checklist.cargando')" />
          }
          @case ('error') {
            <np-alert status="declined" [heading]="t('panel.checklist.noCarga')">
              <button npButton size="sm" type="button" (click)="store.cargar()">
                <np-icon name="arrows-clockwise" />
                {{ t('common.retry') }}
              </button>
            </np-alert>
          }
          @default {
            @if (store.tareas().length === 0) {
              <np-empty-state
                icon="list-checks"
                [title]="t('panel.checklist.ninguna')"
                [description]="t('panel.checklist.ningunaDescripcion')"
              />
            } @else {
              <div class="tk__progreso">
                <p class="tk__cuenta">
                  <strong>{{ resumen().hechas }}</strong>
                  {{ t('panel.checklist.deTotal', { total: resumen().total }) }}
                  <span>({{ resumen().porcentaje }} %)</span>
                </p>
                <div
                  class="tk__barra"
                  role="meter"
                  [attr.aria-valuemin]="0"
                  [attr.aria-valuemax]="resumen().total"
                  [attr.aria-valuenow]="resumen().hechas"
                  [attr.aria-label]="t('panel.checklist.progreso')"
                >
                  <span [style.inline-size.%]="resumen().porcentaje"></span>
                </div>
                <div class="tk__chips">
                  @if (resumen().vencidas > 0) {
                    <np-status-chip
                      status="declined"
                      [label]="t('panel.checklist.estado.vencida')"
                      [count]="resumen().vencidas"
                    />
                  }
                  @if (resumen().estaSemana > 0) {
                    <np-status-chip
                      status="pending"
                      [label]="t('panel.checklist.estado.esta-semana')"
                      [count]="resumen().estaSemana"
                    />
                  }
                  @if (resumen().vencidas === 0 && resumen().estaSemana === 0) {
                    <np-status-chip status="confirmed" [label]="t('panel.checklist.alDia')" />
                  }
                </div>
              </div>

              <div class="tk__filtros" role="group" [attr.aria-label]="t('panel.checklist.filtro')">
                @for (f of filtros(); track f.clave) {
                  <button
                    type="button"
                    class="tk__filtro"
                    [attr.aria-pressed]="filtro() === f.clave"
                    (click)="filtro.set(f.clave)"
                  >
                    @if (f.clave !== 'todas') {
                      <np-icon name="user" />
                    }
                    {{ f.clave === 'todas' ? t('panel.checklist.todas') : f.etiqueta }}
                    <span class="tk__n">{{ f.cuantas }}</span>
                  </button>
                }
              </div>

              <div class="tk__buscar">
                <label class="tk__campo tk__campo--texto">
                  <span class="tk__etiquetaFiltro">{{ t('panel.checklist.buscar.etiqueta') }}</span>
                  <input
                    npInput
                    type="search"
                    [value]="filtros2().texto"
                    [placeholder]="t('panel.checklist.buscar.placeholder')"
                    (input)="cambiarFiltro({ texto: $any($event.target).value })"
                  />
                </label>
                <label class="tk__campo">
                  <span class="tk__etiquetaFiltro">{{
                    t('panel.checklist.filtroEstado.etiqueta')
                  }}</span>
                  <select
                    npInput
                    [value]="filtros2().estado"
                    (change)="cambiarFiltro({ estado: $any($event.target).value })"
                  >
                    @for (e of estadosFiltro; track e) {
                      <option [value]="e" [selected]="filtros2().estado === e">
                        {{ t('panel.checklist.filtroEstado.' + e) }}
                      </option>
                    }
                  </select>
                </label>
                <label class="tk__campo">
                  <span class="tk__etiquetaFiltro">{{
                    t('panel.checklist.filtroCategoria.etiqueta')
                  }}</span>
                  <select
                    npInput
                    [value]="filtros2().categoria"
                    (change)="cambiarFiltro({ categoria: $any($event.target).value })"
                  >
                    <option value="" [selected]="filtros2().categoria === ''">
                      {{ t('panel.checklist.filtroCategoria.todas') }}
                    </option>
                    @for (c of categoriasEnUso(); track c) {
                      <option [value]="c" [selected]="filtros2().categoria === c">{{ c }}</option>
                    }
                  </select>
                </label>
                @if (hayFiltros()) {
                  <button
                    npButton
                    variant="ghost"
                    size="sm"
                    type="button"
                    (click)="limpiarFiltros()"
                  >
                    <np-icon name="x" />
                    {{ t('panel.checklist.quitarFiltros') }}
                  </button>
                }
              </div>

              @if (hayFiltros() && gruposVisibles().length === 0) {
                <np-empty-state
                  icon="magnifying-glass"
                  [title]="t('panel.checklist.filtroSinResultados')"
                />
              }

              @for (grupo of gruposVisibles(); track grupo.estado) {
                <section class="tk__grupo" [attr.data-estado]="grupo.estado">
                  <h3>
                    <np-icon [name]="estilo(grupo.estado).icono" />
                    {{ t('panel.checklist.grupo.' + grupo.estado) }}
                    <span class="tk__n">{{ grupo.tareas.length }}</span>
                  </h3>
                  <ul>
                    @for (tarea of grupo.tareas; track tarea.id) {
                      <li class="tk__tarea" [attr.data-estado]="grupo.estado">
                        <button
                          type="button"
                          class="tk__marca"
                          [attr.aria-pressed]="tarea.done"
                          [attr.aria-label]="
                            tarea.done
                              ? t('panel.checklist.desmarcar', { tarea: tarea.title })
                              : t('panel.checklist.marcar', { tarea: tarea.title })
                          "
                          (click)="store.marcar(tarea.id, !tarea.done)"
                        >
                          <np-icon
                            [name]="tarea.done ? 'check-circle' : 'circle-dashed'"
                            [weight]="tarea.done ? 'fill' : 'regular'"
                          />
                        </button>

                        <div class="tk__cuerpo">
                          <strong [class.tk__hecha]="tarea.done">{{ tarea.title }}</strong>
                          <p class="tk__meta">
                            <span>
                              <np-icon [name]="tarea.icon" />
                              {{ tarea.category || t('panel.checklist.sinCategoria') }}
                            </span>
                            <span class="tk__fecha">{{ cuando(tarea, t) }}</span>
                          </p>
                          @if (tarea.done && tarea.doneAt) {
                            <p class="tk__meta tk__completada">
                              <span>
                                <np-icon name="check-circle" />
                                {{ completadaPor(tarea, t) }}
                              </span>
                            </p>
                          }
                          <p class="tk__meta">
                            <span class="tk__quien">
                              <np-icon [name]="iconoResponsable(tarea.assignedTo)" />
                              {{ nombreDe(tarea.assignedTo, t) }}
                            </span>
                            @if (tarea.priority === 'high') {
                              <span class="tk__alta">
                                <np-icon name="star" weight="fill" />
                                {{ t('panel.checklist.prioridad.high') }}
                              </span>
                            }
                          </p>
                        </div>

                        <button
                          npButton
                          variant="ghost"
                          size="sm"
                          type="button"
                          [attr.aria-label]="t('panel.checklist.editar', { tarea: tarea.title })"
                          (click)="editar(tarea)"
                        >
                          <np-icon name="pencil-simple" />
                        </button>
                      </li>
                    }
                  </ul>
                </section>
              }

              @if (hechas() > 0) {
                <button
                  npButton
                  variant="ghost"
                  type="button"
                  class="tk__ver-hechas"
                  [attr.aria-expanded]="verHechas()"
                  (click)="verHechas.set(!verHechas())"
                >
                  <np-icon [name]="verHechas() ? 'caret-up' : 'caret-down'" />
                  {{
                    verHechas()
                      ? t('panel.checklist.ocultarHechas')
                      : t('panel.checklist.verHechas', { n: hechas() })
                  }}
                </button>
              }
            }
          }
        }
      </section>

      @if (abierto()) {
        <np-modal
          [open]="true"
          [heading]="editando() ? t('panel.checklist.editarTitulo') : t('panel.checklist.nueva')"
          (closed)="cerrar()"
        >
          <form class="tk__form" [formGroup]="formulario" (submit)="enviar($event)">
            <label>
              {{ t('panel.checklist.campo.titulo') }}
              <input npInput formControlName="title" [attr.maxlength]="maxTitulo" />
            </label>
            @if (errores().includes('titulo')) {
              <p class="tk__error" role="alert">
                <np-icon name="warning" />
                {{ t('panel.checklist.error.titulo') }}
              </p>
            }

            <label>
              {{ t('panel.checklist.campo.fecha') }}
              <input npInput type="date" formControlName="dueDate" />
            </label>
            @if (errores().includes('fecha')) {
              <p class="tk__error" role="alert">
                <np-icon name="warning" />
                {{ t('panel.checklist.error.fecha') }}
              </p>
            }

            <fieldset class="tk__quien-campo">
              <legend>{{ t('panel.checklist.campo.quien') }}</legend>
              <div class="tk__opciones">
                @for (r of responsables; track r) {
                  <label class="tk__opcion">
                    <input type="radio" formControlName="assignedTo" [value]="r" />
                    <np-icon [name]="iconoResponsable(r)" />
                    {{ nombreDe(r, t) }}
                  </label>
                }
              </div>
            </fieldset>

            <fieldset class="tk__quien-campo">
              <legend>{{ t('panel.checklist.campo.prioridad') }}</legend>
              <div class="tk__opciones">
                @for (p of prioridades; track p) {
                  <label class="tk__opcion">
                    <input type="radio" formControlName="priority" [value]="p" />
                    {{ t('panel.checklist.prioridad.' + p) }}
                  </label>
                }
              </div>
            </fieldset>

            <label>
              {{ t('panel.checklist.campo.categoria') }}
              <input
                npInput
                formControlName="category"
                list="tk-categorias"
                [attr.maxlength]="maxCategoria"
              />
              <datalist id="tk-categorias">
                @for (c of categorias(); track c) {
                  <option [value]="c"></option>
                }
              </datalist>
            </label>

            <label>
              {{ t('panel.checklist.campo.notas') }}
              <textarea
                npInput
                formControlName="description"
                rows="3"
                [attr.maxlength]="maxDescripcion"
              ></textarea>
            </label>
          </form>

          <div np-modal-actions>
            @if (editando(); as tarea) {
              <button
                npButton
                variant="danger"
                type="button"
                [loading]="guardando()"
                (click)="borrar(tarea)"
              >
                <np-icon name="trash" />
                {{
                  confirmandoBorrado()
                    ? t('panel.checklist.seguroBorrar')
                    : t('panel.checklist.borrar')
                }}
              </button>
            }
            <button npButton variant="ghost" type="button" (click)="cerrar()">
              {{ t('common.cancel') }}
            </button>
            <button npButton type="button" [loading]="guardando()" (click)="enviar($event)">
              <np-icon name="check" />
              {{ t('common.save') }}
            </button>
          </div>
        </np-modal>
      }
    </ng-container>
  `,
  styles: `
    .tk {
      display: grid;
      gap: var(--np-space-4);
    }
    .tk__intro {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--np-space-3);
    }
    .tk__intro h2 {
      margin: 0;
    }
    .tk__intro p {
      margin: var(--np-space-1) 0 0;
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-sm);
    }
    .tk__progreso {
      display: grid;
      gap: var(--np-space-2);
      padding: var(--np-space-3);
      background: var(--np-surface-surface);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-md);
    }
    .tk__cuenta {
      margin: 0;
    }
    .tk__cuenta strong {
      font-size: var(--np-text-xl);
    }
    .tk__cuenta span {
      color: var(--np-surface-text-muted);
    }
    .tk__barra {
      block-size: 0.5rem;
      border-radius: var(--np-radius-full);
      background: var(--np-surface-border);
      overflow: hidden;
    }
    .tk__barra span {
      display: block;
      block-size: 100%;
      background: var(--np-confirmed-fg);
    }
    .tk__chips {
      display: flex;
      flex-wrap: wrap;
      gap: var(--np-space-2);
    }
    .tk__filtros {
      display: flex;
      flex-wrap: wrap;
      gap: var(--np-space-2);
    }
    .tk__buscar {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: var(--np-space-2);
    }
    .tk__campo {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-1);
      min-inline-size: 10rem;
    }
    .tk__campo--texto {
      flex: 1 1 14rem;
    }
    .tk__etiquetaFiltro {
      font-size: var(--np-text-xs);
      color: var(--np-surface-text-muted);
    }
    .tk__completada {
      color: var(--np-confirmed-fg);
    }
    .tk__filtro {
      display: inline-flex;
      align-items: center;
      gap: var(--np-space-1);
      min-block-size: 2.75rem;
      padding-inline: var(--np-space-3);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-full);
      background: var(--np-surface-surface);
      color: inherit;
      font: inherit;
      cursor: pointer;
    }
    .tk__filtro[aria-pressed='true'] {
      border-color: var(--np-info-border);
      background: var(--np-info-bg);
      color: var(--np-info-fg);
      font-weight: var(--np-weight-semibold);
    }
    .tk__n {
      font-size: var(--np-text-xs);
      color: var(--np-surface-text-muted);
    }
    .tk__grupo h3 {
      display: flex;
      align-items: center;
      gap: var(--np-space-2);
      margin: 0 0 var(--np-space-2);
      font-size: var(--np-text-md);
    }
    .tk__grupo[data-estado='vencida'] h3 {
      color: var(--np-declined-fg);
    }
    .tk__grupo[data-estado='esta-semana'] h3 {
      color: var(--np-pending-fg);
    }
    .tk__grupo ul {
      display: grid;
      gap: var(--np-space-2);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .tk__tarea {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      align-items: start;
      gap: var(--np-space-2);
      padding: var(--np-space-2) var(--np-space-3);
      background: var(--np-surface-surface);
      border: 1px solid var(--np-surface-border);
      border-inline-start-width: 4px;
      border-radius: var(--np-radius-md);
    }
    .tk__tarea[data-estado='vencida'] {
      border-inline-start-color: var(--np-declined-border);
    }
    .tk__tarea[data-estado='esta-semana'] {
      border-inline-start-color: var(--np-pending-border);
    }
    .tk__tarea[data-estado='proxima'] {
      border-inline-start-color: var(--np-info-border);
    }
    .tk__tarea[data-estado='sin-fecha'] {
      border-inline-start-color: var(--np-attention-border);
    }
    .tk__tarea[data-estado='hecha'] {
      border-inline-start-color: var(--np-confirmed-border);
    }
    .tk__marca {
      display: grid;
      place-items: center;
      inline-size: 2.75rem;
      block-size: 2.75rem;
      border: 0;
      background: transparent;
      color: var(--np-surface-text-muted);
      cursor: pointer;
    }
    .tk__marca[aria-pressed='true'] {
      color: var(--np-confirmed-fg);
    }
    .tk__marca np-icon {
      font-size: 1.5rem;
    }
    .tk__cuerpo {
      display: grid;
      gap: var(--np-space-1);
      padding-block: var(--np-space-1);
    }
    .tk__hecha {
      text-decoration: line-through;
      color: var(--np-surface-text-muted);
    }
    .tk__meta {
      display: flex;
      flex-wrap: wrap;
      gap: var(--np-space-3);
      margin: 0;
      font-size: var(--np-text-sm);
      color: var(--np-surface-text-muted);
    }
    .tk__meta span {
      display: inline-flex;
      align-items: center;
      gap: var(--np-space-1);
    }
    .tk__alta {
      color: var(--np-pending-fg);
      font-weight: var(--np-weight-medium);
    }
    .tk__ver-hechas {
      justify-self: start;
    }
    .tk__form {
      display: grid;
      gap: var(--np-space-3);
    }
    .tk__form label {
      display: grid;
      gap: var(--np-space-1);
    }
    .tk__quien-campo {
      border: 0;
      padding: 0;
      margin: 0;
    }
    .tk__quien-campo legend {
      padding: 0;
      margin-block-end: var(--np-space-1);
    }
    .tk__opciones {
      display: flex;
      flex-wrap: wrap;
      gap: var(--np-space-2);
    }
    .tk__form .tk__opcion {
      display: inline-flex;
      align-items: center;
      gap: var(--np-space-1);
      min-block-size: 2.75rem;
      padding-inline: var(--np-space-3);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-full);
    }
    .tk__error {
      display: flex;
      align-items: center;
      gap: var(--np-space-1);
      margin: 0;
      color: var(--np-declined-fg);
      font-size: var(--np-text-sm);
    }
  `,
})
export class PanelChecklist {
  protected readonly store = inject(TareasStore);
  private readonly boda = inject(BodaStore);
  private readonly fb = inject(FormBuilder);

  protected readonly responsables = RESPONSABLES;
  protected readonly prioridades = PRIORIDADES;
  protected readonly maxTitulo = MAX_TITULO_TAREA;
  protected readonly maxCategoria = MAX_CATEGORIA_TAREA;
  protected readonly maxDescripcion = MAX_DESCRIPCION_TAREA;

  protected readonly filtro = signal<FiltroDeResponsable>('todas');
  protected readonly verHechas = signal(false);
  protected readonly estadosFiltro = FILTROS_DE_ESTADO;
  /** Estado, categoría y texto. El responsable va aparte (`filtro`). */
  protected readonly filtros2 = signal<FiltrosDeTareas>(SIN_FILTROS);
  protected readonly hayFiltros = computed(() => {
    const f = this.filtros2();
    return f.estado !== 'todas' || f.categoria !== '' || f.texto.trim() !== '';
  });
  /** Las categorías que de verdad tienen tareas, para no ofrecer filtros vacíos. */
  protected readonly categoriasEnUso = computed(() =>
    [
      ...new Set(
        this.store
          .tareas()
          .map((t) => t.category)
          .filter((c) => c !== ''),
      ),
    ].sort((a, b) => a.localeCompare(b, 'es')),
  );

  protected readonly abierto = signal(false);
  protected readonly editando = signal<TareaDelPanel | null>(null);
  protected readonly guardando = signal(false);
  protected readonly errores = signal<readonly ErrorDeTarea[]>([]);
  protected readonly confirmandoBorrado = signal(false);

  protected readonly formulario = this.fb.nonNullable.group({
    title: '',
    description: '',
    category: '',
    dueDate: '',
    assignedTo: 'both' as Responsable,
    priority: 'normal' as Prioridad,
  });

  /** «Hoy» se fija al cargar la pantalla: dentro de una visita no cambia de día. */
  private readonly ahora = new Date();

  protected readonly resumen = computed(() =>
    resumirTareas(this.store.tareas(), this.ahora, this.filtro()),
  );

  protected readonly categorias = computed(() =>
    [...new Set([...CATEGORIAS_BASE, ...this.store.categorias()])].sort((a, b) =>
      a.localeCompare(b, 'es'),
    ),
  );

  private readonly grupos = computed(() =>
    agruparTareas(
      filtrarTareas(this.store.tareas(), this.filtros2(), this.ahora),
      this.ahora,
      this.filtro(),
    ),
  );

  protected readonly hechas = computed(
    () => this.grupos().find((g) => g.estado === 'hecha')?.tareas.length ?? 0,
  );

  protected readonly gruposVisibles = computed(() =>
    this.grupos().filter(
      (g) => g.estado !== 'hecha' || this.verHechas() || this.filtros2().estado === 'hechas',
    ),
  );

  /** Los tres filtros, con cuántas tareas hay detrás de cada uno. */
  protected readonly filtros = computed(() => {
    const pareja = this.boda.boda()?.pareja;
    const tareas = this.store.tareas();
    const cuenta = (f: FiltroDeResponsable) =>
      tareas.filter((t) => f === 'todas' || t.assignedTo === f || t.assignedTo === 'both').length;
    return [
      { clave: 'todas' as const, etiqueta: '', cuantas: cuenta('todas') },
      { clave: 'A' as const, etiqueta: pareja?.partnerA ?? 'A', cuantas: cuenta('A') },
      { clave: 'B' as const, etiqueta: pareja?.partnerB ?? 'B', cuantas: cuenta('B') },
    ];
  });

  constructor() {
    void this.store.cargar();
  }

  protected cambiarFiltro(cambio: Partial<{ [K in keyof FiltrosDeTareas]: string }>): void {
    this.filtros2.update((f) => ({ ...f, ...(cambio as Partial<FiltrosDeTareas>) }));
  }

  protected limpiarFiltros(): void {
    this.filtros2.set(SIN_FILTROS);
  }

  /** «Completada el 3 de marzo por maria@…»; sin quién, solo la fecha. */
  protected completadaPor(
    tarea: TareaDelPanel,
    t: (clave: string, params?: Record<string, unknown>) => string,
  ): string {
    const fecha = tarea.doneAt ? fechaMedia(tarea.doneAt, 'es') : '';
    return tarea.doneByEmail
      ? t('panel.checklist.completadaPor', { fecha, quien: tarea.doneByEmail })
      : t('panel.checklist.completadaEl', { fecha });
  }

  protected estilo(estado: EstadoDeTarea) {
    return ESTILO_DE_ESTADO[estado];
  }

  protected iconoResponsable(r: Responsable): NpIconName {
    return ICONO_RESPONSABLE[r];
  }

  /** «María», «Gabriel» o «Los dos»: con el nombre y no con A y B. */
  protected nombreDe(r: Responsable, t: (clave: string) => string): string {
    const pareja = this.boda.boda()?.pareja;
    if (r === 'A') return pareja?.partnerA || t('panel.checklist.quien.A');
    if (r === 'B') return pareja?.partnerB || t('panel.checklist.quien.B');
    return t('panel.checklist.quien.both');
  }

  /** La fecha escrita y, al lado, cuánto falta: el color nunca va solo. */
  protected cuando(
    tarea: TareaDelPanel,
    t: (clave: string, params?: Record<string, unknown>) => string,
  ): string {
    const plazo = plazoDeTarea(tarea, this.ahora);
    return t('panel.checklist.' + plazo.clave, {
      fecha: fechaMedia(plazo.fecha, 'es'),
      n: plazo.n,
    });
  }

  protected textoDeFallo(fallo: FalloTareas, t: (clave: string) => string): string {
    switch (fallo.tipo) {
      case 'sin-permiso':
        return t('panel.checklist.falloPermiso');
      case 'red':
        return t('panel.checklist.falloRed');
      default:
        return fallo.mensaje;
    }
  }

  protected nueva(): void {
    this.editando.set(null);
    this.errores.set([]);
    this.confirmandoBorrado.set(false);
    // Una tarea nueva nace a nombre de quien está filtrando: si miro «lo mío» y
    // añado una, lo normal es que sea mía.
    const f = this.filtro();
    this.formulario.reset({
      title: '',
      description: '',
      category: '',
      dueDate: '',
      assignedTo: f === 'todas' ? 'both' : f,
      priority: 'normal',
    });
    this.abierto.set(true);
  }

  protected editar(tarea: TareaDelPanel): void {
    this.editando.set(tarea);
    this.errores.set([]);
    this.confirmandoBorrado.set(false);
    this.formulario.reset({
      title: tarea.title,
      description: tarea.description,
      category: tarea.category,
      dueDate: campoDeFecha(tarea.dueDate),
      assignedTo: tarea.assignedTo,
      priority: tarea.priority,
    });
    this.abierto.set(true);
  }

  protected cerrar(): void {
    this.abierto.set(false);
    this.editando.set(null);
  }

  protected async enviar(evento: Event): Promise<void> {
    evento.preventDefault();
    const v = this.formulario.getRawValue();
    const errores = erroresDeTarea(v);
    this.errores.set(errores);
    if (errores.length > 0) return;

    this.guardando.set(true);
    const resultado = await this.store.guardar({
      id: this.editando()?.id,
      title: v.title,
      description: v.description,
      category: v.category,
      dueDate: fechaDeCampo(v.dueDate),
      assignedTo: v.assignedTo,
      priority: v.priority,
    });
    this.guardando.set(false);

    if (resultado.ok) this.cerrar();
  }

  /** Borrar pide un segundo toque: la primera vez solo cambia la etiqueta. */
  protected async borrar(tarea: TareaDelPanel): Promise<void> {
    if (!this.confirmandoBorrado()) {
      this.confirmandoBorrado.set(true);
      return;
    }
    this.guardando.set(true);
    const resultado = await this.store.borrar(tarea.id);
    this.guardando.set(false);
    if (resultado.ok) this.cerrar();
  }
}
