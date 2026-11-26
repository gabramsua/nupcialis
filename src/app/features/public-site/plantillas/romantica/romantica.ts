import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

import { NpIcon } from '../../../../design-system/icons/icon';
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
 * Plantilla «Romántica»: tonos claros y cálidos, nombres en caligrafía.
 *
 * La que se elige cuando se quiere una web suave y de invitación clásica: fondo
 * rosado muy claro, letra manuscrita para los nombres y un serif de lectura
 * cómoda para el resto.
 */
@Component({
  selector: 'np-plantilla-romantica',
  imports: [
    TranslocoDirective,
    NpIcon,
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
        class="romantica"
        [class.romantica--con-foto]="datos().heroImageUrl"
        [style.--foto]="foto()"
      >
        <np-icon name="heart" class="romantica__hoja" />

        @if (hayNombres()) {
          <h1 class="romantica__nombres">
            @if (losDos()) {
              {{ t('publico.pareja', datos().nombres) }}
            } @else {
              {{ unNombre() }}
            }
          </h1>
        }

        @if (fecha(); as escrita) {
          <p class="romantica__fecha">
            {{ escrita }}
          </p>
        }

        @if (faltan(); as restante) {
          <div class="romantica__cuenta">
            <div class="romantica__casilla">
              <span class="romantica__numero">{{ restante.dias }}</span>
              <span class="romantica__unidad">{{ t('publico.dias') }}</span>
            </div>
            <!--
              Horas y minutos solo si la pareja ha fijado la hora. Sin ella, lo
              que quedaría hasta la medianoche no es lo que queda hasta la boda,
              y enseñarlo sería inventarse una precisión.
            -->
            @if (restante.conHora) {
              <div class="romantica__casilla">
                <span class="romantica__numero">{{ restante.horas }}</span>
                <span class="romantica__unidad">{{ t('publico.horas') }}</span>
              </div>
              <div class="romantica__casilla">
                <span class="romantica__numero">{{ restante.minutos }}</span>
                <span class="romantica__unidad">{{ t('publico.minutos') }}</span>
              </div>
            }
          </div>
        }
      </main>

      @for (seccion of secciones(); track seccion.id) {
        <section class="romantica__seccion" [attr.id]="'s-' + seccion.id">
          @if (seccion.fields['titulo']; as titulo) {
            <h2 class="romantica__titulo">{{ titulo }}</h2>
          }

          @switch (seccion.type) {
            @case ('texto') {
              <!--
                HTML, y no texto plano: lo que la pareja escribe con la barra
                de formato llega ya **saneado desde el servidor** (regla de oro
                5, en dominio/html.ts de las funciones). Angular lo vuelve a
                sanear al pintarlo, que es la segunda red y no estorba.
              -->
              <div class="np-rico romantica__rico" [innerHTML]="seccion.fields['texto']"></div>
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
                <dl class="romantica__evento">
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
                          <span class="romantica__direccion">{{ direccion }}</span>
                        }
                      </dd>
                    </div>
                  }
                </dl>
              }
              @if (seccion.fields['nota']; as nota) {
                <p class="romantica__parrafo">{{ nota }}</p>
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
      --fondo: var(--np-marca-background, #fbf1ef);
      --texto: var(--np-marca-text, #4a2f35);
      --acento: var(--np-marca-accent, #b5506a);
      --serifa: 'Great Vibes', 'Brush Script MT', cursive;
      --palo: 'Lora', georgia, 'Times New Roman', serif;
    }
    .romantica {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--np-space-5);
      min-block-size: 100dvh;
      padding: var(--np-space-6) var(--np-space-5);
      background: var(--fondo);
      color: var(--texto);
      font-family: var(--palo);
      text-align: center;
    }
    .romantica__hoja {
      --np-icon-size: 2.25rem;
      color: var(--acento);
    }
    .romantica__nombres {
      margin: 0;
      font-family: var(--serifa);
      font-size: clamp(2.75rem, 1.8rem + 6.5vw, 5.5rem);
      font-weight: 400;
      line-height: 1.05;
      letter-spacing: -0.01em;
      text-wrap: balance;
    }
    .romantica__fecha {
      margin: 0;
      font-size: var(--np-text-sm);
      letter-spacing: 0.28em;
      text-transform: uppercase;
      color: color-mix(in srgb, var(--texto) 78%, transparent);
    }
    .romantica__cuenta {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: var(--np-space-6);
      padding-block-start: var(--np-space-5);
      border-block-start: 1px solid color-mix(in srgb, var(--texto) 22%, transparent);
    }
    .romantica__casilla {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--np-space-1);
    }
    .romantica__numero {
      font-family: var(--serifa);
      font-size: var(--np-text-2xl);
      line-height: 1;
    }
    /* Primero móvil: una columna, con la medida de línea acotada en ch. */
    /* El velo asegura el contraste del texto sobre la foto de portada. Es del
       color del fondo de la boda, no un rosa fijo: con una paleta oscura
       (Vino, Burdeos…) un velo claro dejaba el texto claro sin leerse. */
    .romantica--con-foto {
      background-image:
        linear-gradient(
          color-mix(in srgb, var(--fondo) 72%, transparent),
          color-mix(in srgb, var(--fondo) 82%, transparent)
        ),
        var(--foto);
      background-position: center;
      background-size: cover;
    }
    .romantica__seccion {
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
      text-align: center;
    }
    .romantica__titulo {
      margin: 0;
      font-family: var(--serifa);
      font-size: var(--np-text-2xl);
      font-weight: 400;
      color: var(--acento);
      text-wrap: balance;
    }
    /* El color y poco más: las reglas del texto enriquecido son globales
       (design-system/components/rich-text.scss), porque son las mismas para
       todas las plantillas y aquí hay 4 kB de presupuesto por componente. */
    .romantica__rico {
      color: color-mix(in srgb, var(--texto) 85%, transparent);
    }
    .romantica__parrafo {
      margin: 0;
      white-space: pre-line;
      line-height: 1.8;
      color: color-mix(in srgb, var(--texto) 88%, transparent);
    }
    .romantica__evento {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-4);
      margin: 0;
      padding-block: var(--np-space-4);
      border-block: 1px solid color-mix(in srgb, var(--texto) 22%, transparent);
    }
    .romantica__evento dt {
      font-size: var(--np-text-xs);
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: color-mix(in srgb, var(--texto) 70%, transparent);
    }
    .romantica__evento dd {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-1);
      margin: var(--np-space-1) 0 0;
      font-size: var(--np-text-lg);
    }
    .romantica__direccion {
      font-size: var(--np-text-sm);
      color: color-mix(in srgb, var(--texto) 68%, transparent);
    }
    .romantica__nombres {
      letter-spacing: 0;
      font-size: clamp(3.25rem, 2rem + 8vw, 6.5rem);
    }
    .romantica__titulo {
      font-size: var(--np-text-3xl);
    }
    .romantica__fecha {
      font-style: italic;
      text-transform: none;
      letter-spacing: 0.08em;
      font-size: var(--np-text-lg);
    }
    .romantica__unidad {
      font-size: var(--np-text-xs);
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: color-mix(in srgb, var(--texto) 70%, transparent);
    }
  `,
})
export class PlantillaRomantica {
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
