import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';

import {
  PUERTA_ESTADISTICAS,
  type FalloEstadisticas,
} from '../../../core/superadmin/estadisticas-gateway';
import { NpAlert } from '../../../design-system/components/alert/alert';
import { NpButton } from '../../../design-system/components/button/button';
import { NpEmptyState } from '../../../design-system/components/empty-state/empty-state';
import { NpModal } from '../../../design-system/components/modal/modal';
import { NpStatusChip } from '../../../design-system/components/status-chip/status-chip';
import { NpIcon } from '../../../design-system/icons/icon';
import type { NpIconName } from '../../../design-system/icons/icon-name.generated';
import {
  MAX_TOPE_FOTOS,
  MIN_TOPE_FOTOS,
  usoDeFotos,
  validarTopeDeFotos,
  type Estadisticas,
  type FilaDeBoda,
  type NivelDeUso,
} from './estadisticas';
import { NpInput } from '../../../design-system/components/field/input';

type Carga = 'cargando' | 'lista' | 'error';

interface Ficha {
  readonly clave: string;
  readonly icono: NpIconName;
  readonly valor: string;
  /** Marca los datos que son una estimación, para que no se tomen por exactos. */
  readonly estimado: boolean;
}

/** Cómo se pinta cada nivel: color del chip, icono y barra. Siempre con texto. */
const ESTADO_DE_NIVEL: Record<NivelDeUso, 'confirmed' | 'pending' | 'declined'> = {
  ok: 'confirmed',
  cerca: 'pending',
  llena: 'declined',
};

/**
 * Las estadísticas del superadmin (§8.18).
 *
 * Arriba, lo que pasa en el producto entero; debajo, una fila por boda con su
 * galería frente a su tope. El orden no es el de alta sino el de urgencia: las
 * galerías llenas primero, porque «la galería está llena» es lo que un invitado
 * se encuentra el día de la boda si nadie subió el tope a tiempo.
 */
@Component({
  selector: 'np-estadisticas',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    TranslocoDirective,
    NpAlert,
    NpButton,
    NpEmptyState,
    NpIcon,
    NpModal,
    NpStatusChip,
    NpInput,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <header class="est__cabecera">
        <a class="est__volver" routerLink="/superadmin">
          <np-icon name="arrow-left" />
          {{ t('superadmin.estadisticas.volver') }}
        </a>
        <h1>{{ t('superadmin.estadisticas.titulo') }}</h1>
      </header>

      <main class="est__cuerpo">
        @switch (carga()) {
          @case ('cargando') {
            <np-empty-state
              icon="clock-countdown"
              [title]="t('superadmin.estadisticas.cargando')"
            />
          }
          @case ('error') {
            <np-alert status="declined" [heading]="t('superadmin.estadisticas.error')">
              <p>{{ textoDeFallo(fallo(), t) }}</p>
              <button npButton size="sm" type="button" (click)="cargar()">
                <np-icon name="arrows-clockwise" />
                {{ t('common.retry') }}
              </button>
            </np-alert>
          }
          @default {
            @if (datos(); as d) {
              <ul class="est__fichas">
                @for (ficha of fichas(); track ficha.clave) {
                  <li class="est__ficha">
                    <np-icon [name]="ficha.icono" />
                    <strong>{{ ficha.valor }}</strong>
                    <span>
                      {{ t('superadmin.estadisticas.ficha.' + ficha.clave) }}
                      @if (ficha.estimado) {
                        <em>{{ t('superadmin.estadisticas.estimado') }}</em>
                      }
                    </span>
                  </li>
                }
              </ul>

              @if (d.recortado) {
                <np-alert status="pending" [heading]="t('superadmin.estadisticas.recortado')">
                  <p>{{ t('superadmin.estadisticas.recortadoAyuda') }}</p>
                </np-alert>
              }

              @if (filas().length === 0) {
                <np-empty-state
                  icon="chart-bar"
                  [title]="t('superadmin.estadisticas.ninguna')"
                  [description]="t('superadmin.estadisticas.ningunaDescripcion')"
                />
              } @else {
                <h2>{{ t('superadmin.estadisticas.porBoda') }}</h2>
                <ul class="est__bodas">
                  @for (fila of filas(); track fila.boda.weddingId) {
                    <li class="est__boda" [attr.data-nivel]="fila.uso.nivel">
                      <div class="est__boda-cab">
                        <strong>{{ fila.boda.slug }}</strong>
                        <span class="est__estado">{{
                          t('superadmin.estado.' + fila.boda.status)
                        }}</span>
                        <span class="est__estado">{{
                          t('superadmin.plan.' + fila.boda.plan)
                        }}</span>
                      </div>

                      <div
                        class="est__barra"
                        role="meter"
                        [attr.aria-valuemin]="0"
                        [attr.aria-valuemax]="fila.boda.tope"
                        [attr.aria-valuenow]="fila.boda.fotos"
                        [attr.aria-label]="t('superadmin.estadisticas.fotos')"
                      >
                        <span
                          class="est__relleno"
                          [style.inline-size.%]="fila.uso.porcentaje"
                        ></span>
                      </div>

                      <div class="est__uso">
                        <np-status-chip
                          [status]="estadoDe(fila.uso.nivel)"
                          [label]="t('superadmin.estadisticas.nivel.' + fila.uso.nivel)"
                        />
                        <span>
                          {{
                            t('superadmin.estadisticas.fotosDeTope', {
                              fotos: fila.boda.fotos,
                              tope: fila.boda.tope,
                              porcentaje: fila.uso.porcentaje,
                            })
                          }}
                        </span>
                        <span class="est__origen">
                          {{
                            fila.boda.topeEsPropio
                              ? t('superadmin.estadisticas.topePropio')
                              : t('superadmin.estadisticas.topeDefecto')
                          }}
                        </span>
                      </div>

                      <dl class="est__datos">
                        <div>
                          <dt>{{ t('superadmin.estadisticas.invitados') }}</dt>
                          <dd>
                            {{
                              t('superadmin.bodas.confirmadosDeTotal', {
                                confirmados: fila.boda.confirmados,
                                total: fila.boda.invitados,
                              })
                            }}
                          </dd>
                        </div>
                        <div>
                          <dt>{{ t('superadmin.estadisticas.ficha.partidasQuiz') }}</dt>
                          <dd>{{ fila.boda.partidasQuiz }}</dd>
                        </div>
                        <div>
                          <dt>{{ t('superadmin.estadisticas.ficha.accesosInvitados') }}</dt>
                          <dd>{{ fila.boda.accesos }}</dd>
                        </div>
                      </dl>

                      <button npButton size="sm" type="button" (click)="editar(fila.boda)">
                        <np-icon name="pencil-simple" />
                        {{ t('superadmin.estadisticas.cambiarTope') }}
                      </button>
                    </li>
                  }
                </ul>
              }
            }
          }
        }
      </main>

      @if (editando(); as boda) {
        <np-modal
          [open]="true"
          [heading]="t('superadmin.estadisticas.topeDe', { slug: boda.slug })"
          (closed)="cerrar()"
        >
          <form class="est__form" (submit)="guardar($event)">
            <label>
              {{ t('superadmin.estadisticas.campoTope') }}
              <input
                npInput
                type="number"
                inputmode="numeric"
                [min]="min"
                [max]="max"
                step="1"
                [formControl]="tope"
              />
            </label>
            <small>{{ t('superadmin.estadisticas.campoTopeAyuda', { min: min, max: max }) }}</small>
            @if (errorTope()) {
              <p class="est__error" role="alert">
                <np-icon name="warning" />
                {{ t(errorTope()!) }}
              </p>
            }
          </form>
          <div np-modal-actions>
            <button npButton variant="ghost" type="button" (click)="cerrar()">
              {{ t('common.cancel') }}
            </button>
            @if (boda.topeEsPropio) {
              <button
                npButton
                variant="ghost"
                type="button"
                [loading]="guardando()"
                (click)="valorPorDefecto()"
              >
                {{ t('superadmin.estadisticas.volverAlDefecto') }}
              </button>
            }
            <button npButton type="button" [loading]="guardando()" (click)="guardar($event)">
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
      min-block-size: 100dvh;
      background: var(--np-surface-canvas);
    }
    .est__cabecera {
      display: grid;
      gap: var(--np-space-2);
      padding: var(--np-space-4);
      background: var(--np-surface-surface);
      border-block-end: 1px solid var(--np-surface-border);
    }
    .est__cabecera h1 {
      margin: 0;
      font-size: var(--np-text-xl);
    }
    .est__volver {
      display: inline-flex;
      align-items: center;
      gap: var(--np-space-1);
      font-size: var(--np-text-sm);
      color: var(--np-surface-text-muted);
    }
    .est__cuerpo {
      display: grid;
      gap: var(--np-space-4);
      padding: var(--np-space-4);
      max-inline-size: 60rem;
      margin-inline: auto;
    }
    h2 {
      margin: 0;
      font-size: var(--np-text-lg);
    }
    .est__fichas {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--np-space-3);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .est__ficha {
      display: grid;
      gap: var(--np-space-1);
      padding: var(--np-space-3);
      background: var(--np-surface-surface);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-md);
    }
    .est__ficha np-icon {
      color: var(--np-cat-rosa);
    }
    .est__ficha strong {
      font-size: var(--np-text-xl);
    }
    .est__ficha span {
      font-size: var(--np-text-sm);
      color: var(--np-surface-text-muted);
    }
    .est__ficha em {
      font-style: normal;
      font-size: var(--np-text-xs);
      border: 1px dashed var(--np-surface-border);
      border-radius: var(--np-radius-full);
      padding-inline: var(--np-space-2);
      margin-inline-start: var(--np-space-1);
    }
    .est__bodas {
      display: grid;
      gap: var(--np-space-3);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .est__boda {
      display: grid;
      gap: var(--np-space-2);
      padding: var(--np-space-3);
      background: var(--np-surface-surface);
      border: 1px solid var(--np-surface-border);
      border-inline-start-width: 4px;
      border-radius: var(--np-radius-md);
    }
    .est__boda[data-nivel='ok'] {
      border-inline-start-color: var(--np-confirmed-border);
    }
    .est__boda[data-nivel='cerca'] {
      border-inline-start-color: var(--np-pending-border);
    }
    .est__boda[data-nivel='llena'] {
      border-inline-start-color: var(--np-declined-border);
    }
    .est__boda-cab {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: var(--np-space-2);
    }
    .est__estado {
      font-size: var(--np-text-xs);
      color: var(--np-surface-text-muted);
    }
    .est__barra {
      block-size: 0.5rem;
      border-radius: var(--np-radius-full);
      background: var(--np-surface-border);
      overflow: hidden;
    }
    .est__relleno {
      display: block;
      block-size: 100%;
      background: var(--np-confirmed-fg);
    }
    .est__boda[data-nivel='cerca'] .est__relleno {
      background: var(--np-pending-fg);
    }
    .est__boda[data-nivel='llena'] .est__relleno {
      background: var(--np-declined-fg);
    }
    .est__uso {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--np-space-2);
      font-size: var(--np-text-sm);
    }
    .est__origen {
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-xs);
    }
    .est__datos {
      display: flex;
      flex-wrap: wrap;
      gap: var(--np-space-4);
      margin: 0;
    }
    .est__datos dt {
      font-size: var(--np-text-xs);
      color: var(--np-surface-text-muted);
    }
    .est__datos dd {
      margin: 0;
      font-weight: var(--np-weight-medium);
    }
    .est__form {
      display: grid;
      gap: var(--np-space-2);
    }
    .est__form label {
      display: grid;
      gap: var(--np-space-1);
    }
    .est__error {
      display: flex;
      align-items: center;
      gap: var(--np-space-1);
      margin: 0;
      color: var(--np-declined-fg);
      font-size: var(--np-text-sm);
    }
    @media (min-width: 40rem) {
      .est__fichas {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
    }
  `,
})
export class PantallaEstadisticas {
  private readonly puerta = inject(PUERTA_ESTADISTICAS);

  protected readonly min = MIN_TOPE_FOTOS;
  protected readonly max = MAX_TOPE_FOTOS;

  protected readonly carga = signal<Carga>('cargando');
  protected readonly fallo = signal<FalloEstadisticas | null>(null);
  protected readonly datos = signal<Estadisticas | null>(null);

  protected readonly editando = signal<FilaDeBoda | null>(null);
  protected readonly guardando = signal(false);
  protected readonly errorTope = signal<string | null>(null);
  protected readonly tope = new FormControl<number | null>(null);

  /** Las galerías más llenas primero: es lo que hay que mirar antes. */
  protected readonly filas = computed(() => {
    const filas = this.datos()?.bodas ?? [];
    return filas
      .map((boda) => ({ boda, uso: usoDeFotos(boda.fotos, boda.tope) }))
      .sort(
        (a, b) =>
          b.uso.porcentaje - a.uso.porcentaje || a.boda.slug.localeCompare(b.boda.slug, 'es'),
      );
  });

  protected readonly fichas = computed<readonly Ficha[]>(() => {
    const r = this.datos()?.resumen;
    if (!r) return [];
    const n = (valor: number) => new Intl.NumberFormat('es-ES').format(valor);
    return [
      { clave: 'bodasActivas', icono: 'diamond', valor: n(r.bodasActivas), estimado: false },
      {
        clave: 'bodasBorrador',
        icono: 'pencil-simple',
        valor: n(r.bodasBorrador),
        estimado: false,
      },
      { clave: 'bodasArchivadas', icono: 'archive', valor: n(r.bodasArchivadas), estimado: false },
      { clave: 'altasDelMes', icono: 'plus', valor: n(r.altasDelMes), estimado: false },
      { clave: 'invitados', icono: 'users', valor: n(r.invitados), estimado: false },
      { clave: 'fotos', icono: 'camera', valor: n(r.fotos), estimado: false },
      {
        clave: 'almacenamiento',
        icono: 'images',
        valor: `${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 }).format(r.almacenamientoMB)} MB`,
        estimado: true,
      },
      { clave: 'partidasQuiz', icono: 'trophy', valor: n(r.partidasQuiz), estimado: false },
      { clave: 'accesosInvitados', icono: 'user', valor: n(r.accesosInvitados), estimado: false },
    ];
  });

  constructor() {
    void this.cargar();
  }

  protected estadoDe(nivel: NivelDeUso): 'confirmed' | 'pending' | 'declined' {
    return ESTADO_DE_NIVEL[nivel];
  }

  protected textoDeFallo(fallo: FalloEstadisticas | null, t: (clave: string) => string): string {
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

  protected async cargar(): Promise<void> {
    this.carga.set('cargando');
    const r = await this.puerta.leer();
    if (r.ok) {
      this.datos.set(r.datos);
      this.carga.set('lista');
    } else {
      this.fallo.set(r.fallo);
      this.carga.set('error');
    }
  }

  protected editar(boda: FilaDeBoda): void {
    this.errorTope.set(null);
    this.tope.setValue(boda.tope);
    this.editando.set(boda);
  }

  protected cerrar(): void {
    this.editando.set(null);
  }

  protected async valorPorDefecto(): Promise<void> {
    await this.aplicar(null);
  }

  protected async guardar(evento: Event): Promise<void> {
    evento.preventDefault();
    const comprobado = validarTopeDeFotos(this.tope.value);
    if (!comprobado.ok || comprobado.valor === null) {
      this.errorTope.set('superadmin.estadisticas.topeInvalido');
      return;
    }
    await this.aplicar(comprobado.valor);
  }

  private async aplicar(valor: number | null): Promise<void> {
    const boda = this.editando();
    if (!boda) return;

    this.errorTope.set(null);
    this.guardando.set(true);
    const r = await this.puerta.fijarTope(boda.weddingId, valor);
    this.guardando.set(false);

    if (!r.ok) {
      this.errorTope.set(
        r.fallo.tipo === 'tope-invalido'
          ? 'superadmin.estadisticas.topeInvalido'
          : 'superadmin.estadisticas.falloGuardar',
      );
      return;
    }

    // Se actualiza la fila en pantalla sin volver a contar toda la plataforma.
    const actual = this.datos();
    if (actual) {
      this.datos.set({
        ...actual,
        bodas: actual.bodas.map((b) =>
          b.weddingId === boda.weddingId
            ? { ...b, tope: r.maxPhotos, topeEsPropio: r.topeEsPropio }
            : b,
        ),
      });
    }
    this.editando.set(null);
  }
}
