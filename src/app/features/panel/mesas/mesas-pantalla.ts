import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslocoDirective } from '@jsverse/transloco';

import { NpAlert } from '../../../design-system/components/alert/alert';
import { NpButton } from '../../../design-system/components/button/button';
import { NpEmptyState } from '../../../design-system/components/empty-state/empty-state';
import { NpModal } from '../../../design-system/components/modal/modal';
import { NpIcon } from '../../../design-system/icons/icon';
import type { FalloMesas } from '../../../core/mesas/mesas-gateway';
import { NpArrastrable, type SoltadoEn } from './arrastrable';
import {
  FORMAS,
  MAX_NOMBRE_MESA,
  TOPES_INICIALES,
  acompanantesDe,
  cabida,
  nombreDeMesa,
  type FormaMesa,
  type InvitadoSentado,
  type Mesa,
} from './mesas';
import { MesasStore } from './mesas.store';

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
    NpArrastrable,
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
          <button npButton type="button" (click)="nuevaMesa()">
            <np-icon name="plus" />
            {{ t('panel.mesas.anadir') }}
          </button>
        </header>

        @if (store.fallo(); as fallo) {
          <np-alert status="declined" [heading]="t('panel.mesas.error')">
            <p>{{ textoDelFallo(fallo, t) }}</p>
          </np-alert>
        }

        @if (textosDeAvisos().length > 0) {
          <np-alert status="attention" [heading]="t('panel.mesas.avisos')">
            <ul class="ms__avisos">
              @for (aviso of textosDeAvisos(); track aviso) {
                <li>{{ aviso }}</li>
              }
            </ul>
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
            <section class="ms__pendientes">
              <h3>{{ t('panel.mesas.porSentar', { n: store.porSentar().length }) }}</h3>

              @if (store.porSentar().length === 0) {
                <p class="ms__hecho">
                  <np-icon name="check-circle" />
                  {{ t('panel.mesas.todosSentados') }}
                </p>
              } @else {
                <ul class="ms__fichas">
                  @for (invitado of store.porSentar(); track invitado.id) {
                    <li>
                      <button
                        type="button"
                        class="ms__ficha"
                        [class.ms__ficha--elegida]="elegido() === invitado.id"
                        [attr.aria-pressed]="elegido() === invitado.id"
                        [npArrastrable]="invitado.id"
                        (tocado)="alternarElegido($event)"
                        (arrastrado)="elegido.set($event)"
                        (soltado)="soltarEn($event)"
                      >
                        {{ invitado.fullName }}
                      </button>
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
                            cuantos: sentados(mesa).length,
                            max: mesa.maxSeats,
                          })
                        }}
                      </span>
                    </button>

                    @if (pasada(mesa)) {
                      <p class="ms__estado">
                        <np-icon name="warning" />
                        {{ t('panel.mesas.pasada', { n: sentados(mesa).length - mesa.maxSeats }) }}
                      </p>
                    } @else if (corta(mesa)) {
                      <p class="ms__estado">
                        <np-icon name="info" />
                        {{ t('panel.mesas.corta', { n: mesa.minSeats - sentados(mesa).length }) }}
                      </p>
                    }

                    <ul class="ms__fichas">
                      @for (invitado of sentados(mesa); track invitado.id) {
                        <li>
                          <button
                            type="button"
                            class="ms__ficha"
                            [class.ms__ficha--elegida]="elegido() === invitado.id"
                            [class.ms__ficha--separado]="separado(invitado)"
                            [npArrastrable]="invitado.id"
                            (tocado)="alternarElegido($event)"
                            (arrastrado)="elegido.set($event)"
                            (soltado)="soltarEn($event)"
                          >
                            {{ invitado.fullName }}
                          </button>
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
                <input formControlName="name" [attr.maxlength]="maximoNombre" />
                <small>{{ t('panel.mesas.campo.nombreAyuda') }}</small>
              </label>

              <label>
                {{ t('panel.mesas.campo.forma') }}
                <select formControlName="shape" (change)="cambiarForma($event)">
                  @for (forma of formas; track forma) {
                    <option [value]="forma">{{ t('panel.mesas.forma.' + forma) }}</option>
                  }
                </select>
              </label>

              <div class="ms__pareja">
                <label>
                  {{ t('panel.mesas.campo.minimo') }}
                  <input formControlName="minSeats" type="number" min="0" step="1" />
                </label>
                <label>
                  {{ t('panel.mesas.campo.maximo') }}
                  <input formControlName="maxSeats" type="number" min="0" step="1" />
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
    .ms__avisos {
      margin: var(--np-space-1) 0 0;
      padding-inline-start: 1.1em;
    }
    .ms__pendientes {
      margin-block: var(--np-space-3);
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
    /* Cada invitado es un botón entero: se arrastra con el dedo y también se
       toca para elegirlo, que es lo que de verdad funciona en un móvil. */
    .ms__ficha {
      min-block-size: var(--np-tap-target);
      padding: var(--np-space-1) var(--np-space-2);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-sm);
      background: var(--np-surface-surface);
      color: inherit;
      font: inherit;
      font-size: var(--np-text-sm);
      cursor: grab;
    }
    .ms__ficha--elegida {
      border-color: var(--np-surface-text);
      background: var(--np-surface-raised);
      font-weight: var(--np-weight-medium);
    }
    /* El acompañante lejos de quien lo apuntó: marcado en su ficha y no solo
       en el aviso de arriba, que es donde se mira al repartir. */
    .ms__ficha--separado {
      border-color: var(--np-attention-border);
      border-style: dashed;
    }
    .ms__ficha.np-arrastrando {
      opacity: 0.6;
      cursor: grabbing;
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
  private readonly fb = inject(FormBuilder);

  protected readonly formas = FORMAS;
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

  /** Los avisos del dominio, ya escritos para leerlos de corrido. */
  protected readonly textosDeAvisos = computed(() => {
    const nombres = new Map(
      this.store.mesas().map((mesa, n) => [mesa.id, nombreDeMesa(mesa, n + 1)]),
    );
    const invitados = new Map(this.store.comoSentados().map((i) => [i.id, i.fullName]));

    return this.store.avisos().map((aviso) => {
      if (aviso.tipo === 'pasada') {
        return `«${nombres.get(aviso.mesaId) ?? ''}» tiene ${aviso.sobran} más de los que caben.`;
      }
      if (aviso.tipo === 'corta') {
        return `«${nombres.get(aviso.mesaId) ?? ''}» se queda corta: faltan ${aviso.faltan}.`;
      }
      return `${invitados.get(aviso.invitadoId) ?? ''} está lejos de ${invitados.get(aviso.titularId) ?? ''}, que fue quien lo apuntó.`;
    });
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

  protected pasada(mesa: Mesa): boolean {
    return this.sentados(mesa).length > mesa.maxSeats;
  }

  protected corta(mesa: Mesa): boolean {
    const cuantos = this.sentados(mesa).length;
    return cuantos > 0 && cuantos < mesa.minSeats;
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
    const acompanantes = acompanantesDe(guestId, mesa.id, invitados);
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

  /**
   * Soltar el arrastre: cuenta la mesa que haya debajo del dedo.
   *
   * Se mira el punto, no el elemento sobre el que se levantó el puntero: con
   * la captura de puntero, los eventos siguen llegando a la ficha que se
   * arrastra aunque esté encima de otra cosa.
   */
  protected async soltarEn(donde: SoltadoEn): Promise<void> {
    const quien = this.elegido();
    this.elegido.set(null);
    if (!quien) return;

    const debajo = document.elementFromPoint(donde.x, donde.y);
    const id = debajo?.closest('[data-mesa]')?.getAttribute('data-mesa') ?? null;
    const mesa = this.store.mesas().find((otra) => otra.id === id);
    if (!mesa) return;

    await this.sentarEn(quien, mesa);
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
