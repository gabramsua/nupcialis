import { CdkDrag, CdkDropList, CdkDropListGroup, type CdkDragDrop } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';

import { NpAlert } from '../../../design-system/components/alert/alert';
import { NpButton } from '../../../design-system/components/button/button';
import { NpEmptyState } from '../../../design-system/components/empty-state/empty-state';
import { NpModal } from '../../../design-system/components/modal/modal';
import { NpIcon } from '../../../design-system/icons/icon';
import type { FalloMesas } from '../../../core/mesas/mesas-gateway';
import {
  FORMAS,
  MAX_NOMBRE_MESA,
  TOPES_INICIALES,
  cabida,
  nombreDeMesa,
  type FormaMesa,
  type InvitadoSentado,
  type Mesa,
} from './mesas';
import { BodaStore } from '../boda.store';
import { descargarXlsx } from '../invitados/exportar-xlsx';
import { hojasDeMesas, nombreDelFicheroDeMesas } from './exportar-mesas';
import { MesasStore } from './mesas.store';
import { NpInput } from '../../../design-system/components/field/input';

function sinAcentos(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/** Lo que hay que saber para preguntar por los acompañantes de alguien. */
interface CasoDeAcompanantes {
  readonly titular: InvitadoSentado;
  readonly mesa: Mesa;
  readonly acompanantes: readonly InvitadoSentado[];
  readonly quienes: string;
  readonly nombreMesa: string;
  readonly caben: boolean;
  readonly libres: number;
  readonly nuevoMaximo: number;
}

/**
 * El reparto de mesas (§8.4).
 *
 * **Dos formas de sentar a alguien, y las dos hacen falta:**
 *
 * 1. **Arrastrar** la ficha hasta la mesa. Es lo rápido en un portátil, que es
 *    donde se hace el grueso del reparto un martes por la noche.
 * 2. **Tocar la ficha y tocar la mesa.** Es lo fiable en un móvil, donde
 *    arrastrar a través de una lista que hace scroll es una pelea. El panel se
 *    diseña primero para móvil, así que esta no es la alternativa: es la de
 *    verdad, y el arrastre es el atajo.
 *
 * Y **avisos, no bloqueos**: una mesa pasada de gente se marca y se deja. El
 * día de la boda se añade una silla; un producto que lo impidiera obligaría a
 * la pareja a subir el máximo a mentiras para poder seguir.
 */
@Component({
  selector: 'np-panel-mesas',
  imports: [
    ReactiveFormsModule,
    TranslocoDirective,
    NpAlert,
    NpButton,
    NpEmptyState,
    NpModal,
    NpIcon,
    CdkDrag,
    CdkDropList,
    CdkDropListGroup,
    NpInput,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <section class="ms">
        <header class="ms__intro">
          <div>
            <h2>{{ t('panel.mesas.titulo') }}</h2>
            <p>{{ t('panel.mesas.ayuda') }}</p>
          </div>
          <div class="ms__acciones">
            <!--
              La hoja para el catering se monta aquí mismo con lo que ya está
              cargado y se descarga: no sale por el servidor y la librería se
              carga al pulsar, no al abrir la pantalla.
            -->
            <button
              npButton
              variant="secondary"
              type="button"
              [loading]="exportando()"
              [disabled]="store.mesas().length === 0"
              (click)="exportar()"
            >
              <np-icon name="download-simple" />
              {{ t('panel.mesas.exportar') }}
            </button>
            <button npButton type="button" (click)="nuevaMesa()">
              <np-icon name="plus" />
              {{ t('panel.mesas.anadir') }}
            </button>
          </div>
        </header>

        @if (falloAlExportar()) {
          <np-alert status="declined" [heading]="t('panel.mesas.error')">
            <p>{{ t('panel.mesas.fallo.exportar') }}</p>
          </np-alert>
        }

        @if (store.fallo(); as fallo) {
          <np-alert status="declined" [heading]="t('panel.mesas.error')">
            <p>{{ textoDelFallo(fallo, t) }}</p>
          </np-alert>
        }

        @switch (store.estado()) {
          @case ('cargando') {
            <np-empty-state icon="fork-knife" [title]="t('panel.mesas.cargando')" />
          }
          @default {
            <p class="ms__resumen">
              {{
                t('panel.mesas.resumen', {
                  sentados: store.resumen().sentados,
                  porSentar: store.resumen().porSentar,
                  sillas: store.resumen().sillas,
                })
              }}
            </p>

            <!--
              Los que faltan por sentar, arriba y siempre a la vista: es la
              lista que la pareja va vaciando, y el trabajo se acaba cuando se
              queda vacía.
            -->
            <div class="ms__leyenda" role="note">
              <span class="ms__marca ms__marca--confirmed">
                <np-icon name="check-circle" />
                {{ t('panel.mesas.leyenda.confirmed') }}
              </span>
              <span class="ms__marca ms__marca--pending">
                <np-icon name="clock" />
                {{ t('panel.mesas.leyenda.pending') }}
              </span>
              <span class="ms__marca ms__marca--declined">
                <np-icon name="x-circle" />
                {{ t('panel.mesas.leyenda.declined') }}
              </span>
            </div>

            <!--
              Dos columnas, como un correo: los que faltan a la izquierda, con
              su propio scroll y sus filtros, y las mesas a la derecha. Con
              trescientos invitados una lista a lo ancho de la página se
              come la pantalla; aquí ocupa un lateral y se busca.
            -->
            <div cdkDropListGroup class="ms__reparto">
              <section
                class="ms__pendientes"
                cdkDropList
                [cdkDropListData]="null"
                [cdkDropListSortingDisabled]="true"
                (cdkDropListDropped)="soltado($event)"
              >
                <h3>{{ t('panel.mesas.porSentar', { n: store.porSentar().length }) }}</h3>

                <div class="ms__filtros" role="search">
                  <input
                    npInput
                    type="search"
                    autocomplete="off"
                    [attr.aria-label]="t('panel.mesas.filtro.texto')"
                    [placeholder]="t('panel.mesas.filtro.texto')"
                    [value]="filtroTexto()"
                    (input)="filtroTexto.set($any($event.target).value)"
                  />
                  @if (store.grupos().length > 0) {
                    <select
                      npInput
                      [attr.aria-label]="t('panel.mesas.filtro.grupo')"
                      [value]="filtroGrupo()"
                      (change)="filtroGrupo.set($any($event.target).value)"
                    >
                      <option value="">{{ t('panel.mesas.filtro.todosLosGrupos') }}</option>
                      @for (g of store.grupos(); track g.id) {
                        <option [value]="g.id">{{ g.name }}</option>
                      }
                    </select>
                  }
                  <label class="ms__check">
                    <input
                      type="checkbox"
                      [checked]="ocultarNoVienen()"
                      (change)="ocultarNoVienen.set($any($event.target).checked)"
                    />
                    {{ t('panel.mesas.filtro.ocultarNoVienen') }}
                  </label>
                  @if (hayFiltro()) {
                    <p class="ms__filtroEstado" role="status">
                      {{
                        t('panel.mesas.filtro.resultado', {
                          n: porSentarVisibles().length,
                          total: store.porSentar().length,
                        })
                      }}
                      <button
                        npButton
                        size="sm"
                        variant="ghost"
                        type="button"
                        (click)="limpiarFiltros()"
                      >
                        {{ t('panel.mesas.filtro.limpiar') }}
                      </button>
                    </p>
                  }
                </div>

                @if (store.porSentar().length === 0) {
                  <p class="ms__hecho">
                    <np-icon name="check-circle" />
                    {{ t('panel.mesas.todosSentados') }}
                  </p>
                } @else if (porSentarVisibles().length === 0) {
                  <p class="ms__vacio">{{ t('panel.mesas.filtro.nadie') }}</p>
                } @else {
                  <ul class="ms__fichas">
                    @for (invitado of porSentarVisibles(); track invitado.id) {
                      <li
                        cdkDrag
                        cdkDragPreviewContainer="parent"
                        [cdkDragData]="invitado.id"
                        [cdkDragStartDelay]="retardo"
                        (cdkDragStarted)="elegido.set(invitado.id)"
                        class="ms__item"
                      >
                        <div
                          class="ms__ficha ms__ficha--{{ invitado.rsvpStatus }}"
                          [class.ms__ficha--elegida]="elegido() === invitado.id"
                          [class.ms__ficha--huerfano]="huerfano(invitado)"
                        >
                          <button
                            type="button"
                            class="ms__fichaBtn"
                            [attr.aria-pressed]="elegido() === invitado.id"
                            (click)="alternarElegido(invitado.id)"
                          >
                            <np-icon [name]="icono(invitado)" />
                            <span class="ms__fichaTexto">
                              {{ invitado.fullName }}
                              @if (deQuien(invitado); as titular) {
                                <small>
                                  {{ t('panel.mesas.acompananteDe', { nombre: titular }) }}
                                </small>
                              }
                            </span>
                            <span class="ms__sr">{{
                              t('panel.mesas.leyenda.' + invitado.rsvpStatus)
                            }}</span>
                          </button>
                        </div>
                      </li>
                    }
                  </ul>
                }
              </section>

              @if (store.mesas().length === 0) {
                <np-empty-state
                  icon="fork-knife"
                  [title]="t('panel.mesas.ninguna')"
                  [description]="t('panel.mesas.ningunaDescripcion')"
                />
              } @else {
                <!--
                El lienzo es un esquema de agrupación, no el plano de ninguna
                finca (§8.4): sin paredes, sin escenario y sin escala.
              -->
                <ul class="ms__lienzo">
                  @for (mesa of store.mesas(); track mesa.id; let i = $index) {
                    <li
                      class="ms__mesa"
                      cdkDropList
                      [cdkDropListData]="mesa.id"
                      [cdkDropListSortingDisabled]="true"
                      (cdkDropListDropped)="soltado($event)"
                      [attr.data-mesa]="mesa.id"
                      [class.ms__mesa--destino]="elegido() !== null"
                      [class.ms__mesa--pasada]="pasada(mesa)"
                      [class.ms__mesa--corta]="corta(mesa)"
                    >
                      <button type="button" class="ms__soltar" (click)="sentarAqui(mesa)">
                        <span class="ms__nombre">
                          <np-icon name="table" />
                          {{ nombre(mesa, i + 1) }}
                          <!-- La forma, escrita: decide los topes de partida y
                             no hay icono que la diga sin ambigüedad. -->
                          <small>{{ t('panel.mesas.forma.' + mesa.shape) }}</small>
                        </span>
                        <span class="ms__cuenta">
                          {{
                            t('panel.mesas.ocupacion', {
                              cuantos: ocupan(mesa),
                              max: mesa.maxSeats,
                            })
                          }}
                        </span>
                      </button>

                      @if (pasada(mesa)) {
                        <p class="ms__estado">
                          <np-icon name="warning" />
                          {{ t('panel.mesas.pasada', { n: ocupan(mesa) - mesa.maxSeats }) }}
                        </p>
                      } @else if (corta(mesa)) {
                        <p class="ms__estado">
                          <np-icon name="info" />
                          {{ t('panel.mesas.corta', { n: mesa.minSeats - ocupan(mesa) }) }}
                        </p>
                      }

                      <ul class="ms__fichas">
                        @for (invitado of sentados(mesa); track invitado.id) {
                          <li
                            cdkDrag
                            cdkDragPreviewContainer="parent"
                            [cdkDragData]="invitado.id"
                            [cdkDragStartDelay]="retardo"
                            (cdkDragStarted)="elegido.set(invitado.id)"
                            class="ms__item"
                          >
                            <div
                              class="ms__ficha ms__ficha--{{ invitado.rsvpStatus }}"
                              [class.ms__ficha--elegida]="elegido() === invitado.id"
                              [class.ms__ficha--separado]="separado(invitado)"
                            >
                              <button
                                type="button"
                                class="ms__fichaBtn"
                                [attr.aria-pressed]="elegido() === invitado.id"
                                (click)="alternarElegido(invitado.id)"
                              >
                                <np-icon [name]="icono(invitado)" />
                                <span class="ms__fichaTexto">
                                  {{ invitado.fullName }}
                                  @if (deQuien(invitado); as titular) {
                                    <small>
                                      {{ t('panel.mesas.acompananteDe', { nombre: titular }) }}
                                    </small>
                                  }
                                </span>
                                <span class="ms__sr">
                                  {{ t('panel.mesas.leyenda.' + invitado.rsvpStatus) }}
                                </span>
                              </button>
                              <!-- Quitar de la mesa sin tener que elegir y pulsar otra
                                 cosa: vuelve a «por sentar». -->
                              <button
                                type="button"
                                class="ms__quitar"
                                [attr.aria-label]="
                                  t('panel.mesas.quitar', { nombre: invitado.fullName })
                                "
                                (click)="quitar(invitado)"
                              >
                                <np-icon name="x" />
                              </button>
                            </div>
                          </li>
                        }
                      </ul>

                      <div class="ms__acciones">
                        <button
                          npButton
                          size="sm"
                          variant="ghost"
                          type="button"
                          (click)="editarMesa(mesa)"
                        >
                          <np-icon name="pencil-simple" />
                          {{ t('common.edit') }}
                        </button>
                        @if (sentados(mesa).length > 0) {
                          <button
                            npButton
                            size="sm"
                            variant="ghost"
                            type="button"
                            (click)="vaciar(mesa)"
                          >
                            <np-icon name="x" />
                            {{ t('panel.mesas.vaciar') }}
                          </button>
                        }
                        <button
                          npButton
                          size="sm"
                          variant="ghost"
                          type="button"
                          (click)="borrando.set(mesa)"
                        >
                          <np-icon name="trash" />
                          {{ t('common.delete') }}
                        </button>
                      </div>
                    </li>
                  }
                </ul>
              }
            </div>

            @if (elegido(); as quien) {
              <p class="ms__elegido" role="status">
                <np-icon name="user" />
                {{ t('panel.mesas.elegido', { nombre: nombreDe(quien) }) }}
                @if (mesaDe(quien) !== null) {
                  <button npButton size="sm" variant="ghost" type="button" (click)="levantar()">
                    {{ t('panel.mesas.levantar') }}
                  </button>
                }
              </p>
            }
          }
        }

        <!--
          Sentar a alguien que viene acompañado: se pregunta, no se decide
          sola. Lo normal es que la pareja quiera sentarlos juntos —nadie trae
          a su pareja para dejarla en otra mesa— pero el caso contrario existe
          y deshacerlo a mano es peor que confirmarlo.
        -->
        @if (conAcompanantes(); as caso) {
          <np-modal
            [open]="true"
            [heading]="t('panel.mesas.acompanantes.titulo')"
            (closed)="conAcompanantes.set(null)"
          >
            <p>
              {{
                t('panel.mesas.acompanantes.pregunta', {
                  nombre: caso.titular.fullName,
                  cuantos: caso.acompanantes.length,
                  quienes: caso.quienes,
                  mesa: caso.nombreMesa,
                })
              }}
            </p>

            @if (!caso.caben) {
              <np-alert status="attention" [heading]="t('panel.mesas.acompanantes.noCaben')">
                <p>
                  {{
                    t('panel.mesas.acompanantes.noCabenAyuda', {
                      libres: caso.libres,
                      max: caso.mesa.maxSeats,
                      nuevoMax: caso.nuevoMaximo,
                    })
                  }}
                </p>
              </np-alert>
            }

            <div np-modal-actions>
              <button npButton variant="ghost" type="button" (click)="sentarSoloAlTitular()">
                {{ t('panel.mesas.acompanantes.soloEl') }}
              </button>
              @if (caso.caben) {
                <button npButton type="button" (click)="sentarConAcompanantes(false)">
                  {{ t('panel.mesas.acompanantes.todos') }}
                </button>
              } @else {
                <button npButton type="button" (click)="sentarConAcompanantes(true)">
                  {{ t('panel.mesas.acompanantes.ampliar', { nuevoMax: caso.nuevoMaximo }) }}
                </button>
              }
            </div>
          </np-modal>
        }

        @if (editando(); as cual) {
          <np-modal
            [open]="true"
            [heading]="cual === 'nueva' ? t('panel.mesas.nueva') : t('panel.mesas.editar')"
            (closed)="editando.set(null)"
          >
            <form class="ms__form" [formGroup]="formulario" (submit)="enviar($event)">
              <label>
                {{ t('panel.mesas.campo.nombre') }}
                <input npInput formControlName="name" [attr.maxlength]="maximoNombre" />
                <small>{{ t('panel.mesas.campo.nombreAyuda') }}</small>
              </label>

              <label>
                {{ t('panel.mesas.campo.forma') }}
                <select npInput formControlName="shape" (change)="cambiarForma($event)">
                  @for (forma of formas; track forma) {
                    <option [value]="forma">{{ t('panel.mesas.forma.' + forma) }}</option>
                  }
                </select>
              </label>

              <div class="ms__pareja">
                <label>
                  {{ t('panel.mesas.campo.minimo') }}
                  <input npInput formControlName="minSeats" type="number" min="0" step="1" />
                </label>
                <label>
                  {{ t('panel.mesas.campo.maximo') }}
                  <input npInput formControlName="maxSeats" type="number" min="0" step="1" />
                </label>
              </div>
              <small>{{ t('panel.mesas.campo.topesAyuda') }}</small>
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
                <np-icon name="check" />
                {{ t('common.save') }}
              </button>
            </div>
          </np-modal>
        }

        @if (borrando(); as cual) {
          <np-modal [open]="true" [heading]="t('common.delete')" (closed)="borrando.set(null)">
            <p>{{ t('panel.mesas.confirmarBorrado', { nombre: nombre(cual, 0) }) }}</p>
            @if (sentados(cual).length > 0) {
              <p>{{ t('panel.mesas.borrarConGente', { n: sentados(cual).length }) }}</p>
            }

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
    .ms__intro {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-3);
      margin-block-end: var(--np-space-4);
    }
    .ms__intro h2 {
      margin: 0;
      font-size: var(--np-text-xl);
      font-weight: var(--np-weight-semibold);
    }
    .ms__intro p,
    .ms__resumen {
      margin: var(--np-space-1) 0 0;
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-sm);
    }
    @media (min-width: 48rem) {
      .ms__intro {
        flex-direction: row;
        align-items: flex-start;
        justify-content: space-between;
      }
    }
    .ms__acciones {
      display: flex;
      flex-wrap: wrap;
      gap: var(--np-space-2);
    }
    .ms__avisos {
      margin: var(--np-space-1) 0 0;
      padding-inline-start: 1.1em;
    }
    .ms__reparto {
      display: grid;
      gap: var(--np-space-3);
      grid-template-columns: minmax(0, 1fr);
      margin-block-start: var(--np-space-3);
    }
    .ms__reparto > .ms__lienzo {
      margin: 0;
    }
    .ms__filtros {
      display: grid;
      gap: var(--np-space-2);
      margin-block-end: var(--np-space-2);
    }
    .ms__check {
      display: flex;
      align-items: center;
      gap: var(--np-space-2);
      font-size: var(--np-text-sm);
    }
    .ms__filtroEstado {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--np-space-1);
      margin: 0;
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-sm);
    }
    .ms__vacio {
      margin: 0;
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-sm);
    }
    /* En el móvil la lista va arriba con altura propia y scroll; en pantalla
       ancha pasa a ser un lateral pegado que se desplaza por su cuenta. */
    .ms__pendientes {
      display: flex;
      flex-direction: column;
      min-block-size: 0;
      max-block-size: 60dvh;
      overflow-y: auto;
      margin-block: 0;
    }
    .ms__pendientes .ms__fichas {
      flex-direction: column;
      flex-wrap: nowrap;
    }
    .ms__pendientes .ms__ficha {
      inline-size: 100%;
    }
    @media (min-width: 64rem) {
      .ms__reparto {
        grid-template-columns: 19rem minmax(0, 1fr);
        align-items: start;
      }
      .ms__pendientes {
        position: sticky;
        inset-block-start: var(--np-space-3);
        max-block-size: calc(100dvh - 7rem);
      }
    }
    .ms__pendientes {
      margin-block: 0;
      padding: var(--np-space-3);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-md);
      background: var(--np-surface-canvas);
    }
    .ms__pendientes h3 {
      margin: 0 0 var(--np-space-2);
      font-size: var(--np-text-sm);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .ms__hecho {
      display: flex;
      align-items: center;
      gap: var(--np-space-2);
      margin: 0;
      color: var(--np-confirmed-fg);
    }
    .ms__fichas {
      display: flex;
      flex-wrap: wrap;
      gap: var(--np-space-1);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .ms__leyenda {
      display: flex;
      flex-wrap: wrap;
      gap: var(--np-space-3);
      font-size: var(--np-text-sm);
    }
    .ms__marca {
      display: inline-flex;
      align-items: center;
      gap: var(--np-space-1);
    }
    .ms__marca--confirmed {
      color: var(--np-confirmed-fg);
    }
    .ms__marca--pending {
      color: var(--np-pending-fg);
    }
    .ms__marca--declined {
      color: var(--np-declined-fg);
    }
    .ms__sr {
      position: absolute;
      inline-size: 1px;
      block-size: 1px;
      overflow: hidden;
      clip-path: inset(50%);
    }
    .ms__item {
      list-style: none;
    }
    /* La ficha: el color dice si ha confirmado, y siempre va con icono y texto
       (el color nunca viaja solo). Se arrastra con el ratón o con el dedo
       (manteniendo pulsado un momento) y también se toca para elegirla. */
    .ms__ficha {
      display: flex;
      align-items: center;
      min-block-size: var(--np-tap-target);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-sm);
      background: var(--np-surface-surface);
      color: inherit;
      font-size: var(--np-text-sm);
      cursor: grab;
    }
    .ms__ficha--confirmed {
      border-color: var(--np-confirmed-border);
      background: var(--np-confirmed-bg);
      color: var(--np-confirmed-fg);
    }
    .ms__ficha--pending {
      border-color: var(--np-pending-border);
      background: var(--np-pending-bg);
      color: var(--np-pending-fg);
    }
    .ms__ficha--declined {
      border-color: var(--np-declined-border);
      background: var(--np-declined-bg);
      color: var(--np-declined-fg);
    }
    .ms__fichaBtn {
      display: inline-flex;
      align-items: center;
      gap: var(--np-space-1);
      min-block-size: var(--np-tap-target);
      padding: var(--np-space-1) var(--np-space-2);
      border: 0;
      background: none;
      color: inherit;
      font: inherit;
      text-align: start;
      cursor: inherit;
    }
    .ms__fichaTexto {
      display: flex;
      flex-direction: column;
    }
    .ms__fichaTexto small {
      font-size: var(--np-text-xs);
      opacity: 0.85;
    }
    .ms__quitar {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-block-size: var(--np-tap-target);
      min-inline-size: var(--np-tap-target);
      border: 0;
      border-inline-start: 1px solid currentColor;
      background: none;
      color: inherit;
      cursor: pointer;
      opacity: 0.8;
    }
    .ms__quitar:hover {
      opacity: 1;
    }
    .ms__ficha--elegida {
      outline: 2px solid var(--np-surface-text);
      outline-offset: 1px;
      font-weight: var(--np-weight-medium);
    }
    /* El acompañante lejos de quien lo apuntó: marcado en su ficha. */
    .ms__ficha--separado {
      border-style: dashed;
      border-width: 2px;
    }
    /* Un acompañante cuyo titular ya tiene mesa y él no: es el que se olvida. */
    .ms__ficha--huerfano {
      border-style: dashed;
      border-width: 2px;
    }
    /* Arrastre del CDK: el original se queda como hueco y la copia que sigue
       al puntero lleva sombra. La vista previa se queda dentro del componente
       (cdkDragPreviewContainer="parent") para que estos estilos le lleguen. */
    .cdk-drag-placeholder {
      opacity: 0.35;
    }
    .cdk-drag-preview {
      box-shadow: var(--np-shadow-md, 0 4px 12px rgb(0 0 0 / 0.2));
      border-radius: var(--np-radius-sm);
      z-index: 1000;
    }
    .cdk-drag-animating {
      transition: transform 200ms ease;
    }
    .ms__mesa.cdk-drop-list-dragging {
      outline: 2px dashed var(--np-surface-text);
    }
    .ms__pendientes.cdk-drop-list-dragging {
      outline: 2px dashed var(--np-surface-text);
    }
    .ms__lienzo {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
      gap: var(--np-space-3);
      margin: var(--np-space-3) 0 0;
      padding: 0;
      list-style: none;
    }
    .ms__mesa {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-2);
      padding: var(--np-space-3);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-md);
      background: var(--np-surface-surface);
    }
    /* Mientras hay alguien elegido, las mesas se ven como lo que son en ese
       momento: sitios donde soltarlo. */
    .ms__mesa--destino {
      border-style: dashed;
      border-color: var(--np-surface-text);
    }
    .ms__mesa--pasada {
      border-color: var(--np-attention-border);
    }
    .ms__soltar {
      display: flex;
      flex-wrap: wrap;
      gap: var(--np-space-2);
      align-items: baseline;
      justify-content: space-between;
      inline-size: 100%;
      min-block-size: var(--np-tap-target);
      padding: 0;
      border: 0;
      background: none;
      color: inherit;
      font: inherit;
      text-align: start;
      cursor: pointer;
    }
    .ms__nombre {
      display: inline-flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: var(--np-space-1) var(--np-space-2);
      font-weight: var(--np-weight-medium);
    }
    .ms__nombre small {
      color: var(--np-surface-text-muted);
      font-weight: var(--np-weight-normal);
    }
    .ms__cuenta {
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-sm);
      font-variant-numeric: tabular-nums;
    }
    .ms__estado {
      display: flex;
      align-items: center;
      gap: var(--np-space-1);
      margin: 0;
      color: var(--np-attention-fg);
      font-size: var(--np-text-sm);
    }
    .ms__acciones {
      display: flex;
      flex-wrap: wrap;
      gap: var(--np-space-1);
    }
    /* La barra de «tienes a alguien cogido»: pegada abajo, porque en un móvil
       la mesa a la que vas puede estar a dos pantallas de scroll. */
    .ms__elegido {
      position: sticky;
      inset-block-end: 0;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--np-space-2);
      margin: var(--np-space-3) 0 0;
      padding: var(--np-space-2) var(--np-space-3);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-md);
      background: var(--np-surface-raised);
    }
    .ms__form {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-3);
    }
    .ms__form label {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-1);
      font-size: var(--np-text-sm);
    }
    .ms__pareja {
      display: flex;
      flex-wrap: wrap;
      gap: var(--np-space-3);
    }
    .ms__pareja label {
      flex: 1;
      min-inline-size: 7rem;
    }
    .ms__form small {
      color: var(--np-surface-text-muted);
    }
  `,
})
export class PanelMesas {
  protected readonly store = inject(MesasStore);
  private readonly i18n = inject(TranslocoService);
  // Opcional: solo da el slug para el nombre del fichero.
  private readonly boda = inject(BodaStore, { optional: true });
  protected readonly exportando = signal(false);
  protected readonly falloAlExportar = signal(false);
  private readonly fb = inject(FormBuilder);

  protected readonly formas = FORMAS;

  protected readonly filtroTexto = signal('');
  protected readonly filtroGrupo = signal('');
  protected readonly ocultarNoVienen = signal(false);

  protected readonly hayFiltro = computed(
    () => this.filtroTexto().trim() !== '' || this.filtroGrupo() !== '' || this.ocultarNoVienen(),
  );

  /**
   * La lista de «faltan por sentar» tras los filtros. El texto busca en nombre
   * y apellidos a la vez y sin mirar acentos: «garcia» encuentra «María García».
   * Un acompañante también sale si se busca a su titular.
   */
  protected readonly porSentarVisibles = computed(() => {
    const texto = sinAcentos(this.filtroTexto());
    const grupo = this.filtroGrupo();
    const ocultar = this.ocultarNoVienen();
    const sentados = this.store.comoSentados();
    const porId = new Map(sentados.map((i) => [i.id, i]));

    return this.store.porSentar().filter((i) => {
      if (ocultar && i.rsvpStatus === 'declined') return false;
      if (grupo !== '' && !i.groupIds.includes(grupo)) return false;
      if (texto === '') return true;
      const titular = i.invitedById ? (porId.get(i.invitedById)?.fullName ?? '') : '';
      return sinAcentos(`${i.fullName} ${titular}`).includes(texto);
    });
  });

  protected limpiarFiltros(): void {
    this.filtroTexto.set('');
    this.filtroGrupo.set('');
    this.ocultarNoVienen.set(false);
  }

  protected readonly maximoNombre = MAX_NOMBRE_MESA;

  /** A quién tiene la pareja «en la mano»: por toque o por arrastre. */
  protected readonly elegido = signal<string | null>(null);

  /** El caso abierto de «¿sentamos también a sus acompañantes?». */
  protected readonly conAcompanantes = signal<CasoDeAcompanantes | null>(null);

  protected readonly editando = signal<Mesa | 'nueva' | null>(null);
  protected readonly borrando = signal<Mesa | null>(null);
  protected readonly guardando = signal(false);
  protected readonly borrandoYa = signal(false);

  protected readonly formulario = this.fb.nonNullable.group({
    name: [''],
    shape: ['round' as FormaMesa, Validators.required],
    minSeats: [TOPES_INICIALES.round.min],
    maxSeats: [TOPES_INICIALES.round.max],
  });

  constructor() {
    void this.store.cargar();
  }

  protected nombre(mesa: Mesa, n: number): string {
    return nombreDeMesa(mesa, n);
  }

  protected sentados(mesa: Mesa): readonly InvitadoSentado[] {
    return this.store.sentadosEnMesa(mesa.id);
  }

  /** Cuántos ocupan silla: todos menos los que han dicho que no vienen. */
  protected ocupan(mesa: Mesa): number {
    return this.sentados(mesa).filter((i) => i.rsvpStatus !== 'declined').length;
  }

  protected pasada(mesa: Mesa): boolean {
    return this.ocupan(mesa) > mesa.maxSeats;
  }

  protected corta(mesa: Mesa): boolean {
    const cuantos = this.ocupan(mesa);
    return cuantos > 0 && cuantos < mesa.minSeats;
  }

  /** En móvil, mantener pulsado un momento para arrastrar: así el scroll sigue funcionando. */
  protected readonly retardo = { touch: 250, mouse: 0 };

  protected icono(invitado: InvitadoSentado): 'check-circle' | 'clock' | 'x-circle' {
    if (invitado.rsvpStatus === 'confirmed') return 'check-circle';
    return invitado.rsvpStatus === 'declined' ? 'x-circle' : 'clock';
  }

  /** El nombre de su titular, si es acompañante. */
  protected deQuien(invitado: InvitadoSentado): string | null {
    if (!invitado.isCompanion || invitado.invitedById === null) return null;
    return this.nombreDe(invitado.invitedById) || null;
  }

  /**
   * Un acompañante sin mesa cuyo titular **sí** la tiene: el que se queda
   * olvidado al sentar. Se marca en su ficha; no hay banner (D-47).
   */
  protected huerfano(invitado: InvitadoSentado): boolean {
    if (!invitado.isCompanion || invitado.invitedById === null || invitado.tableId !== null) {
      return false;
    }
    return this.mesaDe(invitado.invitedById) !== null;
  }

  protected async quitar(invitado: InvitadoSentado): Promise<void> {
    if (this.elegido() === invitado.id) this.elegido.set(null);
    await this.store.sentar([invitado.id], null);
  }

  /**
   * Soltar una ficha en una lista: la mesa de destino la dice la propia lista
   * (`null` es «por sentar»). Soltarla donde ya estaba no hace nada.
   */
  protected async soltado(
    // Los datos de cada lista son un id de mesa o `null` (por sentar); el tipo
    // de CDK no admite esa unión, así que se estrecha dentro.
    evento: CdkDragDrop<any, any, any>, // eslint-disable-line @typescript-eslint/no-explicit-any
  ): Promise<void> {
    this.elegido.set(null);
    if (evento.previousContainer === evento.container) return;

    const quien = evento.item.data as string;
    const destino = (evento.container.data as string | null) ?? null;

    if (destino === null) {
      await this.store.sentar([quien], null);
      return;
    }

    const mesa = this.store.mesas().find((otra) => otra.id === destino);
    if (mesa) await this.sentarEn(quien, mesa);
  }

  protected separado(invitado: InvitadoSentado): boolean {
    return this.store
      .avisos()
      .some((aviso) => aviso.tipo === 'separado' && aviso.invitadoId === invitado.id);
  }

  protected nombreDe(guestId: string): string {
    return this.store.comoSentados().find((i) => i.id === guestId)?.fullName ?? '';
  }

  protected mesaDe(guestId: string): string | null {
    return this.store.comoSentados().find((i) => i.id === guestId)?.tableId ?? null;
  }

  protected alternarElegido(guestId: string): void {
    this.elegido.update((previo) => (previo === guestId ? null : guestId));
  }

  /** Tocar la mesa con alguien en la mano lo sienta ahí. */
  protected async sentarAqui(mesa: Mesa): Promise<void> {
    const quien = this.elegido();
    if (!quien) return;

    this.elegido.set(null);
    await this.sentarEn(quien, mesa);
  }

  /**
   * Sentar a uno, preguntando por sus acompañantes si los trae.
   *
   * El titular se sienta **ya**, sin esperar la respuesta: es lo que la pareja
   * ha pedido con el gesto, y dejarlo en el aire mientras hay un modal abierto
   * se siente como que no ha funcionado.
   */
  private async sentarEn(guestId: string, mesa: Mesa): Promise<void> {
    await this.store.sentar([guestId], mesa.id);

    const invitados = this.store.comoSentados();
    const titular = invitados.find((invitado) => invitado.id === guestId);
    // Los acompañantes que aún no están en esta mesa y no han dicho que no
    // vienen (los pendientes cuentan: la pareja los gestiona ella).
    const acompanantes = invitados.filter(
      (invitado) =>
        invitado.isCompanion &&
        invitado.invitedById === guestId &&
        invitado.rsvpStatus !== 'declined' &&
        invitado.tableId !== mesa.id,
    );
    if (!titular || acompanantes.length === 0) return;

    const sitio = cabida(mesa, acompanantes.length, invitados);

    this.conAcompanantes.set({
      titular,
      mesa,
      acompanantes,
      quienes: acompanantes.map((invitado) => invitado.fullName).join(', '),
      nombreMesa: nombreDeMesa(mesa, this.store.mesas().indexOf(mesa) + 1),
      caben: sitio.cabenTodos,
      libres: sitio.libres,
      // Lo justo para que quepan, no un número redondo inventado.
      nuevoMaximo: sitio.ocupados + acompanantes.length,
    });
  }

  protected sentarSoloAlTitular(): void {
    this.conAcompanantes.set(null);
  }

  /** Sienta a los acompañantes, ampliando la mesa si hace falta. */
  protected async sentarConAcompanantes(ampliando: boolean): Promise<void> {
    const caso = this.conAcompanantes();
    this.conAcompanantes.set(null);
    if (!caso) return;

    if (ampliando) {
      await this.store.guardarMesa({
        id: caso.mesa.id,
        name: caso.mesa.name,
        shape: caso.mesa.shape,
        minSeats: caso.mesa.minSeats,
        maxSeats: caso.nuevoMaximo,
        order: caso.mesa.order,
        notes: caso.mesa.notes,
      });
    }

    await this.store.sentar(
      caso.acompanantes.map((invitado) => invitado.id),
      caso.mesa.id,
    );
  }

  protected async levantar(): Promise<void> {
    const quien = this.elegido();
    if (!quien) return;

    this.elegido.set(null);
    await this.store.sentar([quien], null);
  }

  protected async vaciar(mesa: Mesa): Promise<void> {
    await this.store.sentar(
      this.sentados(mesa).map((invitado) => invitado.id),
      null,
    );
  }

  protected nuevaMesa(): void {
    this.formulario.reset({
      name: '',
      shape: 'round',
      minSeats: TOPES_INICIALES.round.min,
      maxSeats: TOPES_INICIALES.round.max,
    });
    this.editando.set('nueva');
  }

  protected editarMesa(mesa: Mesa): void {
    this.formulario.reset({
      name: mesa.name,
      shape: mesa.shape,
      minSeats: mesa.minSeats,
      maxSeats: mesa.maxSeats,
    });
    this.editando.set(mesa);
  }

  /**
   * Cambiar la forma trae sus topes de partida **solo en una mesa nueva**.
   *
   * En una que ya existe no se tocan: la pareja los ajustó a su finca, y
   * pisárselos por cambiar de redonda a rectangular sería deshacerle el
   * trabajo.
   */
  protected cambiarForma(evento: Event): void {
    if (this.editando() !== 'nueva') return;

    const forma = (evento.target as HTMLSelectElement).value as FormaMesa;
    const topes = TOPES_INICIALES[forma] ?? TOPES_INICIALES.round;
    this.formulario.patchValue({ minSeats: topes.min, maxSeats: topes.max });
  }

  protected enviar(evento: Event): void {
    evento.preventDefault();
    void this.guardar();
  }

  protected async guardar(): Promise<void> {
    const cual = this.editando();
    if (!cual || this.formulario.invalid || this.guardando()) return;

    const valores = this.formulario.getRawValue();
    const nueva = cual === 'nueva';
    this.guardando.set(true);

    const resultado = await this.store.guardarMesa({
      id: nueva ? undefined : cual.id,
      name: valores.name.trim(),
      shape: valores.shape,
      minSeats: Number(valores.minSeats) || 0,
      maxSeats: Number(valores.maxSeats) || 0,
      order: nueva ? this.store.mesas().length + 1 : cual.order,
      notes: nueva ? '' : cual.notes,
    });

    this.guardando.set(false);
    if (resultado.ok) this.editando.set(null);
  }

  protected async borrar(): Promise<void> {
    const cual = this.borrando();
    if (!cual || this.borrandoYa()) return;

    this.borrandoYa.set(true);
    const resultado = await this.store.borrarMesa(cual.id);
    this.borrandoYa.set(false);
    if (resultado.ok) this.borrando.set(null);
  }

  /**
   * Monta el `.xlsx` para el catering y lo descarga.
   *
   * Lleva tres hojas —resumen por mesa con los menús contados, quién se sienta
   * dónde y los que aún no tienen sitio— y ni un teléfono ni una nota (§9.4).
   */
  protected async exportar(): Promise<void> {
    if (this.exportando()) return;

    this.exportando.set(true);
    this.falloAlExportar.set(false);

    const hecho = await descargarXlsx(
      hojasDeMesas({
        mesas: this.store.mesas(),
        invitados: this.store.invitados(),
        etiquetas: {
          edad: {
            adult: this.i18n.translate('panel.invitados.edad.adult'),
            child: this.i18n.translate('panel.invitados.edad.child'),
            baby: this.i18n.translate('panel.invitados.edad.baby'),
          },
          forma: {
            round: this.i18n.translate('panel.mesas.forma.round'),
            rect: this.i18n.translate('panel.mesas.forma.rect'),
          },
          estado: {
            bien: this.i18n.translate('panel.mesas.estado.bien'),
            corta: this.i18n.translate('panel.mesas.estado.corta'),
            pasada: this.i18n.translate('panel.mesas.estado.pasada'),
            vacia: this.i18n.translate('panel.mesas.estado.vacia'),
          },
          sinMenu: this.i18n.translate('panel.mesas.sinMenu'),
          total: this.i18n.translate('panel.mesas.total'),
        },
      }),
      nombreDelFicheroDeMesas(this.boda?.boda()?.slug ?? '', new Date()),
    );

    this.exportando.set(false);
    this.falloAlExportar.set(!hecho);
  }

  protected textoDelFallo(fallo: FalloMesas, t: (clave: string) => string): string {
    switch (fallo.tipo) {
      case 'sin-permiso':
      case 'red':
        return t(`panel.mesas.fallo.${fallo.tipo}`);
      default:
        return t('panel.mesas.fallo.desconocido');
    }
  }
}
