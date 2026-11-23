import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

import { NpIcon } from '../../../../design-system/icons/icon';
import { NpFaqsPublicas } from '../../faqs/faqs-publicas';
import { NpCronologiaPublica } from '../../cronologia/cronologia-publica';
import { NpAlojamientosPublicos } from '../../alojamientos/alojamientos-publicos';
import { NpDressCodePublico } from '../../dress-code/dress-code-publico';
import { NpQuizLlamada } from '../../quiz/quiz-llamada';
import { NpGaleriaLlamada } from '../../galeria/galeria-llamada';
import { NpRegalosLlamada } from '../../regalos/regalos-llamada';
import { NpHistoriaLlamada } from '../../historia/historia-llamada';
import { NpMapaLlamada } from '../../mapa/mapa-llamada';
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
 * Plantilla «Moderna»: blanco, sans-serif grande y alineada a la izquierda.
 *
 * Lo contrario de las dos anteriores: sin adornos, con titulares enormes en
 * mayúsculas y un único color de acento. Para parejas que quieren una web que
 * parezca un cartel.
 */
@Component({
  selector: 'np-plantilla-moderna',
  imports: [
    TranslocoDirective,
    NpIcon,
    NpFaqsPublicas,
    NpCronologiaPublica,
    NpAlojamientosPublicos,
    NpDressCodePublico,
    NpQuizLlamada,
    NpGaleriaLlamada,
    NpRegalosLlamada,
    NpHistoriaLlamada,
    NpMapaLlamada,
    NpPlaylistLlamada,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <main
        class="moderna"
        [class.moderna--con-foto]="datos().heroImageUrl"
        [style.--foto]="foto()"
      >
        <np-icon name="sparkle" class="moderna__hoja" />

        @if (hayNombres()) {
          <h1 class="moderna__nombres">
            @if (losDos()) {
              {{ t('publico.pareja', datos().nombres) }}
            } @else {
              {{ unNombre() }}
            }
          </h1>
        }

        @if (fecha(); as escrita) {
          <p class="moderna__fecha">
            {{ escrita }}
          </p>
        }

        @if (faltan(); as restante) {
          <div class="moderna__cuenta">
            <div class="moderna__casilla">
              <span class="moderna__numero">{{ restante.dias }}</span>
              <span class="moderna__unidad">{{ t('publico.dias') }}</span>
            </div>
            <!--
              Horas y minutos solo si la pareja ha fijado la hora. Sin ella, lo
              que quedaría hasta la medianoche no es lo que queda hasta la boda,
              y enseñarlo sería inventarse una precisión.
            -->
            @if (restante.conHora) {
              <div class="moderna__casilla">
                <span class="moderna__numero">{{ restante.horas }}</span>
                <span class="moderna__unidad">{{ t('publico.horas') }}</span>
              </div>
              <div class="moderna__casilla">
                <span class="moderna__numero">{{ restante.minutos }}</span>
                <span class="moderna__unidad">{{ t('publico.minutos') }}</span>
              </div>
            }
          </div>
        }
      </main>

      @for (seccion of secciones(); track seccion.id) {
        <section class="moderna__seccion" [attr.id]="'s-' + seccion.id">
          @if (seccion.fields['titulo']; as titulo) {
            <h2 class="moderna__titulo">{{ titulo }}</h2>
          }

          @switch (seccion.type) {
            @case ('texto') {
              <!--
                HTML, y no texto plano: lo que la pareja escribe con la barra
                de formato llega ya **saneado desde el servidor** (regla de oro
                5, en dominio/html.ts de las funciones). Angular lo vuelve a
                sanear al pintarlo, que es la segunda red y no estorba.
              -->
              <div class="np-rico moderna__rico" [innerHTML]="seccion.fields['texto']"></div>
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
              <np-regalos-llamada />
            }
            @case ('historia') {
              <np-historia-llamada />
            }
            @case ('mapa') {
              <np-mapa-llamada />
            }
            @case ('playlist') {
              <np-playlist-llamada />
            }
            @case ('evento') {
              <!--
                El marco solo se pinta si hay algo dentro. Una sección de
                evento recién encendida y sin rellenar dibujaba una caja vacía
                debajo del título, que parece un fallo de la web y no una
                sección a medio escribir.
              -->
              @if (seccion.fields['hora'] || seccion.fields['lugar']) {
                <dl class="moderna__evento">
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
                          <span class="moderna__direccion">{{ direccion }}</span>
                        }
                      </dd>
                    </div>
                  }
                </dl>
              }
              @if (seccion.fields['nota']; as nota) {
                <p class="moderna__parrafo">{{ nota }}</p>
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
      --fondo: var(--np-marca-background, #ffffff);
      --texto: var(--np-marca-text, #161616);
      --acento: var(--np-marca-accent, #d6452f);
      --serifa: 'Montserrat', system-ui, sans-serif;
      --palo: 'Montserrat', system-ui, sans-serif;
    }
    .moderna {
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
    .moderna__hoja {
      --np-icon-size: 2.25rem;
      color: var(--acento);
    }
    .moderna__nombres {
      margin: 0;
      font-family: var(--serifa);
      font-size: clamp(2.75rem, 1.8rem + 6.5vw, 5.5rem);
      font-weight: 400;
      line-height: 1.05;
      letter-spacing: -0.01em;
      text-wrap: balance;
    }
    .moderna__fecha {
      margin: 0;
      font-size: var(--np-text-sm);
      letter-spacing: 0.28em;
      text-transform: uppercase;
      color: color-mix(in srgb, var(--texto) 78%, transparent);
    }
    .moderna__cuenta {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: var(--np-space-6);
      padding-block-start: var(--np-space-5);
      border-block-start: 1px solid color-mix(in srgb, var(--texto) 22%, transparent);
    }
    .moderna__casilla {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--np-space-1);
    }
    .moderna__numero {
      font-family: var(--serifa);
      font-size: var(--np-text-2xl);
      line-height: 1;
    }
    /* Primero móvil: una columna, con la medida de línea acotada en ch. */
    /* El velo asegura el contraste del texto sobre la foto de portada. Del
       color del fondo de la boda: un velo blanco fijo mataba las paletas oscuras. */
    .moderna--con-foto {
      background-image:
        linear-gradient(
          color-mix(in srgb, var(--fondo) 75%, transparent),
          color-mix(in srgb, var(--fondo) 85%, transparent)
        ),
        var(--foto);
      background-position: center;
      background-size: cover;
    }
    .moderna__seccion {
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
    .moderna__titulo {
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
    .moderna__rico {
      color: color-mix(in srgb, var(--texto) 85%, transparent);
    }
    .moderna__parrafo {
      margin: 0;
      white-space: pre-line;
      line-height: 1.8;
      color: color-mix(in srgb, var(--texto) 88%, transparent);
    }
    .moderna__evento {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-4);
      margin: 0;
      padding-block: var(--np-space-4);
      border-block: 1px solid color-mix(in srgb, var(--texto) 22%, transparent);
    }
    .moderna__evento dt {
      font-size: var(--np-text-xs);
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: color-mix(in srgb, var(--texto) 70%, transparent);
    }
    .moderna__evento dd {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-1);
      margin: var(--np-space-1) 0 0;
      font-size: var(--np-text-lg);
    }
    .moderna__direccion {
      font-size: var(--np-text-sm);
      color: color-mix(in srgb, var(--texto) 68%, transparent);
    }
    .moderna {
      align-items: flex-start;
      text-align: start;
    }
    .moderna__nombres {
      font-weight: 800;
      font-size: clamp(2.5rem, 1.4rem + 7vw, 6rem);
      letter-spacing: -0.03em;
      text-transform: uppercase;
      line-height: 0.95;
    }
    .moderna__fecha {
      color: var(--acento);
      font-weight: 600;
    }
    .moderna__cuenta {
      justify-content: flex-start;
    }
    .moderna__seccion {
      max-inline-size: 70ch;
      text-align: start;
    }
    .moderna__titulo {
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: -0.01em;
    }
    .moderna__unidad {
      font-size: var(--np-text-xs);
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: color-mix(in srgb, var(--texto) 70%, transparent);
    }
  `,
})
export class PlantillaModerna {
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
