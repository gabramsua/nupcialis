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
 * Plantilla «Acuarela»: fondo blanco, todo centrado en una columna y el verde
 * oscuro como único color de tinta.
 *
 * Inspirada en las webs de boda de una sola columna con manchas de acuarela
 * (D-63). Las imágenes llegarán después: la portada enseña la foto de la boda
 * dentro de un arco y, mientras no la hay, una mancha de acuarela hecha con
 * degradados, para que el hueco no parezca un fallo. Nada de esto usa
 * imágenes ajenas: son degradados de CSS.
 */
@Component({
  selector: 'np-plantilla-acuarela',
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
        class="acuarela"
        [class.acuarela--con-foto]="datos().heroImageUrl"
        [style.--foto-url]="foto()"
      >
        <div class="acuarela__arco" aria-hidden="true"></div>

        @if (hayNombres()) {
          <h1 class="acuarela__nombres">
            @if (losDos()) {
              {{ t('publico.pareja', datos().nombres) }}
            } @else {
              {{ unNombre() }}
            }
          </h1>
        }

        @if (fecha(); as escrita) {
          <p class="acuarela__fecha">
            {{ escrita }}
          </p>
        }

        @if (faltan(); as restante) {
          <div class="acuarela__cuenta">
            <div class="acuarela__casilla">
              <span class="acuarela__numero">{{ restante.dias }}</span>
              <span class="acuarela__unidad">{{ t('publico.dias') }}</span>
            </div>
            <!--
              Horas y minutos solo si la pareja ha fijado la hora. Sin ella, lo
              que quedaría hasta la medianoche no es lo que queda hasta la boda,
              y enseñarlo sería inventarse una precisión.
            -->
            @if (restante.conHora) {
              <div class="acuarela__casilla">
                <span class="acuarela__numero">{{ restante.horas }}</span>
                <span class="acuarela__unidad">{{ t('publico.horas') }}</span>
              </div>
              <div class="acuarela__casilla">
                <span class="acuarela__numero">{{ restante.minutos }}</span>
                <span class="acuarela__unidad">{{ t('publico.minutos') }}</span>
              </div>
            }
          </div>
        }
      </main>

      @for (seccion of secciones(); track seccion.id) {
        <section class="acuarela__seccion" [attr.id]="'s-' + seccion.id">
          @if (seccion.fields['titulo']; as titulo) {
            <h2 class="acuarela__titulo">{{ titulo }}</h2>
          }

          @switch (seccion.type) {
            @case ('texto') {
              <!--
                HTML, y no texto plano: lo que la pareja escribe con la barra
                de formato llega ya **saneado desde el servidor** (regla de oro
                5, en dominio/html.ts de las funciones). Angular lo vuelve a
                sanear al pintarlo, que es la segunda red y no estorba.
              -->
              <div class="np-rico acuarela__rico" [innerHTML]="seccion.fields['texto']"></div>
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
                <dl class="acuarela__evento">
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
                          <span class="acuarela__direccion">{{ direccion }}</span>
                        }
                      </dd>
                    </div>
                  }
                </dl>
              }
              @if (seccion.fields['nota']; as nota) {
                <p class="acuarela__parrafo">{{ nota }}</p>
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
      --fondo: var(--np-marca-background, #ffffff);
      --texto: var(--np-marca-text, #233d00);
      --acento: var(--np-marca-accent, #7c9a5b);
      --script: 'Pinyon Script', 'Brush Script MT', cursive;
      --palo: 'Cormorant Garamond', georgia, 'Times New Roman', serif;
      /* Las dos manchas de acuarela: degradados, no imágenes. */
      --mancha-verde: radial-gradient(
        closest-side,
        color-mix(in srgb, var(--acento) 45%, transparent),
        color-mix(in srgb, var(--acento) 12%, transparent) 70%,
        transparent
      );
      --mancha-rosa: radial-gradient(
        closest-side,
        color-mix(in srgb, #e9b6b0 55%, transparent),
        color-mix(in srgb, #e9b6b0 14%, transparent) 70%,
        transparent
      );
    }
    .acuarela {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--np-space-5);
      min-block-size: 100dvh;
      padding: var(--np-space-6) var(--np-space-5);
      background:
        var(--mancha-rosa) no-repeat -6rem -4rem / 20rem 20rem,
        var(--mancha-verde) no-repeat calc(100% + 5rem) 100% / 22rem 22rem,
        var(--fondo);
      color: var(--texto);
      font-family: var(--palo);
      font-size: var(--np-text-lg);
      text-align: center;
    }
    /* El hueco de la foto: un arco. Con foto, la foto; sin ella, la mancha. */
    .acuarela__arco {
      inline-size: min(15rem, 70vw);
      aspect-ratio: 3 / 4;
      border-radius: 50% 50% 0.75rem 0.75rem / 38% 38% 0.75rem 0.75rem;
      background:
        var(--foto-url, none) center / cover,
        var(--mancha-verde) center / 140% 140%,
        var(--mancha-rosa) 20% 30% / 120% 120%;
    }
    .acuarela__nombres {
      margin: 0;
      font-family: var(--script);
      font-size: clamp(3rem, 2rem + 7vw, 6rem);
      font-weight: 400;
      line-height: 1.1;
      text-wrap: balance;
    }
    .acuarela__fecha {
      margin: 0;
      font-style: italic;
      letter-spacing: 0.1em;
    }
    .acuarela__cuenta {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: var(--np-space-6);
      padding-block-start: var(--np-space-4);
    }
    .acuarela__casilla {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .acuarela__numero {
      font-family: var(--script);
      font-size: var(--np-text-3xl);
      line-height: 1;
    }
    .acuarela__unidad {
      font-size: var(--np-text-xs);
      letter-spacing: 0.2em;
      text-transform: uppercase;
      opacity: 0.75;
    }
    .acuarela__seccion {
      /* Que la cabecera fija no tape el título al saltar a un ancla del menú. */
      scroll-margin-block-start: 5rem;
      display: flex;
      flex-direction: column;
      align-items: center;
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
    /* Una pincelada de acuarela bajo cada título. */
    .acuarela__titulo {
      margin: 0;
      padding-block-end: var(--np-space-3);
      background: var(--mancha-verde) no-repeat center bottom / 9rem 1.1rem;
      font-family: var(--script);
      font-size: var(--np-text-3xl);
      font-weight: 400;
      text-wrap: balance;
    }
    .acuarela__rico,
    .acuarela__parrafo {
      margin: 0;
      white-space: pre-line;
      line-height: 1.7;
    }
    .acuarela__evento {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-4);
      margin: 0;
    }
    .acuarela__evento dt {
      font-size: var(--np-text-xs);
      letter-spacing: 0.2em;
      text-transform: uppercase;
      opacity: 0.75;
    }
    .acuarela__evento dd {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-1);
      margin: var(--np-space-1) 0 0;
    }
    .acuarela__direccion {
      font-size: var(--np-text-sm);
      opacity: 0.8;
    }
  `,
})
export class PlantillaAcuarela {
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
