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
 * Plantilla «Cottage»: la web como un álbum de papel de campo.
 *
 * Una sola columna centrada sobre papel con textura, la portada como una
 * polaroid sujeta con cinta, margaritas de papel recortado y la fecha en
 * mayúsculas muy separadas. Inspirada en el estilo de invitación «cottage»
 * —luminoso, de jardín—, sin copiar nada de ningún diseño concreto. Todo el
 * ornamento es CSS y caracteres de texto —sin imágenes ni iconos nuevos—, así
 * que no pesa en la web pública.
 */
@Component({
  selector: 'np-plantilla-cottage',
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
        class="cottage"
        [class.cottage--con-foto]="datos().heroImageUrl"
        [style.--foto]="foto()"
      >
        <!--
          La polaroid: marco blanco con la foto de portada y, debajo, el pie con
          los nombres. Sin foto, el recuadro queda en un lavado de color y la
          flor de papel recortado hace de imagen.
        -->
        <figure class="cottage__polaroid">
          <span class="cottage__cinta" aria-hidden="true"></span>
          <span class="cottage__margarita cottage__margarita--a" aria-hidden="true"></span>
          <span class="cottage__margarita cottage__margarita--b" aria-hidden="true"></span>
          <div class="cottage__foto" aria-hidden="true">
            <span class="cottage__brote">❀</span>
          </div>
          <figcaption class="cottage__pie">
            @if (hayNombres()) {
              <h1 class="cottage__nombres">
                @if (losDos()) {
                  {{ t('publico.pareja', datos().nombres) }}
                } @else {
                  {{ unNombre() }}
                }
              </h1>
            }
          </figcaption>
        </figure>

        @if (fecha(); as escrita) {
          <p class="cottage__fecha">{{ escrita }}</p>
        }
        @if (faltan(); as restante) {
          <div class="cottage__cuenta">
            <div class="cottage__casilla">
              <span class="cottage__numero">{{ restante.dias }}</span>
              <span class="cottage__unidad">{{ t('publico.dias') }}</span>
            </div>
            <!--
              Horas y minutos solo si la pareja ha fijado la hora. Sin ella, lo
              que quedaría hasta la medianoche no es lo que queda hasta la boda,
              y enseñarlo sería inventarse una precisión.
            -->
            @if (restante.conHora) {
              <div class="cottage__casilla">
                <span class="cottage__numero">{{ restante.horas }}</span>
                <span class="cottage__unidad">{{ t('publico.horas') }}</span>
              </div>
              <div class="cottage__casilla">
                <span class="cottage__numero">{{ restante.minutos }}</span>
                <span class="cottage__unidad">{{ t('publico.minutos') }}</span>
              </div>
            }
          </div>
        }
      </main>

      @for (seccion of secciones(); track seccion.id) {
        <section class="cottage__seccion" [attr.id]="'s-' + seccion.id">
          @if (seccion.fields['titulo']; as titulo) {
            <h2 class="cottage__titulo">{{ titulo }}</h2>
          }

          @switch (seccion.type) {
            @case ('texto') {
              <!--
                HTML, y no texto plano: lo que la pareja escribe con la barra
                de formato llega ya **saneado desde el servidor** (regla de oro
                5, en dominio/html.ts de las funciones). Angular lo vuelve a
                sanear al pintarlo, que es la segunda red y no estorba.
              -->
              <div class="np-rico cottage__rico" [innerHTML]="seccion.fields['texto']"></div>
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
                <dl class="cottage__evento">
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
                          <span class="cottage__direccion">{{ direccion }}</span>
                        }
                      </dd>
                    </div>
                  }
                </dl>
              }
              @if (seccion.fields['nota']; as nota) {
                <p class="cottage__parrafo">{{ nota }}</p>
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
      --fondo: var(--np-marca-background, #f4efe4);
      --texto: var(--np-marca-text, #4a4036);
      --acento: var(--np-marca-accent, #6f8460);
      --titulos: 'Playfair Display', georgia, 'Times New Roman', serif;
      --palo: 'Lato', system-ui, sans-serif;
      --papel: color-mix(in srgb, #ffffff 65%, var(--fondo));
      --petalo: #fffdf6;
      --yema: #e6bd4a;
    }
    .cottage {
      position: relative;
      /* Las margaritas asoman fuera de la polaroid: que no creen scroll lateral. */
      overflow-x: clip;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--np-space-5);
      min-block-size: 100dvh;
      padding: var(--np-space-7, 4rem) var(--np-space-5);
      /* La textura de papel: un granulado fino de puntos casi invisibles. */
      background:
        radial-gradient(color-mix(in srgb, var(--texto) 7%, transparent) 0.5px, transparent 0.6px) 0
          0 / 5px 5px,
        radial-gradient(color-mix(in srgb, var(--texto) 5%, transparent) 0.5px, transparent 0.6px)
          2px 3px / 7px 7px,
        var(--fondo);
      color: var(--texto);
      font-family: var(--palo);
      text-align: center;
    }
    .cottage__polaroid {
      position: relative;
      inline-size: min(100%, 22rem);
      margin: 0;
      padding: 0.9rem 0.9rem var(--np-space-5);
      background: #ffffff;
      box-shadow:
        0 0.1rem 0.2rem color-mix(in srgb, var(--texto) 25%, transparent),
        0 1rem 2rem color-mix(in srgb, var(--texto) 18%, transparent);
      rotate: -2deg;
    }
    .cottage__foto {
      display: grid;
      place-items: center;
      aspect-ratio: 4 / 5;
      background:
        radial-gradient(
          circle at 30% 25%,
          color-mix(in srgb, var(--acento) 30%, #ffffff),
          transparent 60%
        ),
        color-mix(in srgb, var(--acento) 18%, var(--fondo));
      color: color-mix(in srgb, var(--acento) 70%, #ffffff);
      font-size: 5rem;
    }
    .cottage--con-foto .cottage__foto {
      background-image: var(--foto);
      background-position: center;
      background-size: cover;
    }
    .cottage--con-foto .cottage__brote {
      display: none;
    }
    .cottage__pie {
      padding-block-start: var(--np-space-4);
    }
    /* La cinta de carrocero que la sujeta. */
    .cottage__cinta {
      position: absolute;
      inset-block-start: -0.9rem;
      inset-inline-start: 50%;
      inline-size: 6rem;
      block-size: 1.8rem;
      translate: -50% 0;
      rotate: 3deg;
      background: color-mix(in srgb, var(--acento) 35%, transparent);
      box-shadow: 0 0.05rem 0.15rem color-mix(in srgb, var(--texto) 20%, transparent);
    }
    /*
      Las margaritas de papel recortado: pétalos con un cónico repetido, una
      yema en el centro y un redondeado que suaviza la punta.
    */
    .cottage__margarita {
      position: absolute;
      inline-size: 4.4rem;
      aspect-ratio: 1;
      border-radius: 50%;
      background:
        radial-gradient(circle, var(--yema) 0 16%, transparent 17%),
        repeating-conic-gradient(
          var(--petalo) 0 11.25deg,
          color-mix(in srgb, var(--petalo) 72%, var(--yema)) 11.25deg 22.5deg
        );
      filter: drop-shadow(0 0.1rem 0.15rem color-mix(in srgb, var(--texto) 30%, transparent));
      -webkit-mask: radial-gradient(circle, #000 0 62%, transparent 63%);
      mask: radial-gradient(circle, #000 0 62%, transparent 63%);
    }
    .cottage__margarita--a {
      inset-block-end: -1.4rem;
      inset-inline-start: -1.6rem;
      rotate: 12deg;
    }
    .cottage__margarita--b {
      inset-block-start: 38%;
      inset-inline-end: -1.9rem;
      inline-size: 3.2rem;
      rotate: -20deg;
    }
    .cottage__nombres {
      margin: 0;
      font-family: var(--titulos);
      font-size: clamp(1.8rem, 1.2rem + 3.4vw, 2.8rem);
      font-style: italic;
      font-weight: 400;
      line-height: 1.15;
      text-wrap: balance;
      color: var(--texto);
    }
    /* La fecha, en mayúsculas muy abiertas, como el pie de una invitación. */
    .cottage__fecha {
      margin: var(--np-space-4) 0 0;
      font-size: var(--np-text-sm);
      font-weight: 400;
      letter-spacing: 0.4em;
      text-transform: uppercase;
      color: var(--acento);
    }
    .cottage__cuenta {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: var(--np-space-6);
    }
    .cottage__casilla {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--np-space-1);
    }
    .cottage__numero {
      font-family: var(--titulos);
      font-size: var(--np-text-2xl);
      line-height: 1;
    }
    .cottage__unidad {
      font-size: var(--np-text-xs);
      letter-spacing: 0.3em;
      text-transform: uppercase;
      color: color-mix(in srgb, var(--texto) 68%, transparent);
    }
    .cottage__seccion {
      /* Que la cabecera fija no tape el título al saltar a un ancla del menú. */
      scroll-margin-block-start: 5rem;
      display: flex;
      flex-direction: column;
      gap: var(--np-space-4);
      max-inline-size: 56ch;
      margin-inline: auto;
      padding: var(--np-space-6) var(--np-space-5);
      background: var(--fondo);
      color: var(--texto);
      font-family: var(--palo);
      font-size: var(--np-text-lg);
      font-weight: 300;
      text-align: center;
    }
    /* Una margarita pequeña entre secciones, hecha con un solo carácter. */
    .cottage__seccion + .cottage__seccion::before {
      align-self: center;
      margin-block-end: var(--np-space-3);
      color: var(--acento);
      font-size: 1.6rem;
      content: '✿';
    }
    .cottage__titulo {
      margin: 0;
      font-family: var(--titulos);
      font-size: var(--np-text-2xl);
      font-style: italic;
      font-weight: 400;
      color: var(--texto);
      text-wrap: balance;
    }
    .cottage__titulo::after {
      display: block;
      inline-size: 3rem;
      margin: var(--np-space-3) auto 0;
      border-block-start: 1px solid var(--acento);
      content: '';
    }
    .cottage__rico {
      color: color-mix(in srgb, var(--texto) 92%, transparent);
      text-align: start;
    }
    .cottage__parrafo {
      margin: 0;
      white-space: pre-line;
      line-height: 1.85;
    }
    /* El dato del evento, como una tarjeta de papel ligeramente girada. */
    .cottage__evento {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-4);
      margin: 0;
      padding: var(--np-space-5);
      background: #ffffff;
      box-shadow: 0 0.6rem 1.4rem color-mix(in srgb, var(--texto) 14%, transparent);
      rotate: 0.6deg;
    }
    .cottage__evento dt {
      font-size: var(--np-text-xs);
      letter-spacing: 0.3em;
      text-transform: uppercase;
      color: var(--acento);
    }
    .cottage__evento dd {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-1);
      margin: var(--np-space-1) 0 0;
      font-family: var(--titulos);
      font-size: var(--np-text-xl);
    }
    .cottage__direccion {
      font-family: var(--palo);
      font-size: var(--np-text-sm);
      color: color-mix(in srgb, var(--texto) 70%, transparent);
    }
  `,
})
export class PlantillaCottage {
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
