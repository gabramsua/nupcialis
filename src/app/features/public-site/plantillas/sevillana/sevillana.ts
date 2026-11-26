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
 * Plantilla «Sevillana»: la web como una portada hecha a mano.
 *
 * Banderines de papel picado, un arco de patio andaluz y una cenefa de
 * azulejos, con los nombres en letra de rotulador. Cálida y artesanal: para
 * parejas a las que les gusta lo hecho a mano. Todo el ornamento es CSS y
 * caracteres de texto —sin imágenes ni iconos nuevos—, así que no pesa en la
 * web pública.
 */
@Component({
  selector: 'np-plantilla-sevillana',
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
        class="sevillana"
        [class.sevillana--con-foto]="datos().heroImageUrl"
        [style.--foto]="foto()"
      >
        <div class="sevillana__banderines" aria-hidden="true"></div>

        <div class="sevillana__arco">
          <span class="sevillana__flor" aria-hidden="true">✿</span>
          @if (hayNombres()) {
            <h1 class="sevillana__nombres">
              @if (losDos()) {
                {{ t('publico.pareja', datos().nombres) }}
              } @else {
                {{ unNombre() }}
              }
            </h1>
          }
          @if (fecha(); as escrita) {
            <p class="sevillana__fecha">{{ escrita }}</p>
          }
          @if (faltan(); as restante) {
            <div class="sevillana__cuenta">
              <div class="sevillana__casilla">
                <span class="sevillana__numero">{{ restante.dias }}</span>
                <span class="sevillana__unidad">{{ t('publico.dias') }}</span>
              </div>
              <!--
              Horas y minutos solo si la pareja ha fijado la hora. Sin ella, lo
              que quedaría hasta la medianoche no es lo que queda hasta la boda,
              y enseñarlo sería inventarse una precisión.
            -->
              @if (restante.conHora) {
                <div class="sevillana__casilla">
                  <span class="sevillana__numero">{{ restante.horas }}</span>
                  <span class="sevillana__unidad">{{ t('publico.horas') }}</span>
                </div>
                <div class="sevillana__casilla">
                  <span class="sevillana__numero">{{ restante.minutos }}</span>
                  <span class="sevillana__unidad">{{ t('publico.minutos') }}</span>
                </div>
              }
            </div>
          }
        </div>

        <div class="sevillana__azulejos" aria-hidden="true"></div>
      </main>

      @for (seccion of secciones(); track seccion.id) {
        <section class="sevillana__seccion" [attr.id]="'s-' + seccion.id">
          @if (seccion.fields['titulo']; as titulo) {
            <h2 class="sevillana__titulo">{{ titulo }}</h2>
          }

          @switch (seccion.type) {
            @case ('texto') {
              <!--
                HTML, y no texto plano: lo que la pareja escribe con la barra
                de formato llega ya **saneado desde el servidor** (regla de oro
                5, en dominio/html.ts de las funciones). Angular lo vuelve a
                sanear al pintarlo, que es la segunda red y no estorba.
              -->
              <div class="np-rico sevillana__rico" [innerHTML]="seccion.fields['texto']"></div>
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
                <dl class="sevillana__evento">
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
                          <span class="sevillana__direccion">{{ direccion }}</span>
                        }
                      </dd>
                    </div>
                  }
                </dl>
              }
              @if (seccion.fields['nota']; as nota) {
                <p class="sevillana__parrafo">{{ nota }}</p>
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
      --fondo: var(--np-marca-background, #fbf3e2);
      --texto: var(--np-marca-text, #2b2a33);
      --acento: var(--np-marca-accent, #1f5aa6);
      --titulos: 'Caveat', 'Segoe Print', 'Comic Sans MS', cursive;
      --palo: 'Lora', georgia, 'Times New Roman', serif;
      /* Los colores de la cerámica y del papel picado, que no cambian con la paleta. */
      --albero: #e0a526;
      --clavel: #c03a2b;
      --verde: #3f7f5a;
    }
    .sevillana {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      gap: var(--np-space-5);
      min-block-size: 100dvh;
      padding-block-end: var(--np-space-5);
      background: var(--fondo);
      color: var(--texto);
      font-family: var(--palo);
      text-align: center;
    }
    /* Banderines de papel picado, cuatro colores en ristra. */
    .sevillana__banderines {
      align-self: stretch;
      block-size: 2.2rem;
      background:
        conic-gradient(from 135deg at 25% 0, var(--clavel) 0 90deg, transparent 0) 0 0 / 8rem 2.2rem,
        conic-gradient(from 135deg at 75% 0, var(--albero) 0 90deg, transparent 0) 0 0 / 8rem 2.2rem,
        conic-gradient(from 135deg at 25% 0, var(--acento) 0 90deg, transparent 0) 4rem 0 / 8rem
          2.2rem,
        conic-gradient(from 135deg at 75% 0, var(--verde) 0 90deg, transparent 0) 4rem 0 / 8rem
          2.2rem;
      background-repeat: repeat-x;
      opacity: 0.92;
    }
    /* El arco del patio: borde de azulejo azul y blanco con un filete dorado dentro. */
    .sevillana__arco {
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--np-space-4);
      inline-size: min(100% - 2 * var(--np-space-5), 30rem);
      padding: var(--np-space-7, 4rem) var(--np-space-5) var(--np-space-6);
      border: 0.6rem solid var(--acento);
      border-block-end-width: 0.6rem;
      border-radius: 999px 999px 0.4rem 0.4rem;
      background: color-mix(in srgb, #ffffff 70%, var(--fondo));
      box-shadow:
        inset 0 0 0 0.3rem var(--fondo),
        inset 0 0 0 0.42rem var(--albero),
        0 0.6rem 1.4rem color-mix(in srgb, var(--texto) 18%, transparent);
    }
    .sevillana--con-foto .sevillana__arco {
      background-image:
        linear-gradient(
          color-mix(in srgb, var(--fondo) 80%, transparent),
          color-mix(in srgb, var(--fondo) 88%, transparent)
        ),
        var(--foto);
      background-position: center;
      background-size: cover;
    }
    .sevillana__flor {
      color: var(--clavel);
      font-size: 2.4rem;
      line-height: 1;
    }
    .sevillana__nombres {
      margin: 0;
      font-family: var(--titulos);
      font-size: clamp(2.6rem, 1.4rem + 7vw, 5.2rem);
      font-weight: 700;
      line-height: 1;
      text-wrap: balance;
      color: var(--acento);
    }
    .sevillana__fecha {
      margin: 0;
      font-family: var(--titulos);
      font-size: var(--np-text-2xl);
      color: var(--clavel);
    }
    .sevillana__cuenta {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: var(--np-space-5);
      padding-block-start: var(--np-space-3);
      border-block-start: 2px dotted var(--albero);
    }
    .sevillana__casilla {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--np-space-1);
    }
    .sevillana__numero {
      font-family: var(--titulos);
      font-size: var(--np-text-3xl, 2.2rem);
      font-weight: 700;
      line-height: 1;
      color: var(--acento);
    }
    .sevillana__unidad {
      font-size: var(--np-text-xs);
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: color-mix(in srgb, var(--texto) 72%, transparent);
    }
    /* La cenefa de azulejos: una hilera de mosaicos de cuatro pétalos. */
    .sevillana__azulejos,
    .sevillana__seccion + .sevillana__seccion::before {
      align-self: stretch;
      block-size: 1.6rem;
      border-block: 0.2rem solid var(--acento);
      background:
        radial-gradient(circle at 50% 50%, var(--albero) 0 0.2rem, transparent 0.21rem),
        radial-gradient(circle at 0 0, var(--acento) 0 0.55rem, transparent 0.56rem),
        radial-gradient(circle at 100% 0, var(--acento) 0 0.55rem, transparent 0.56rem),
        radial-gradient(circle at 0 100%, var(--acento) 0 0.55rem, transparent 0.56rem),
        radial-gradient(circle at 100% 100%, var(--acento) 0 0.55rem, transparent 0.56rem), #ffffff;
      background-size: 1.6rem 1.6rem;
    }
    .sevillana__seccion {
      /* Que la cabecera fija no tape el título al saltar a un ancla del menú. */
      scroll-margin-block-start: 5rem;
      display: flex;
      flex-direction: column;
      gap: var(--np-space-4);
      padding: 0 0 var(--np-space-6);
      background: var(--fondo);
      color: var(--texto);
      font-family: var(--palo);
      font-size: var(--np-text-lg);
      text-align: center;
    }
    .sevillana__seccion + .sevillana__seccion::before {
      margin-block-end: var(--np-space-5);
      content: '';
    }
    .sevillana__seccion > * {
      max-inline-size: 60ch;
      margin-inline: auto;
      padding-inline: var(--np-space-5);
      box-sizing: border-box;
    }
    .sevillana__seccion > .sevillana__titulo {
      margin-block-start: var(--np-space-2);
    }
    .sevillana__titulo {
      margin: 0;
      font-family: var(--titulos);
      font-size: clamp(2.2rem, 1.6rem + 3vw, 3.2rem);
      font-weight: 700;
      line-height: 1.05;
      color: var(--acento);
      text-wrap: balance;
    }
    /* Subrayado a mano: una ondulación de puntos de albero. */
    .sevillana__titulo::after {
      display: block;
      margin-block-start: var(--np-space-2);
      color: var(--albero);
      font-family: var(--palo);
      font-size: var(--np-text-sm);
      letter-spacing: 0.6em;
      content: '✿ ✿ ✿';
    }
    .sevillana__rico {
      color: color-mix(in srgb, var(--texto) 90%, transparent);
      text-align: start;
    }
    .sevillana__parrafo {
      margin: 0;
      white-space: pre-line;
      line-height: 1.8;
    }
    /* Como un cartón cosido: filete discontinuo, a punto de bordado. */
    .sevillana__evento {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-4);
      margin: 0;
      padding: var(--np-space-4);
      border: 3px dashed var(--clavel);
      border-radius: 0.8rem;
      background: color-mix(in srgb, #ffffff 70%, var(--fondo));
    }
    .sevillana__evento dt {
      font-size: var(--np-text-xs);
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: color-mix(in srgb, var(--texto) 72%, transparent);
    }
    .sevillana__evento dd {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-1);
      margin: var(--np-space-1) 0 0;
      font-size: var(--np-text-xl);
    }
    .sevillana__direccion {
      font-size: var(--np-text-sm);
      color: color-mix(in srgb, var(--texto) 70%, transparent);
    }
  `,
})
export class PlantillaSevillana {
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
