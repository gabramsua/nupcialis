import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

import { NpFaqsPublicas } from '../../faqs/faqs-publicas';
import { NpCronologiaPublica } from '../../cronologia/cronologia-publica';
import { NpAlojamientosPublicos } from '../../alojamientos/alojamientos-publicos';
import { NpAutobusesPublicos } from '../../autobuses/autobuses-publicos';
import { NpCortejoPublico } from '../../cortejo/cortejo-publico';
import { NpDressCodePublico } from '../../dress-code/dress-code-publico';
import { NpQuizLlamada } from '../../quiz/quiz-llamada';
import { NpGaleriaLlamada } from '../../galeria/galeria-llamada';
import { NpRegalosLlamada } from '../../regalos/regalos-llamada';
import { NpHistoriaLlamada } from '../../historia/historia-llamada';
import { NpMapaLlamada } from '../../mapa/mapa-llamada';
import { NpRsvpLlamada } from '../../rsvp/rsvp-llamada';
import { NpLibroLlamada } from '../../libro/libro-llamada';
import { NpPlaylistLlamada } from '../../playlist/playlist-llamada';
import { fechaLarga } from '../../../../shared/fecha';
import {
  cuentaAtras,
  elNombreQueHaya,
  hayNombres,
  losDosNombres,
  seccionesVisibles,
  type DatosPortada,
} from '../portada';

/**
 * Plantilla «Barroca»: la web como una invitación impresa a mano.
 *
 * Pergamino claro, doble filete, letras capitales con adornos y florones entre
 * secciones. Es la más recargada del catálogo, a propósito: para parejas que
 * quieren que se note el trabajo manual. Todo el ornamento es CSS y caracteres
 * de texto —sin imágenes ni iconos nuevos—, así que no pesa en la web pública.
 */
@Component({
  selector: 'np-plantilla-barroca',
  imports: [
    TranslocoDirective,
    NpFaqsPublicas,
    NpCronologiaPublica,
    NpAlojamientosPublicos,
    NpAutobusesPublicos,
    NpCortejoPublico,
    NpDressCodePublico,
    NpQuizLlamada,
    NpGaleriaLlamada,
    NpRegalosLlamada,
    NpHistoriaLlamada,
    NpMapaLlamada,
    NpRsvpLlamada,
    NpPlaylistLlamada,
    NpLibroLlamada,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <main
        class="barroca"
        [class.barroca--con-foto]="datos().heroImageUrl"
        [style.--foto]="foto()"
      >
        <span class="barroca__floron" aria-hidden="true">❦</span>

        @if (hayNombres()) {
          <h1 class="barroca__nombres">
            @if (losDos()) {
              {{ t('publico.pareja', datos().nombres) }}
            } @else {
              {{ unNombre() }}
            }
          </h1>
        }

        @if (fecha(); as escrita) {
          <p class="barroca__fecha">
            {{ escrita }}
          </p>
        }

        @if (faltan(); as restante) {
          <div class="barroca__cuenta">
            <div class="barroca__casilla">
              <span class="barroca__numero">{{ restante.dias }}</span>
              <span class="barroca__unidad">{{ t('publico.dias') }}</span>
            </div>
            <!--
              Horas y minutos solo si la pareja ha fijado la hora. Sin ella, lo
              que quedaría hasta la medianoche no es lo que queda hasta la boda,
              y enseñarlo sería inventarse una precisión.
            -->
            @if (restante.conHora) {
              <div class="barroca__casilla">
                <span class="barroca__numero">{{ restante.horas }}</span>
                <span class="barroca__unidad">{{ t('publico.horas') }}</span>
              </div>
              <div class="barroca__casilla">
                <span class="barroca__numero">{{ restante.minutos }}</span>
                <span class="barroca__unidad">{{ t('publico.minutos') }}</span>
              </div>
            }
          </div>
        }
      </main>

      @for (seccion of secciones(); track seccion.id) {
        <section class="barroca__seccion" [attr.id]="'s-' + seccion.id">
          @if (seccion.fields['titulo']; as titulo) {
            <h2 class="barroca__titulo">{{ titulo }}</h2>
          }

          @switch (seccion.type) {
            @case ('texto') {
              <!--
                HTML, y no texto plano: lo que la pareja escribe con la barra
                de formato llega ya **saneado desde el servidor** (regla de oro
                5, en dominio/html.ts de las funciones). Angular lo vuelve a
                sanear al pintarlo, que es la segunda red y no estorba.
              -->
              <div class="np-rico barroca__rico" [innerHTML]="seccion.fields['texto']"></div>
            }
            @case ('preguntas') {
              <np-faqs-publicas [faqs]="datos().faqs" />
            }
            @case ('cronologia') {
              <np-cronologia-publica
                [cronologia]="datos().cronologia"
                [ubicaciones]="datos().ubicaciones"
              />
            }
            @case ('alojamientos') {
              <np-alojamientos-publicos
                [alojamientos]="datos().alojamientos"
                [ubicaciones]="datos().ubicaciones"
              />
            }
            @case ('cortejo') {
              <np-cortejo-publico [personas]="datos().cortejo" [nombres]="datos().nombres" />
            }
            @case ('rsvp') {
              <np-rsvp-llamada />
            }
            @case ('buses') {
              <np-autobuses-publicos [autobuses]="datos().autobuses" />
            }
            @case ('dressCode') {
              <np-dress-code-publico [dressCode]="datos().dressCode" />
            }
            @case ('quiz') {
              <np-quiz-llamada />
            }
            @case ('galeria') {
              <np-galeria-llamada />
            }
            @case ('regalos') {
              <np-regalos-llamada
                [directo]="datos().layout !== 'multipage'"
                [slug]="datos().slug ?? ''"
              />
            }
            @case ('historia') {
              <np-historia-llamada />
            }
            @case ('mapa') {
              <np-mapa-llamada [ubicaciones]="datos().ubicaciones" />
            }
            @case ('playlist') {
              <np-playlist-llamada />
            }
            @case ('libro') {
              <np-libro-llamada />
            }
            @case ('evento') {
              <!--
                El marco solo se pinta si hay algo dentro. Una sección de
                evento recién encendida y sin rellenar dibujaba una caja vacía
                debajo del título, que parece un fallo de la web y no una
                sección a medio escribir.
              -->
              @if (seccion.fields['hora'] || seccion.fields['lugar']) {
                <dl class="barroca__evento">
                  @if (seccion.fields['hora']) {
                    <div>
                      <dt>{{ t('publico.seccion.hora') }}</dt>
                      <dd>{{ seccion.fields['hora'] }}</dd>
                    </div>
                  }
                  @if (seccion.fields['lugar']) {
                    <div>
                      <dt>{{ t('publico.seccion.lugar') }}</dt>
                      <dd>
                        {{ seccion.fields['lugar'] }}
                        @if (seccion.fields['direccion']; as direccion) {
                          <span class="barroca__direccion">{{ direccion }}</span>
                        }
                      </dd>
                    </div>
                  }
                </dl>
              }
              @if (seccion.fields['nota']; as nota) {
                <p class="barroca__parrafo">{{ nota }}</p>
              }
            }
          }
        </section>
      }
    </ng-container>
  `,
  styles: `
    :host {
      display: block;
      /* El color llega de borde a borde: las secciones se centran, el fondo no. */
      background: var(--fondo);
      --fondo: var(--np-marca-background, #f3e9d2);
      --texto: var(--np-marca-text, #2e1f14);
      --acento: var(--np-marca-accent, #7a1f2b);
      --titulos: 'Cinzel Decorative', 'Cinzel', georgia, 'Times New Roman', serif;
      --palo: 'IM Fell English', georgia, 'Times New Roman', serif;
      --filete: color-mix(in srgb, var(--acento) 70%, var(--texto));
    }
    .barroca {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--np-space-5);
      min-block-size: 100dvh;
      padding: var(--np-space-7, 4rem) var(--np-space-6);
      background: var(--fondo);
      color: var(--texto);
      font-family: var(--palo);
      text-align: center;
    }
    /* El doble filete de las invitaciones antiguas: uno grueso y otro fino. */
    .barroca::before,
    .barroca::after {
      position: absolute;
      content: '';
      pointer-events: none;
    }
    .barroca::before {
      inset: var(--np-space-3);
      border: 4px double var(--filete);
    }
    .barroca::after {
      inset: calc(var(--np-space-3) + 0.6rem);
      border: 1px solid color-mix(in srgb, var(--filete) 55%, transparent);
    }
    .barroca--con-foto {
      background-image:
        linear-gradient(
          color-mix(in srgb, var(--fondo) 76%, transparent),
          color-mix(in srgb, var(--fondo) 86%, transparent)
        ),
        var(--foto);
      background-position: center;
      background-size: cover;
    }
    .barroca__floron {
      color: var(--acento);
      font-size: 2.5rem;
      line-height: 1;
    }
    .barroca__nombres {
      margin: 0;
      font-family: var(--titulos);
      font-size: clamp(2rem, 1.2rem + 5vw, 4.25rem);
      font-weight: 700;
      line-height: 1.15;
      text-wrap: balance;
      color: var(--acento);
    }
    .barroca__fecha {
      margin: 0;
      font-size: var(--np-text-lg);
      font-style: italic;
      letter-spacing: 0.08em;
    }
    .barroca__fecha::before,
    .barroca__fecha::after {
      content: ' ✦ ';
      color: var(--acento);
    }
    .barroca__cuenta {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: var(--np-space-6);
      padding-block-start: var(--np-space-4);
      border-block-start: 1px solid var(--filete);
    }
    .barroca__casilla {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--np-space-1);
    }
    .barroca__numero {
      font-family: var(--titulos);
      font-size: var(--np-text-2xl);
      line-height: 1;
    }
    .barroca__unidad {
      font-size: var(--np-text-xs);
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: color-mix(in srgb, var(--texto) 72%, transparent);
    }
    .barroca__seccion {
      /* Que la cabecera fija no tape el título al saltar a un ancla del menú. */
      scroll-margin-block-start: 5rem;
      display: flex;
      flex-direction: column;
      gap: var(--np-space-4);
      max-inline-size: 62ch;
      margin-inline: auto;
      padding: var(--np-space-6) var(--np-space-5);
      background: var(--fondo);
      color: var(--texto);
      font-family: var(--palo);
      font-size: var(--np-text-lg);
      text-align: center;
    }
    /* Un florón entre secciones, como el que separa los capítulos de un libro. */
    .barroca__seccion + .barroca__seccion::before {
      align-self: center;
      margin-block-end: var(--np-space-3);
      color: var(--acento);
      font-size: 1.5rem;
      content: '❦';
    }
    .barroca__titulo {
      margin: 0;
      font-family: var(--titulos);
      font-size: var(--np-text-2xl);
      font-weight: 700;
      color: var(--acento);
      text-wrap: balance;
    }
    .barroca__titulo::after {
      display: block;
      margin-block-start: var(--np-space-2);
      color: var(--filete);
      font-size: var(--np-text-sm);
      letter-spacing: 0.5em;
      content: '— ✦ —';
    }
    /* La capital del primer párrafo, como en un manuscrito iluminado. */
    .barroca__rico {
      color: color-mix(in srgb, var(--texto) 90%, transparent);
      text-align: start;
    }
    .barroca__rico > p:first-of-type::first-letter {
      float: inline-start;
      margin: 0.05em 0.12em 0 0;
      font-family: var(--titulos);
      font-size: 3.4em;
      line-height: 0.85;
      color: var(--acento);
    }
    .barroca__parrafo {
      margin: 0;
      white-space: pre-line;
      line-height: 1.8;
    }
    .barroca__evento {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-4);
      margin: 0;
      padding: var(--np-space-4);
      border: 3px double var(--filete);
    }
    .barroca__evento dt {
      font-size: var(--np-text-xs);
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: color-mix(in srgb, var(--texto) 72%, transparent);
    }
    .barroca__evento dd {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-1);
      margin: var(--np-space-1) 0 0;
      font-size: var(--np-text-xl);
    }
    .barroca__direccion {
      font-size: var(--np-text-sm);
      color: color-mix(in srgb, var(--texto) 70%, transparent);
    }
  `,
})
export class PlantillaBarroca {
  /** La portada no pinta el título si la boda todavía no tiene nombres. */
  protected readonly hayNombres = computed(() => hayNombres(this.datos().nombres));
  protected readonly losDos = computed(() => losDosNombres(this.datos().nombres));
  protected readonly unNombre = computed(() => elNombreQueHaya(this.datos().nombres));
  readonly datos = input.required<DatosPortada>();

  protected readonly foto = computed(() => {
    const url = this.datos().heroImageUrl;
    return url ? `url("${url.replace(/["\\)]/g, encodeURIComponent)}")` : null;
  });

  protected readonly secciones = computed(() => seccionesVisibles(this.datos()));

  protected readonly fecha = computed(() =>
    fechaLarga(this.datos().weddingDate, this.datos().locale),
  );

  protected readonly faltan = computed(() => cuentaAtras(this.datos(), new Date()));
}
