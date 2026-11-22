import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';

import { PUERTA_CATALOGOS, type FalloCatalogo } from '../../../core/superadmin/catalogos-gateway';
import { NpAlert } from '../../../design-system/components/alert/alert';
import { NpButton } from '../../../design-system/components/button/button';
import { NpEmptyState } from '../../../design-system/components/empty-state/empty-state';
import { NpInput } from '../../../design-system/components/field/input';
import { NpModal } from '../../../design-system/components/modal/modal';
import { NpStatusChip } from '../../../design-system/components/status-chip/status-chip';
import { NpIcon } from '../../../design-system/icons/icon';
import { NP_ICON_LABELS } from '../../../design-system/icons/icon-name.generated';
import { centimosAEuros, centimosATexto, eurosACentimos } from '../gestion/gestion';
import {
  PRIORIDADES,
  TIPOS_CATALOGO,
  siguienteOrden,
  type PartidaDeCatalogo,
  type PreguntaDeCatalogo,
  type TareaDeCatalogo,
  type TipoCatalogo,
} from './catalogos';

type Elemento = TareaDeCatalogo | PartidaDeCatalogo | PreguntaDeCatalogo;
type Carga = 'cargando' | 'lista' | 'error';

interface Fila {
  readonly id: string;
  readonly celdas: readonly string[];
  readonly enabled: boolean;
  readonly origen: Elemento;
}

/** Las columnas de cada pestaña; el texto está en `superadmin.catalogos.col.*`. */
const COLUMNAS: Readonly<Record<TipoCatalogo, readonly string[]>> = {
  tasks: ['titulo', 'categoria', 'cuando', 'prioridad'],
  budget: ['categoria', 'concepto', 'estimado'],
  quiz: ['pregunta', 'correcta', 'dificultad'],
};

/**
 * Los catálogos «originales» (S1.x): lo que se vuelca a cada boda nueva.
 *
 * Tareas y presupuesto se copian al crear la boda; las preguntas del quiz se
 * ofrecen a la pareja como sugerencias. Editar aquí no toca las bodas que ya
 * existen, y lo que cada pareja cambie en su copia no vuelve aquí.
 */
@Component({
  selector: 'np-catalogos',
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
      <header class="ca__cabecera">
        <a class="ca__volver" routerLink="/superadmin">
          <np-icon name="arrow-left" />
          {{ t('superadmin.ficha.volver') }}
        </a>
        <h1>{{ t('superadmin.catalogos.titulo') }}</h1>
        <p>{{ t('superadmin.catalogos.ayuda') }}</p>
      </header>

      <main class="ca__cuerpo">
        <div class="ca__pestanas" role="tablist">
          @for (k of tipos; track k) {
            <button
              npButton
              type="button"
              role="tab"
              size="sm"
              [variant]="tipo() === k ? 'primary' : 'secondary'"
              [attr.aria-selected]="tipo() === k"
              (click)="elegir(k)"
            >
              {{ t('superadmin.catalogos.tipo.' + k) }}
            </button>
          }
        </div>

        <p class="ca__nota">{{ t('superadmin.catalogos.nota.' + tipo()) }}</p>

        @switch (carga()) {
          @case ('cargando') {
            <np-empty-state icon="clock-countdown" [title]="t('superadmin.catalogos.cargando')" />
          }
          @case ('error') {
            <np-alert status="declined" [heading]="t('superadmin.catalogos.errorCarga')">
              <p>{{ textoDeFallo(fallo(), t) }}</p>
              <button npButton size="sm" type="button" (click)="cargar()">
                <np-icon name="arrows-clockwise" />
                {{ t('common.retry') }}
              </button>
            </np-alert>
          }
          @default {
            <div class="ca__acciones">
              <button npButton type="button" (click)="nuevo()">
                <np-icon name="plus" />
                {{ t('superadmin.catalogos.nuevo') }}
              </button>
            </div>

            @if (filas().length === 0) {
              <np-empty-state
                icon="list-checks"
                [title]="t('superadmin.catalogos.vacio')"
                [description]="t('superadmin.catalogos.vacioDescripcion')"
              >
                <button npButton variant="secondary" type="button" (click)="cargarDeFabrica()">
                  <np-icon name="download-simple" />
                  {{ t('superadmin.catalogos.cargarFabrica') }}
                </button>
              </np-empty-state>
            } @else {
              <div class="np-table-scroll">
                <table class="np-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      @for (c of columnas(); track c) {
                        <th>{{ t('superadmin.catalogos.col.' + c) }}</th>
                      }
                      <th>{{ t('superadmin.catalogos.col.estado') }}</th>
                      <th>{{ t('superadmin.bodas.columna.acciones') }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (f of filas(); track f.id) {
                      <tr>
                        <td>{{ f.origen.order }}</td>
                        @for (c of f.celdas; track $index) {
                          <td>{{ c }}</td>
                        }
                        <td>
                          <np-status-chip
                            [status]="f.enabled ? 'confirmed' : 'pending'"
                            [label]="
                              f.enabled
                                ? t('superadmin.catalogos.activa')
                                : t('superadmin.catalogos.apagada')
                            "
                          />
                        </td>
                        <td>
                          <div class="ca__acciones">
                            <button
                              npButton
                              size="sm"
                              variant="secondary"
                              type="button"
                              (click)="editar(f.origen)"
                            >
                              <np-icon name="pencil-simple" />
                              {{ t('superadmin.finanzas.editar') }}
                            </button>
                            <button
                              npButton
                              size="sm"
                              variant="danger"
                              type="button"
                              (click)="porBorrar.set(f)"
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
      </main>

      @if (formAbierto()) {
        <np-modal
          [open]="true"
          [heading]="
            editandoId() ? t('superadmin.catalogos.editarTitulo') : t('superadmin.catalogos.nuevo')
          "
          (closed)="cerrarForm()"
        >
          <form class="ca__form" [formGroup]="form" (ngSubmit)="guardar()">
            @switch (tipo()) {
              @case ('tasks') {
                <label>
                  <span>{{ t('superadmin.catalogos.campo.titulo') }}</span>
                  <input npInput type="text" formControlName="title" maxlength="120" />
                </label>
                <label>
                  <span>{{ t('superadmin.catalogos.campo.categoria') }}</span>
                  <input npInput type="text" formControlName="category" maxlength="40" />
                </label>
                <label>
                  <span>{{ t('superadmin.catalogos.campo.meses') }}</span>
                  <input npInput type="text" inputmode="decimal" formControlName="meses" />
                  <small>{{ t('superadmin.catalogos.campo.mesesPista') }}</small>
                </label>
                <label>
                  <span>{{ t('superadmin.catalogos.campo.prioridad') }}</span>
                  <select npInput formControlName="priority">
                    @for (p of prioridades; track p) {
                      <option [value]="p">{{ t('superadmin.catalogos.prioridad.' + p) }}</option>
                    }
                  </select>
                </label>
                <label>
                  <span>{{ t('superadmin.catalogos.campo.icono') }}</span>
                  <select npInput formControlName="icon">
                    <option value="">{{ t('superadmin.catalogos.sinIcono') }}</option>
                    @for (i of iconos; track i[0]) {
                      <option [value]="i[0]">{{ i[1] }}</option>
                    }
                  </select>
                </label>
              }
              @case ('budget') {
                <label>
                  <span>{{ t('superadmin.catalogos.campo.categoria') }}</span>
                  <input npInput type="text" formControlName="category" maxlength="40" />
                </label>
                <label>
                  <span>{{ t('superadmin.catalogos.campo.concepto') }}</span>
                  <input npInput type="text" formControlName="concept" maxlength="120" />
                </label>
                <label>
                  <span>{{ t('superadmin.catalogos.campo.estimado') }}</span>
                  <input npInput type="text" inputmode="decimal" formControlName="importe" />
                  <small>{{ t('superadmin.catalogos.campo.estimadoPista') }}</small>
                </label>
              }
              @case ('quiz') {
                <label>
                  <span>{{ t('superadmin.catalogos.campo.pregunta') }}</span>
                  <input npInput type="text" formControlName="text" maxlength="200" />
                </label>
                <label>
                  <span>{{ t('superadmin.catalogos.campo.correcta') }}</span>
                  <input npInput type="text" formControlName="correctAnswer" maxlength="80" />
                </label>
                @for (n of [1, 2, 3]; track n) {
                  <label>
                    <span>{{ t('superadmin.catalogos.campo.falsa', { n }) }}</span>
                    <input
                      npInput
                      type="text"
                      [formControlName]="'falsa' + n"
                      [attr.data-control]="'falsa' + n"
                      maxlength="80"
                    />
                  </label>
                }
                <label>
                  <span>{{ t('superadmin.catalogos.campo.dificultad') }}</span>
                  <select npInput formControlName="difficulty">
                    @for (d of [1, 2, 3]; track d) {
                      <option [value]="d">{{ t('superadmin.catalogos.dificultad.' + d) }}</option>
                    }
                  </select>
                </label>
                <label>
                  <span>{{ t('superadmin.catalogos.campo.pista') }}</span>
                  <input npInput type="text" formControlName="hint" maxlength="140" />
                </label>
              }
            }
            <label>
              <span>{{ t('superadmin.catalogos.campo.orden') }}</span>
              <input npInput type="number" min="0" formControlName="order" />
            </label>
            <label class="ca__casilla">
              <input type="checkbox" formControlName="enabled" />
              <span>{{ t('superadmin.catalogos.campo.activa') }}</span>
            </label>
            @if (errorForm(); as e) {
              <p class="ca__error" role="alert">
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

      @if (porBorrar(); as f) {
        <np-modal
          [open]="true"
          [heading]="t('superadmin.catalogos.borrarTitulo')"
          (closed)="porBorrar.set(null)"
        >
          <p>{{ t('superadmin.catalogos.borrarConfirmar', { nombre: f.celdas[0] }) }}</p>
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
    .ca__cabecera {
      display: grid;
      gap: var(--np-space-2);
      padding: var(--np-space-4);
      background: var(--np-surface-surface);
      border-block-end: 1px solid var(--np-surface-border);
    }
    .ca__cabecera h1,
    .ca__cabecera p {
      margin: 0;
    }
    .ca__cabecera h1 {
      font-size: var(--np-text-xl);
    }
    .ca__cabecera p,
    .ca__nota,
    .ca__form small {
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-sm);
    }
    .ca__volver {
      display: inline-flex;
      align-items: center;
      gap: var(--np-space-1);
      font-size: var(--np-text-sm);
      color: var(--np-surface-text-muted);
    }
    .ca__cuerpo {
      display: grid;
      gap: var(--np-space-4);
      padding: var(--np-space-4);
      max-inline-size: 70rem;
      margin-inline: auto;
    }
    .ca__nota {
      margin: 0;
    }
    .ca__pestanas,
    .ca__acciones {
      display: flex;
      flex-wrap: wrap;
      gap: var(--np-space-2);
    }
    .ca__form {
      display: grid;
      gap: var(--np-space-3);
    }
    .ca__form label {
      display: grid;
      gap: var(--np-space-1);
    }
    .ca__form .ca__casilla {
      display: flex;
      align-items: center;
      gap: var(--np-space-2);
    }
    .ca__error {
      display: flex;
      align-items: center;
      gap: var(--np-space-1);
      margin: 0;
      color: var(--np-declined-fg);
      font-size: var(--np-text-sm);
    }
  `,
})
export class PantallaCatalogos {
  private readonly puerta = inject(PUERTA_CATALOGOS);
  private readonly i18n = inject(TranslocoService);

  protected readonly tipos = TIPOS_CATALOGO;
  protected readonly prioridades = PRIORIDADES;
  protected readonly iconos = Object.entries(NP_ICON_LABELS);

  protected readonly tipo = signal<TipoCatalogo>('tasks');
  protected readonly carga = signal<Carga>('cargando');
  protected readonly fallo = signal<FalloCatalogo | null>(null);

  private readonly tareas = signal<readonly TareaDeCatalogo[]>([]);
  private readonly partidas = signal<readonly PartidaDeCatalogo[]>([]);
  private readonly preguntas = signal<readonly PreguntaDeCatalogo[]>([]);

  protected readonly columnas = computed(() => COLUMNAS[this.tipo()]);

  protected readonly filas = computed<readonly Fila[]>(() => {
    const t = (clave: string, datos?: Record<string, unknown>) => this.i18n.translate(clave, datos);

    switch (this.tipo()) {
      case 'tasks':
        return this.tareas().map((x) => ({
          id: x.id,
          enabled: x.enabled,
          origen: x,
          celdas: [
            x.title,
            x.category,
            t('superadmin.catalogos.mesesAntes', { n: x.mesesAntes }),
            t(`superadmin.catalogos.prioridad.${x.priority}`),
          ],
        }));
      case 'budget':
        return this.partidas().map((x) => ({
          id: x.id,
          enabled: x.enabled,
          origen: x,
          celdas: [
            x.category,
            x.concept,
            x.estimatedCents > 0 ? centimosAEuros(x.estimatedCents) : '—',
          ],
        }));
      case 'quiz':
        return this.preguntas().map((x) => ({
          id: x.id,
          enabled: x.enabled,
          origen: x,
          celdas: [x.text, x.correctAnswer, t(`superadmin.catalogos.dificultad.${x.difficulty}`)],
        }));
    }
  });

  protected readonly formAbierto = signal(false);
  protected readonly editandoId = signal<string | null>(null);
  protected readonly guardando = signal(false);
  protected readonly errorForm = signal<string | null>(null);
  protected readonly porBorrar = signal<Fila | null>(null);

  protected readonly form = new FormGroup({
    title: new FormControl('', { nonNullable: true }),
    category: new FormControl('', { nonNullable: true }),
    meses: new FormControl('', { nonNullable: true }),
    priority: new FormControl('normal', { nonNullable: true }),
    icon: new FormControl('', { nonNullable: true }),
    concept: new FormControl('', { nonNullable: true }),
    importe: new FormControl('', { nonNullable: true }),
    text: new FormControl('', { nonNullable: true }),
    correctAnswer: new FormControl('', { nonNullable: true }),
    falsa1: new FormControl('', { nonNullable: true }),
    falsa2: new FormControl('', { nonNullable: true }),
    falsa3: new FormControl('', { nonNullable: true }),
    difficulty: new FormControl('1', { nonNullable: true }),
    hint: new FormControl('', { nonNullable: true }),
    order: new FormControl(1, { nonNullable: true }),
    enabled: new FormControl(true, { nonNullable: true }),
  });

  constructor() {
    void this.cargar();
  }

  protected elegir(tipo: TipoCatalogo): void {
    if (tipo === this.tipo()) return;
    this.tipo.set(tipo);
    void this.cargar();
  }

  protected async cargar(): Promise<void> {
    this.carga.set('cargando');
    this.fallo.set(null);

    const tipo = this.tipo();
    const resultado =
      tipo === 'tasks'
        ? await this.puerta.tareas()
        : tipo === 'budget'
          ? await this.puerta.partidas()
          : await this.puerta.preguntas();

    // Si cambió de pestaña mientras cargaba, esta respuesta ya no es la suya.
    if (tipo !== this.tipo()) return;

    if (!resultado.ok) {
      this.fallo.set(resultado.fallo);
      this.carga.set('error');
      return;
    }

    if (tipo === 'tasks') this.tareas.set(resultado.datos as readonly TareaDeCatalogo[]);
    else if (tipo === 'budget') this.partidas.set(resultado.datos as readonly PartidaDeCatalogo[]);
    else this.preguntas.set(resultado.datos as readonly PreguntaDeCatalogo[]);
    this.carga.set('lista');
  }

  protected nuevo(): void {
    this.form.reset({
      priority: 'normal',
      difficulty: '1',
      enabled: true,
      order: siguienteOrden(this.filas().map((f) => f.origen)),
    });
    this.editandoId.set(null);
    this.errorForm.set(null);
    this.formAbierto.set(true);
  }

  protected editar(origen: Elemento): void {
    this.form.reset({
      enabled: origen.enabled,
      order: origen.order,
      priority: 'normal',
      difficulty: '1',
    });

    switch (this.tipo()) {
      case 'tasks': {
        const x = origen as TareaDeCatalogo;
        this.form.patchValue({
          title: x.title,
          category: x.category,
          meses: String(x.mesesAntes).replace('.', ','),
          priority: x.priority,
          icon: x.icon,
        });
        break;
      }
      case 'budget': {
        const x = origen as PartidaDeCatalogo;
        this.form.patchValue({
          category: x.category,
          concept: x.concept,
          importe: x.estimatedCents > 0 ? centimosATexto(x.estimatedCents) : '',
        });
        break;
      }
      case 'quiz': {
        const x = origen as PreguntaDeCatalogo;
        this.form.patchValue({
          text: x.text,
          correctAnswer: x.correctAnswer,
          falsa1: x.wrongAnswers[0],
          falsa2: x.wrongAnswers[1],
          falsa3: x.wrongAnswers[2],
          difficulty: String(x.difficulty),
          hint: x.hint ?? '',
        });
        break;
      }
    }

    this.editandoId.set(origen.id);
    this.errorForm.set(null);
    this.formAbierto.set(true);
  }

  protected cerrarForm(): void {
    this.formAbierto.set(false);
  }

  /** Lo que se manda al servidor, que es quien valida de verdad. */
  private elemento(): Record<string, unknown> | null {
    const v = this.form.getRawValue();
    const comunes = { order: Number(v.order), enabled: v.enabled };

    switch (this.tipo()) {
      case 'tasks': {
        const meses = Number(v.meses.trim().replace(',', '.'));
        return {
          ...comunes,
          title: v.title,
          category: v.category,
          mesesAntes: v.meses.trim() === '' ? NaN : meses,
          priority: v.priority,
          icon: v.icon,
        };
      }
      case 'budget': {
        const centimos = v.importe.trim() === '' ? 0 : eurosACentimos(v.importe);
        if (centimos === null) {
          this.errorForm.set(this.i18n.translate('superadmin.catalogos.error.importe'));
          return null;
        }
        return { ...comunes, category: v.category, concept: v.concept, estimatedCents: centimos };
      }
      case 'quiz':
        return {
          ...comunes,
          text: v.text,
          correctAnswer: v.correctAnswer,
          wrongAnswers: [v.falsa1, v.falsa2, v.falsa3],
          difficulty: Number(v.difficulty),
          hint: v.hint,
        };
    }
  }

  protected async guardar(): Promise<void> {
    this.errorForm.set(null);
    const elemento = this.elemento();
    if (elemento === null) return;

    this.guardando.set(true);
    const resultado = await this.puerta.guardar(this.tipo(), this.editandoId(), elemento);
    this.guardando.set(false);

    if (!resultado.ok) {
      this.errorForm.set(this.textoDeFallo(resultado.fallo, (k) => this.i18n.translate(k)));
      return;
    }

    this.formAbierto.set(false);
    await this.cargar();
  }

  protected async borrar(): Promise<void> {
    const fila = this.porBorrar();
    if (!fila) return;

    this.guardando.set(true);
    const resultado = await this.puerta.borrar(this.tipo(), fila.id);
    this.guardando.set(false);
    this.porBorrar.set(null);

    if (!resultado.ok) {
      this.fallo.set(resultado.fallo);
      this.carga.set('error');
      return;
    }
    await this.cargar();
  }

  protected async cargarDeFabrica(): Promise<void> {
    this.carga.set('cargando');
    const resultado = await this.puerta.cargarDeFabrica(this.tipo());
    if (!resultado.ok) {
      this.fallo.set(resultado.fallo);
      this.carga.set('error');
      return;
    }
    await this.cargar();
  }

  protected textoDeFallo(fallo: FalloCatalogo | null, t: (clave: string) => string): string {
    if (!fallo) return '';
    switch (fallo.tipo) {
      case 'sin-permiso':
        return t('superadmin.alta.sinPermiso');
      case 'sin-verificar':
        return t('superadmin.alta.sinVerificar');
      case 'red':
        return t('superadmin.catalogos.error.red');
      case 'lleno':
        return t('superadmin.catalogos.error.lleno');
      case 'invalido':
        return t(`superadmin.catalogos.error.${fallo.motivo}`);
      default:
        return fallo.mensaje;
    }
  }
}
