import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';

import { PUERTA_ALTA } from '../../core/alta/alta-gateway';
import {
  accionesDe,
  claveDeNombre,
  conIncidencias,
  filtrarBodas,
  hayFiltros,
  ordenPorDefecto,
  SIN_FILTROS,
  type AccionSobreBoda,
  type BodaEnListado,
  type FiltrosDeBodas,
} from '../../features/superadmin/bodas';
import { crearFuenteBodasFirestore } from '../../features/superadmin/bodas.firestore';
import { AltaBoda } from '../../features/superadmin/alta-boda/alta-boda';
import { NpAlert } from '../../design-system/components/alert/alert';
import { NpButton } from '../../design-system/components/button/button';
import { NpEmptyState } from '../../design-system/components/empty-state/empty-state';
import { NpModal } from '../../design-system/components/modal/modal';
import { NpStatusChip } from '../../design-system/components/status-chip/status-chip';
import { npSortRows } from '../../design-system/components/table/sort';
import { NpSortable } from '../../design-system/components/table/sortable';
import { NpSortHeader } from '../../design-system/components/table/sort-header';
import { NpIcon } from '../../design-system/icons/icon';
import { fechaMedia } from '../../shared/fecha';
import { NpInput } from '../../design-system/components/field/input';

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
    RouterLink,
    TranslocoDirective,
    AltaBoda,
    NpAlert,
    NpButton,
    NpEmptyState,
    NpModal,
    NpStatusChip,
    NpSortable,
    NpSortHeader,
    NpIcon,
    NpInput,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <header class="np-admin__cabecera">
        <div class="np-admin__marca">
          <np-icon name="diamond" weight="fill" />
          <span>{{ t('superadmin.titulo') }}</span>
        </div>
        <div class="np-admin__cabecera-acciones">
          @if (incidencias() > 0) {
            <np-status-chip
              status="declined"
              [label]="t('superadmin.bodas.incidencias', { n: incidencias() })"
            />
          }
          <button
            npButton
            variant="ghost"
            type="button"
            [loading]="completando()"
            (click)="completarBodas()"
          >
            <np-icon name="arrows-clockwise" />
            {{ t('superadmin.completar.boton') }}
          </button>
          <button npButton type="button" (click)="abrirAlta()">
            <np-icon name="plus" />
            {{ t('superadmin.alta.abrir') }}
          </button>
        </div>
      </header>

      <main class="np-admin__cuerpo">
        <section class="np-admin__listado">
          @if (carga() === 'lista' && todas().length > 0) {
            <div class="np-admin__filtros" role="search">
              <label class="np-admin__buscar">
                <span>{{ t('superadmin.bodas.filtro.buscar') }}</span>
                <input
                  npInput
                  type="search"
                  [value]="filtros().texto"
                  [placeholder]="t('superadmin.bodas.filtro.buscarPista')"
                  (input)="cambiarFiltro('texto', $any($event.target).value)"
                />
              </label>
              <label>
                <span>{{ t('superadmin.bodas.filtro.estado') }}</span>
                <select
                  npInput
                  [value]="filtros().estado"
                  (change)="cambiarFiltro('estado', $any($event.target).value)"
                >
                  @for (e of estadosFiltro; track e) {
                    <option [value]="e">{{ t('superadmin.bodas.filtro.estados.' + e) }}</option>
                  }
                </select>
              </label>
              <label>
                <span>{{ t('superadmin.bodas.filtro.fecha') }}</span>
                <select
                  npInput
                  [value]="filtros().momento"
                  (change)="cambiarFiltro('momento', $any($event.target).value)"
                >
                  @for (m of momentosFiltro; track m) {
                    <option [value]="m">{{ t('superadmin.bodas.filtro.momentos.' + m) }}</option>
                  }
                </select>
              </label>
              <p class="np-admin__cuenta" aria-live="polite">
                {{
                  t('superadmin.bodas.filtro.cuenta', {
                    n: bodas().length,
                    total: todas().length,
                  })
                }}
                <button
                  npButton
                  variant="ghost"
                  size="sm"
                  type="button"
                  [disabled]="!hayFiltros(filtros())"
                  (click)="limpiar()"
                >
                  <np-icon name="x" />
                  {{ t('superadmin.bodas.filtro.limpiar') }}
                </button>
              </p>
            </div>
          }
          @if (avisoCompletar(); as aviso) {
            <np-alert [status]="aviso.ok ? 'confirmed' : 'declined'">
              <p>{{ aviso.texto }}</p>
            </np-alert>
          }
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
              @if (todas().length === 0) {
                <np-empty-state
                  icon="diamond"
                  [title]="t('superadmin.bodas.ninguna')"
                  [description]="t('superadmin.bodas.ningunaDescripcion')"
                />
              } @else if (bodas().length === 0) {
                <np-empty-state
                  icon="magnifying-glass"
                  [title]="t('superadmin.bodas.filtro.ninguna')"
                  [description]="t('superadmin.bodas.filtro.ningunaDescripcion')"
                />
              } @else {
                <!--
                  Siete columnas no caben en un móvil, así que la tabla se
                  desplaza dentro de su caja en vez de desbordar la página.
                -->
                <div class="np-table-scroll">
                  <table npSortable class="np-table np-admin__tabla">
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
                            <a
                              class="np-admin__pareja"
                              [routerLink]="['/superadmin/bodas', boda.weddingId]"
                            >
                              {{ t('publico.pareja', boda.pareja) }}
                            </a>
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
      </main>

      <!--
        El alta es una acción, no una columna fija: ocupaba un tercio de la
        pantalla para algo que se hace de vez en cuando. Al crear la boda el
        modal sigue abierto, porque ahí se enseñan los enlaces de acceso, que
        solo se ven una vez.
      -->
      @if (altaAbierta()) {
        <np-modal [open]="true" [heading]="t('superadmin.alta.titulo')" (closed)="cerrarAlta()">
          <np-alta-boda (altaHecha)="recargar()" />
        </np-modal>
      }

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
      flex-wrap: wrap;
      gap: var(--np-space-3) var(--np-space-4);
      padding: var(--np-space-4) var(--np-space-5);
      background: var(--np-surface-surface);
      border-block-end: 1px solid var(--np-surface-border);
    }
    .np-admin__cabecera-acciones {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--np-space-3);
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
      padding: var(--np-space-5);
    }
    .np-admin__filtros {
      display: flex;
      flex-wrap: wrap;
      align-items: end;
      gap: var(--np-space-3);
      margin-block-end: var(--np-space-4);
    }
    .np-admin__filtros label {
      display: grid;
      gap: var(--np-space-1);
      font-size: var(--np-text-sm);
    }
    .np-admin__buscar {
      flex: 1 1 14rem;
    }
    /* Los desplegables no se ajustan a la opción elegida: si lo hicieran, cambiar
       de «Todas» a «Pendiente de autorizar» movería todo lo que tienen al lado. */
    .np-admin__filtros select {
      inline-size: 12rem;
    }
    .np-admin__cuenta {
      display: flex;
      align-items: center;
      gap: var(--np-space-2);
      margin: 0;
      min-block-size: 2.75rem;
      min-inline-size: 11rem;
      font-size: var(--np-text-sm);
      color: var(--np-surface-text-muted);
    }
    .np-admin__pareja {
      font-weight: var(--np-weight-medium);
    }
    /* Columnas de ancho fijo: con el reparto automático, filtrar cambiaba el
       contenido más largo de cada columna y toda la tabla se redistribuía. */
    .np-admin__tabla {
      table-layout: fixed;
      min-inline-size: 60rem;
    }
    .np-admin__tabla td {
      overflow-wrap: anywhere;
    }
    .np-admin__tabla th:nth-child(1) {
      inline-size: 22%;
    }
    .np-admin__tabla th:nth-child(2) {
      inline-size: 14%;
    }
    .np-admin__tabla th:nth-child(3) {
      inline-size: 12%;
    }
    .np-admin__tabla th:nth-child(4),
    .np-admin__tabla th:nth-child(6) {
      inline-size: 9%;
    }
    .np-admin__tabla th:nth-child(5) {
      inline-size: 11%;
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
  `,
})
export class AdminShell {
  private readonly fuente = crearFuenteBodasFirestore();
  private readonly puerta = inject(PUERTA_ALTA);
  private readonly i18n = inject(TranslocoService);

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

  protected readonly completando = signal(false);
  protected readonly avisoCompletar = signal<{
    readonly ok: boolean;
    readonly texto: string;
  } | null>(null);

  /** Boda cuya publicación se rechazó, y por qué. Se pinta bajo sus botones. */
  protected readonly noPublicable = signal<string | null>(null);
  protected readonly motivos = signal<readonly string[]>([]);

  private readonly _todas = signal<readonly BodaEnListado[]>([]);
  protected readonly todas = this._todas.asReadonly();

  protected readonly filtros = signal<FiltrosDeBodas>(SIN_FILTROS);
  protected readonly altaAbierta = signal(false);
  protected readonly estadosFiltro = ['todas', 'draft', 'active', 'archived'] as const;
  protected readonly momentosFiltro = ['todas', 'proximas', 'pasadas', 'sin-fecha'] as const;
  protected readonly hayFiltros = hayFiltros;

  protected readonly bodas = computed(() => {
    const porDefecto = [...filtrarBodas(this._todas(), this.filtros(), new Date())].sort(
      ordenPorDefecto,
    );
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
  protected readonly incidencias = computed(() => conIncidencias(this._todas()));

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

  protected cambiarFiltro<K extends keyof FiltrosDeBodas>(
    campo: K,
    valor: FiltrosDeBodas[K],
  ): void {
    this.filtros.update((f) => ({ ...f, [campo]: valor }));
  }

  protected limpiar(): void {
    this.filtros.set(SIN_FILTROS);
  }

  protected abrirAlta(): void {
    this.altaAbierta.set(true);
  }

  protected cerrarAlta(): void {
    this.altaAbierta.set(false);
  }

  protected async recargar(): Promise<void> {
    this.carga.set('cargando');
    try {
      this._todas.set(await this.fuente.listar());
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

  /** Añade a las bodas existentes los módulos nuevos. Se puede repetir sin miedo. */
  protected async completarBodas(): Promise<void> {
    this.completando.set(true);
    this.avisoCompletar.set(null);
    const resultado = await this.puerta.completarBodas();
    this.completando.set(false);

    if (!resultado.ok) {
      this.avisoCompletar.set({ ok: false, texto: resultado.mensaje });
      return;
    }
    const texto =
      resultado.actualizadas === 0
        ? this.i18n.translate('superadmin.completar.alDia', { n: resultado.revisadas })
        : this.i18n.translate('superadmin.completar.hecho', {
            n: resultado.actualizadas,
            modulos: resultado.modulosAnadidos,
            secciones: resultado.seccionesAnadidas,
          });
    this.avisoCompletar.set({ ok: true, texto });
    if (resultado.actualizadas > 0) await this.recargar();
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
