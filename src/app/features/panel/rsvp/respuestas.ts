import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';

import { NpAlert } from '../../../design-system/components/alert/alert';
import { NpButton } from '../../../design-system/components/button/button';
import { NpEmptyState } from '../../../design-system/components/empty-state/empty-state';
import { NpIcon } from '../../../design-system/icons/icon';
import {
  PUERTA_RESPUESTAS,
  type FalloRespuestas,
  type RespuestasDeLaBoda,
} from '../../../core/rsvp/respuestas-gateway';
import { cuantosHanContestado, resumir } from './resumen-respuestas';

type Carga = 'cargando' | 'lista' | 'error';

/**
 * Lo que han contestado los invitados.
 *
 * Esta pantalla existe por un agujero concreto: las respuestas que no tienen
 * campo propio en el invitado —la canción que pediría, el mensaje para los
 * novios— vivían en `rsvpAnswers` y **no se veían en ninguna parte**. Ni en la
 * lista, ni en la ficha, ni en la exportación. Una pareja podía recibir
 * doscientos mensajes y no leer ninguno.
 *
 * Dos formas de enseñar, porque son dos preguntas distintas:
 *
 * - **Lo de opciones se cuenta.** «Vegano, 23» es lo primero que pregunta el
 *   catering, y nadie quiere leer doscientas filas que dicen «normal».
 * - **Lo escrito se lee**, una a una y con quién la escribió. Son peticiones de
 *   gente y alguna importa.
 *
 * Primero móvil: una pregunta debajo de otra, las barras a lo ancho y los
 * mensajes en tarjetas que se leen sin hacer zoom.
 */
@Component({
  selector: 'np-respuestas-rsvp',
  imports: [RouterLink, TranslocoDirective, NpAlert, NpButton, NpEmptyState, NpIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <section class="rp">
        <header class="rp__intro">
          <div>
            <h2>{{ t('panel.respuestas.titulo') }}</h2>
            @if (datos(); as d) {
              <p>
                {{
                  t('panel.respuestas.cuantas', {
                    n: contestadas(),
                    total: d.invitados.length,
                  })
                }}
              </p>
            }
          </div>
          <a class="rp__volver" routerLink="/panel/rsvp">
            <np-icon name="arrow-left" />
            {{ t('panel.respuestas.volver') }}
          </a>
        </header>

        @switch (carga()) {
          @case ('cargando') {
            <p class="rp__cargando">{{ t('panel.respuestas.cargando') }}</p>
          }

          @case ('error') {
            <np-alert status="declined" [heading]="t('panel.respuestas.errorCargar')">
              <p>{{ textoDelFallo(t) }}</p>
            </np-alert>
            <button npButton type="button" (click)="cargar()">
              {{ t('panel.respuestas.reintentar') }}
            </button>
          }

          @case ('lista') {
            @if (contestadas() === 0) {
              <np-empty-state
                icon="clock-countdown"
                [title]="t('panel.respuestas.vacio.titulo')"
                [description]="t('panel.respuestas.vacio.descripcion')"
              />
            } @else {
              <ol class="rp__preguntas">
                @for (resumen of resumenes(); track resumen.pregunta.id) {
                  <li class="rp__pregunta">
                    <h3>{{ resumen.pregunta.label }}</h3>
                    <p class="rp__cuantas">
                      {{ t('panel.respuestas.contestada', { n: resumen.total }) }}
                      @if (resumen.deAcompanantes > 0) {
                        ·
                        {{
                          t('panel.respuestas.deAcompanantes', {
                            n: resumen.deAcompanantes,
                          })
                        }}
                      }
                    </p>
                    @if (resumen.forma === 'recuento' && resumen.faltan.total > 0) {
                      <!--
                        «Autobús, 40» parece el total y no lo es si faltan los
                        acompañantes por apuntar: se dice cuántos y quiénes.
                      -->
                      <details class="rp__faltan">
                        <summary>
                          <np-icon name="warning" />
                          {{
                            t('panel.respuestas.faltan', {
                              n: resumen.faltan.total,
                              a: resumen.faltan.acompanantes,
                            })
                          }}
                        </summary>
                        <p>{{ resumen.faltan.nombres.join(', ') }}</p>
                      </details>
                    }

                    @if (resumen.forma === 'recuento') {
                      <dl class="rp__barras">
                        @for (opcion of resumen.opciones; track opcion.value) {
                          <div class="rp__barra">
                            <!--
                              La etiqueta es el botón que abre los nombres. Un
                              número suelto no sirve para hacer nada: «vegano,
                              23» es trabajo —avisar al catering, mover una
                              mesa— en cuanto se sabe quiénes son esos 23.
                              A cero no hay nada que abrir.
                            -->
                            <dt>
                              <button
                                type="button"
                                class="rp__abrir"
                                [disabled]="opcion.cuantos === 0"
                                [attr.aria-expanded]="
                                  estaAbierta(resumen.pregunta.id, opcion.value)
                                "
                                (click)="alternar(resumen.pregunta.id, opcion.value)"
                              >
                                <np-icon
                                  [name]="
                                    estaAbierta(resumen.pregunta.id, opcion.value)
                                      ? 'caret-up'
                                      : 'caret-down'
                                  "
                                />
                                {{ opcion.label }}
                              </button>
                            </dt>
                            <dd>
                              <span class="rp__numero">{{ opcion.cuantos }}</span>
                              <!--
                                La barra es decoración: el número va delante y
                                se lee solo. Por eso no lleva etiqueta propia.
                              -->
                              <span
                                class="rp__relleno"
                                aria-hidden="true"
                                [style.inline-size.%]="porcentaje(opcion.cuantos, resumen.total)"
                              ></span>
                            </dd>
                            @if (estaAbierta(resumen.pregunta.id, opcion.value)) {
                              <dd class="rp__quienes">{{ opcion.quienes.join(', ') }}</dd>
                            }
                          </div>
                        }
                      </dl>
                    } @else {
                      <!--
                        Lo escrito, tal cual. Son peticiones de los invitados y
                        alguna importa: una canción, una alergia que no cabía en
                        su casilla, un mensaje para los novios.
                      -->
                      <ul class="rp__escritas">
                        @for (escrita of resumen.escritas; track escrita.guestId) {
                          <li>
                            <p class="rp__texto">{{ escrita.texto }}</p>
                            <p class="rp__quien">{{ escrita.quien }}</p>
                          </li>
                        }
                      </ul>
                    }
                  </li>
                }
              </ol>
            }
          }
        }
      </section>
    </ng-container>
  `,
  styles: `
    .rp__intro {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-3);
      margin-block-end: var(--np-space-4);
    }
    .rp__intro h2 {
      margin: 0;
      font-size: var(--np-text-xl);
      font-weight: var(--np-weight-semibold);
    }
    .rp__intro p {
      margin: var(--np-space-1) 0 0;
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-sm);
    }
    .rp__volver {
      display: inline-flex;
      align-items: center;
      gap: var(--np-space-1);
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-sm);
      text-decoration: none;
    }
    @media (min-width: 48rem) {
      .rp__intro {
        flex-direction: row;
        align-items: flex-start;
        justify-content: space-between;
      }
    }
    .rp__cargando {
      color: var(--np-surface-text-muted);
    }
    .rp__preguntas {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-4);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .rp__pregunta {
      padding: var(--np-space-4);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-md);
      background: var(--np-surface-surface);
    }
    .rp__pregunta h3 {
      margin: 0;
      font-size: var(--np-text-base);
      font-weight: var(--np-weight-medium);
    }
    .rp__cuantas {
      margin: var(--np-space-1) 0 var(--np-space-3);
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-sm);
    }
    .rp__abrir {
      display: inline-flex;
      align-items: center;
      gap: var(--np-space-1);
      padding: 0;
      border: 0;
      background: transparent;
      color: inherit;
      font: inherit;
      text-align: start;
      cursor: pointer;
    }
    .rp__abrir[disabled] {
      cursor: default;
      opacity: 0.6;
    }
    /* Los nombres ocupan la fila entera: en un móvil, veintitrés nombres no
       caben en media columna. */
    .rp__quienes {
      grid-column: 1 / -1;
      margin: var(--np-space-1) 0 0;
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-sm);
    }
    .rp__faltan {
      margin-block-end: var(--np-space-3);
      padding: var(--np-space-2) var(--np-space-3);
      border: 1px solid var(--np-attention-border);
      border-radius: var(--np-radius-sm);
      background: var(--np-attention-bg);
      font-size: var(--np-text-sm);
    }
    .rp__faltan summary {
      display: flex;
      align-items: center;
      gap: var(--np-space-2);
      cursor: pointer;
    }
    .rp__faltan p {
      margin: var(--np-space-2) 0 0;
      color: var(--np-surface-text-muted);
    }
    .rp__barras {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-2);
      margin: 0;
    }
    .rp__barra {
      display: grid;
      grid-template-columns: minmax(6rem, 10rem) 1fr;
      align-items: center;
      gap: var(--np-space-3);
    }
    .rp__barra dt {
      font-size: var(--np-text-sm);
    }
    .rp__barra dd {
      display: flex;
      align-items: center;
      gap: var(--np-space-2);
      margin: 0;
    }
    .rp__numero {
      min-inline-size: 2ch;
      font-variant-numeric: tabular-nums;
      font-weight: var(--np-weight-medium);
    }
    .rp__relleno {
      block-size: 0.5rem;
      border-radius: var(--np-radius-full);
      background: var(--np-surface-text);
      opacity: 0.75;
    }
    /* Los mensajes se leen: tamaño de texto normal, ancho cómodo y el nombre
       debajo, como una cita. */
    .rp__escritas {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-3);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .rp__escritas li {
      padding: var(--np-space-3);
      border-inline-start: 3px solid var(--np-surface-border);
      background: var(--np-surface-canvas);
    }
    .rp__texto {
      margin: 0;
      max-inline-size: 60ch;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }
    .rp__quien {
      margin: var(--np-space-1) 0 0;
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-sm);
    }
  `,
})
export class RespuestasRsvp {
  private readonly puerta = inject(PUERTA_RESPUESTAS);

  protected readonly carga = signal<Carga>('cargando');
  protected readonly datos = signal<RespuestasDeLaBoda | null>(null);
  protected readonly fallo = signal<FalloRespuestas | null>(null);

  protected readonly resumenes = computed(() => {
    const d = this.datos();
    return d ? resumir(d.preguntas, d.invitados) : [];
  });

  protected readonly contestadas = computed(() =>
    cuantosHanContestado(this.datos()?.invitados ?? []),
  );

  constructor() {
    void this.cargar();
  }

  protected async cargar(): Promise<void> {
    this.carga.set('cargando');
    this.fallo.set(null);

    const resultado = await this.puerta.leer();

    if (!resultado.ok) {
      this.fallo.set(resultado.fallo);
      this.carga.set('error');
      return;
    }

    this.datos.set(resultado.datos);
    this.carga.set('lista');
  }

  /** La barra, en porcentaje sobre quien ha contestado esa pregunta. */
  /**
   * Qué recuento tiene los nombres abiertos, o `null` si ninguno.
   *
   * Uno cada vez: con ocho preguntas abiertas a la vez la pantalla se
   * convierte en un muro y se pierde lo que se estaba mirando.
   */
  private readonly abierta = signal<string | null>(null);

  protected estaAbierta(preguntaId: string, value: string): boolean {
    return this.abierta() === `${preguntaId}:${value}`;
  }

  protected alternar(preguntaId: string, value: string): void {
    const clave = `${preguntaId}:${value}`;
    this.abierta.update((actual) => (actual === clave ? null : clave));
  }

  protected porcentaje(cuantos: number, total: number): number {
    return total === 0 ? 0 : Math.round((cuantos / total) * 100);
  }

  protected textoDelFallo(t: (clave: string) => string): string {
    const f = this.fallo();
    if (f === null) return '';

    // Nunca el mensaje del SDK: un código de Firebase no le dice nada a la
    // pareja. Ya pasó con un «Unauthenticated [401]» en la lista de invitados.
    return t('panel.respuestas.fallo.' + (f.tipo === 'error' ? 'desconocido' : f.tipo));
  }
}
