import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

import { PUERTA_ALTA } from '../../core/alta/alta-gateway';
import {
  accionesDe,
  claveDeNombre,
  conIncidencias,
  ordenPorDefecto,
  type AccionSobreBoda,
  type BodaEnListado,
} from '../../features/superadmin/bodas';
import { crearFuenteBodasFirestore } from '../../features/superadmin/bodas.firestore';
import { AltaBoda } from '../../features/superadmin/alta-boda/alta-boda';
import { NpAlert } from '../../design-system/components/alert/alert';
import { NpButton } from '../../design-system/components/button/button';
import { NpCard } from '../../design-system/components/card/card';
import { NpEmptyState } from '../../design-system/components/empty-state/empty-state';
import { NpModal } from '../../design-system/components/modal/modal';
import { NpStatusChip } from '../../design-system/components/status-chip/status-chip';
import { npSortRows } from '../../design-system/components/table/sort';
import { NpSortable } from '../../design-system/components/table/sortable';
import { NpSortHeader } from '../../design-system/components/table/sort-header';
import { NpIcon } from '../../design-system/icons/icon';
import { fechaMedia } from '../../shared/fecha';

type Carga = 'cargando' | 'lista' | 'error';

/**
 * Panel de superadmin.
 *
 * Dos cosas y nada más: ver todas las bodas y dar de alta una nueva. Lo que
 * decide el orden del listado no es la fecha de alta sino la urgencia: primero
 * las bodas cuyo subdominio no se autorizó en Firebase Auth, porque ese fallo es
 * invisible hasta que la pareja intenta entrar con Google y se queda fuera de su
 * propia boda (regla 8 de CLAUDE.md).
 */
@Component({
  selector: 'np-admin-shell',
  imports: [
    TranslocoDirective,
    AltaBoda,
    NpAlert,
    NpButton,
    NpCard,
    NpEmptyState,
    NpModal,
    NpStatusChip,
    NpSortable,
    NpSortHeader,
    NpIcon,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <header class="np-admin__cabecera">
        <div class="np-admin__marca">
          <np-icon name="diamond" weight="fill" />
          <span>{{ t('superadmin.titulo') }}</span>
        </div>
        @if (incidencias() > 0) {
          <np-status-chip
            status="declined"
            [label]="t('superadmin.bodas.incidencias', { n: incidencias() })"
          />
        }
      </header>

      <main class="np-admin__cuerpo">
        <section class="np-admin__listado">
          @switch (carga()) {
            @case ('cargando') {
              <np-empty-state icon="clock-countdown" [title]="t('superadmin.bodas.cargando')" />
            }
            @case ('error') {
              <np-alert status="declined" [heading]="t('superadmin.bodas.error')">
                <p>{{ mensajeError() }}</p>
                <button npButton size="sm" type="button" (click)="recargar()">
                  <np-icon name="spinner-gap" />
                  {{ t('common.retry') }}
                </button>
              </np-alert>
            }
            @default {
              @if (bodas().length === 0) {
                <np-empty-state
                  icon="diamond"
                  [title]="t('superadmin.bodas.ninguna')"
                  [description]="t('superadmin.bodas.ningunaDescripcion')"
                />
              } @else {
                <!--
                  Siete columnas no caben en un móvil, así que la tabla se
                  desplaza dentro de su caja en vez de desbordar la página.
                -->
                <div class="np-table-scroll">
                  <table npSortable class="np-table">
                    <thead>
                      <tr>
                        <th npSortHeader="nombres">{{ t('superadmin.bodas.columna.pareja') }}</th>
                        <th npSortHeader="slug">{{ t('superadmin.bodas.columna.direccion') }}</th>
                        <th npSortHeader="weddingDate">
                          {{ t('superadmin.bodas.columna.fecha') }}
                        </th>
                        <th npSortHeader="plan">{{ t('superadmin.bodas.columna.plan') }}</th>
                        <th>{{ t('superadmin.bodas.columna.estado') }}</th>
                        <th npSortHeader="invitados">
                          {{ t('superadmin.bodas.columna.invitados') }}
                        </th>
                        <th>{{ t('superadmin.bodas.columna.acciones') }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (boda of bodas(); track boda.weddingId) {
                        <tr>
                          <td>
                            <div class="np-admin__pareja">
                              {{ t('publico.pareja', boda.pareja) }}
                            </div>
                            @if (boda.authDomain === 'pending') {
                              <!--
                              El aviso viaja pegado a la boda, no a un contador
                              del encabezado: quien mira esta fila tiene que
                              poder arreglarlo desde aquí.
                            -->
                              <div class="np-admin__incidencia">
                                <np-status-chip
                                  status="declined"
                                  [label]="t('superadmin.bodas.dominioPendiente')"
                                />
                                <button
                                  npButton
                                  size="sm"
                                  variant="danger"
                                  type="button"
                                  [loading]="reintentando() === boda.weddingId"
                                  (click)="reintentarDominio(boda)"
                                >
                                  {{ t('superadmin.bodas.reintentarDominio') }}
                                </button>
                              </div>
                              <p class="np-admin__ayuda">
                                {{ t('superadmin.bodas.dominioPendienteAyuda') }}
                              </p>
                            }
                          </td>
                          <td>{{ boda.slug }}</td>
                          <td>
                            @if (fechaDe(boda); as fecha) {
                              {{ fecha }}
                            } @else {
                              {{ t('superadmin.bodas.sinFecha') }}
                            }
                          </td>
                          <td>{{ t('superadmin.plan.' + boda.plan) }}</td>
                          <td>
                            <np-status-chip
                              [status]="colorEstado(boda)"
                              [label]="t('superadmin.estado.' + boda.status)"
                            />
                          </td>
                          <td>
                            {{
                              t('superadmin.bodas.confirmadosDeTotal', {
                                confirmados: boda.confirmados,
                                total: boda.invitados,
                              })
                            }}
                          </td>
                          <td>
                            <div class="np-admin__acciones">
                              @for (accion of acciones(boda); track accion.accion) {
                                <button
                                  npButton
                                  size="sm"
                                  type="button"
                                  [variant]="accion.variante"
                                  [loading]="cambiando() === boda.weddingId"
                                  (click)="pedirConfirmacion(boda, accion)"
                                >
                                  <np-icon [name]="accion.icono" />
                                  {{ t('superadmin.bodas.' + accion.accion) }}
                                </button>
                              }
                              @if (boda.status === 'active') {
                                <a
                                  class="np-admin__ver"
                                  [href]="urlPublica(boda)"
                                  target="_blank"
                                  rel="noopener"
                                >
                                  <np-icon name="share-network" />
                                  {{ t('superadmin.bodas.verWeb') }}
                                </a>
                              }
                            </div>
                            @if (noPublicable() === boda.weddingId) {
                              <np-alert
                                status="pending"
                                [heading]="t('superadmin.bodas.noPublicable')"
                              >
                                <ul class="np-admin__motivos">
                                  @for (motivo of motivos(); track motivo) {
                                    <li>{{ t('superadmin.bodas.motivo.' + motivo) }}</li>
                                  }
                                </ul>
                              </np-alert>
                            }
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            }
          }
        </section>

        <aside class="np-admin__alta">
          <np-card [heading]="t('superadmin.alta.titulo')">
            <np-alta-boda (altaHecha)="recargar()" />
          </np-card>
        </aside>
      </main>

      <!--
        Publicar no es destructivo, pero sí irreversible en la práctica: la
        dirección ya está en manos de quien la abrió. Por eso se confirma, y la
        frase dice qué va a pasar, no «¿estás seguro?».
      -->
      @if (pendiente(); as p) {
        <np-modal
          [open]="true"
          [heading]="t('superadmin.bodas.' + p.accion.accion)"
          (closed)="cancelar()"
        >
          <p>
            {{ t('superadmin.bodas.confirmar' + sufijo(p.accion.accion), { slug: p.boda.slug }) }}
          </p>
          <div np-modal-actions>
            <button npButton variant="ghost" type="button" (click)="cancelar()">
              {{ t('common.cancel') }}
            </button>
            <button npButton type="button" [variant]="p.accion.variante" (click)="confirmar()">
              <np-icon [name]="p.accion.icono" />
              {{ t('superadmin.bodas.' + p.accion.accion) }}
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
    .np-admin__cabecera {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--np-space-4);
      padding: var(--np-space-4) var(--np-space-5);
      background: var(--np-surface-surface);
      border-block-end: 1px solid var(--np-surface-border);
    }
    .np-admin__marca {
      display: flex;
      align-items: center;
      gap: var(--np-space-2);
      font-weight: var(--np-weight-semibold);
    }
    .np-admin__marca np-icon {
      color: var(--np-cat-rosa);
    }
    .np-admin__cuerpo {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 22rem;
      gap: var(--np-space-5);
      padding: var(--np-space-5);
      align-items: start;
    }
    .np-admin__pareja {
      font-weight: var(--np-weight-medium);
    }
    .np-admin__incidencia {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--np-space-2);
      margin-block-start: var(--np-space-2);
    }
    .np-admin__acciones {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--np-space-2);
    }
    .np-admin__ver {
      display: inline-flex;
      align-items: center;
      gap: var(--np-space-1);
      font-size: var(--np-text-sm);
      color: var(--np-surface-text-muted);
    }
    .np-admin__motivos {
      margin: 0;
      padding-inline-start: var(--np-space-4);
      font-size: var(--np-text-sm);
    }
    .np-admin__ayuda {
      margin: var(--np-space-1) 0 0;
      font-size: var(--np-text-xs);
      color: var(--np-surface-text-muted);
    }
    /* El panel se diseña primero para móvil: ahí el alta va debajo. */
    @media (max-width: 60rem) {
      .np-admin__cuerpo {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class AdminShell {
  private readonly fuente = crearFuenteBodasFirestore();
  private readonly puerta = inject(PUERTA_ALTA);

  /**
   * La tabla guarda el estado de ordenación; ordenar las filas es de aquí.
   *
   * Es deliberado en el design system: solo esta pantalla sabe que `weddingDate`
   * es una fecha y que `nombres` se compara con reglas de español.
   */
  private readonly tabla = viewChild(NpSortable);

  protected readonly carga = signal<Carga>('cargando');
  protected readonly mensajeError = signal('');
  protected readonly reintentando = signal<string | null>(null);

  /** La acción esperando confirmación, o `null` si no hay modal abierto. */
  protected readonly pendiente = signal<{
    readonly boda: BodaEnListado;
    readonly accion: AccionSobreBoda;
  } | null>(null);
  protected readonly cambiando = signal<string | null>(null);

  /** Boda cuya publicación se rechazó, y por qué. Se pinta bajo sus botones. */
  protected readonly noPublicable = signal<string | null>(null);
  protected readonly motivos = signal<readonly string[]>([]);

  private readonly todas = signal<readonly BodaEnListado[]>([]);

  protected readonly bodas = computed(() => {
    const porDefecto = [...this.todas()].sort(ordenPorDefecto);
    const orden = this.tabla()?.sort() ?? null;
    if (!orden) return porDefecto;

    return npSortRows(porDefecto, orden, {
      nombres: (boda) => claveDeNombre(boda),
      slug: (boda) => boda.slug,
      weddingDate: (boda) => boda.weddingDate,
      plan: (boda) => boda.plan,
      invitados: (boda) => boda.invitados,
    });
  });
  protected readonly incidencias = computed(() => conIncidencias(this.todas()));

  constructor() {
    void this.recargar();
  }

  /** Verde publicada, ámbar borrador, informativo archivada. Con su etiqueta. */
  protected colorEstado(boda: BodaEnListado): 'confirmed' | 'pending' | 'info' {
    switch (boda.status) {
      case 'active':
        return 'confirmed';
      case 'draft':
        return 'pending';
      default:
        return 'info';
    }
  }

  protected async recargar(): Promise<void> {
    this.carga.set('cargando');
    try {
      this.todas.set(await this.fuente.listar());
      this.carga.set('lista');
    } catch (error) {
      this.mensajeError.set(error instanceof Error ? error.message : String(error));
      this.carga.set('error');
    }
  }

  /**
   * La fecha, escrita en español.
   *
   * No con `DatePipe`: necesita `registerLocaleData` y lanza si falta, que es
   * como la portada se quedó sin fecha ni cuenta atrás. Ver `shared/fecha.ts`.
   */
  protected fechaDe(boda: BodaEnListado): string {
    return fechaMedia(boda.weddingDate, 'es');
  }

  protected acciones(boda: BodaEnListado): readonly AccionSobreBoda[] {
    return accionesDe(boda.status);
  }

  /** La dirección real de la boda, que es lo que uno quiere abrir al publicar. */
  protected urlPublica(boda: BodaEnListado): string {
    return `https://${boda.slug}.nupcialis.com`;
  }

  /** `publicar` → `Publicar`, para componer la clave de traducción. */
  protected sufijo(accion: string): string {
    return accion.charAt(0).toUpperCase() + accion.slice(1);
  }

  protected pedirConfirmacion(boda: BodaEnListado, accion: AccionSobreBoda): void {
    this.noPublicable.set(null);
    this.pendiente.set({ boda, accion });
  }

  protected cancelar(): void {
    this.pendiente.set(null);
  }

  protected async confirmar(): Promise<void> {
    const p = this.pendiente();
    if (!p) return;

    this.pendiente.set(null);
    this.cambiando.set(p.boda.weddingId);

    const resultado = await this.puerta.cambiarEstado(p.boda.weddingId, p.accion.destino);
    this.cambiando.set(null);

    if (resultado.ok) {
      await this.recargar();
      return;
    }

    // Que le falten datos a la boda no es un error de la pantalla: es
    // información sobre esa fila, y se cuenta ahí y no en una alerta global que
    // no dice de qué boda habla.
    if (resultado.motivos.length > 0) {
      this.motivos.set(resultado.motivos);
      this.noPublicable.set(p.boda.weddingId);
      return;
    }

    this.mensajeError.set(resultado.mensaje);
    this.carga.set('error');
  }

  protected async reintentarDominio(boda: BodaEnListado): Promise<void> {
    this.reintentando.set(boda.weddingId);
    const resultado = await this.puerta.autorizarDominio(boda.weddingId);
    this.reintentando.set(null);

    if (resultado.ok) {
      await this.recargar();
      return;
    }
    this.mensajeError.set(resultado.mensaje);
    this.carga.set('error');
  }
}
