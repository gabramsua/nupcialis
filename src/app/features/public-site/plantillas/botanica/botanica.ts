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
 * Plantilla «Botánica»: portada oscura a sangre, tipografía de mucho contraste.
 *
 * Misma información que la clásica y una impresión completamente distinta. Eso
 * es lo que tiene que dar un catálogo: no cinco variaciones del mismo gris, sino
 * opciones que una pareja reconozca como suyas o como ajenas de un vistazo.
 */
@Component({
  selector: 'np-plantilla-botanica',
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
    NpMapaLlamada,
    NpPlaylistLlamada,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <main
        class="botanica"
        [class.botanica--con-foto]="datos().heroImageUrl"
        [style.--foto]="foto()"
      >
        <np-icon name="leaf" class="botanica__hoja" />

        @if (hayNombres()) {
          <h1 class="botanica__nombres">
            @if (losDos()) {
              {{ t('publico.pareja', datos().nombres) }}
            } @else {
              {{ unNombre() }}
            }
          </h1>
        }

        @if (fecha(); as escrita) {
          <p class="botanica__fecha">
            {{ escrita }}
          </p>
        }

        @if (faltan(); as restante) {
          <div class="botanica__cuenta">
            <div class="botanica__casilla">
              <span class="botanica__numero">{{ restante.dias }}</span>
              <span class="botanica__unidad">{{ t('publico.dias') }}</span>
            </div>
            <!--
              Horas y minutos solo si la pareja ha fijado la hora. Sin ella, lo
              que quedaría hasta la medianoche no es lo que queda hasta la boda,
              y enseñarlo sería inventarse una precisión.
            -->
            @if (restante.conHora) {
              <div class="botanica__casilla">
                <span class="botanica__numero">{{ restante.horas }}</span>
                <span class="botanica__unidad">{{ t('publico.horas') }}</span>
              </div>
              <div class="botanica__casilla">
                <span class="botanica__numero">{{ restante.minutos }}</span>
                <span class="botanica__unidad">{{ t('publico.minutos') }}</span>
              </div>
            }
          </div>
        }
      </main>

      @for (seccion of secciones(); track seccion.id) {
        <section class="botanica__seccion">
          @if (seccion.fields['titulo']; as titulo) {
            <h2 class="botanica__titulo">{{ titulo }}</h2>
          }

          @switch (seccion.type) {
            @case ('texto') {
              <!--
                HTML, y no texto plano: lo que la pareja escribe con la barra
                de formato llega ya **saneado desde el servidor** (regla de oro
                5, en dominio/html.ts de las funciones). Angular lo vuelve a
                sanear al pintarlo, que es la segunda red y no estorba.
              -->
              <div class="np-rico botanica__rico" [innerHTML]="seccion.fields['texto']"></div>
            }
            @case ('preguntas') {
              <np-faqs-publicas [faqs]="datos().faqs" />
            }
            @case ('cronologia') {
              <np-cronologia-publica [cronologia]="datos().cronologia" />
            }
            @case ('alojamientos') {
              <np-alojamientos-publicos [alojamientos]="datos().alojamientos" />
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
                <dl class="botanica__evento">
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
                          <span class="botanica__direccion">{{ direccion }}</span>
                        }
                      </dd>
                    </div>
                  }
                </dl>
              }
              @if (seccion.fields['nota']; as nota) {
                <p class="botanica__parrafo">{{ nota }}</p>
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
      --fondo: var(--np-marca-background, #1f4436);
      --texto: var(--np-marca-text, #f4f0e8);
      --acento: var(--np-marca-accent, #d9c9a3);
      --serifa: 'DM Serif Display', georgia, 'Times New Roman', serif;
      --palo: 'Jost', system-ui, sans-serif;
    }
    .botanica {
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
    .botanica__hoja {
      --np-icon-size: 2.25rem;
      color: var(--acento);
    }
    .botanica__nombres {
      margin: 0;
      font-family: var(--serifa);
      font-size: clamp(2.75rem, 1.8rem + 6.5vw, 5.5rem);
      font-weight: 400;
      line-height: 1.05;
      letter-spacing: -0.01em;
      text-wrap: balance;
    }
    .botanica__fecha {
      margin: 0;
      font-size: var(--np-text-sm);
      letter-spacing: 0.28em;
      text-transform: uppercase;
      color: color-mix(in srgb, var(--texto) 78%, transparent);
    }
    .botanica__cuenta {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: var(--np-space-6);
      padding-block-start: var(--np-space-5);
      border-block-start: 1px solid color-mix(in srgb, var(--texto) 22%, transparent);
    }
    .botanica__casilla {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--np-space-1);
    }
    .botanica__numero {
      font-family: var(--serifa);
      font-size: var(--np-text-2xl);
      line-height: 1;
    }
    /* Primero móvil: una columna, con la medida de línea acotada en ch. */
    /* La botánica ya es oscura: el velo solo asegura el contraste del texto
       claro sobre fotos claras. Ver el comentario de la clásica. */
    .botanica--con-foto {
      background-image: linear-gradient(rgb(12 30 22 / 55%), rgb(12 30 22 / 70%)), var(--foto);
      background-position: center;
      background-size: cover;
    }
    .botanica__seccion {
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
    .botanica__titulo {
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
    .botanica__rico {
      color: color-mix(in srgb, var(--texto) 85%, transparent);
    }
    .botanica__parrafo {
      margin: 0;
      white-space: pre-line;
      line-height: 1.8;
      color: color-mix(in srgb, var(--texto) 88%, transparent);
    }
    .botanica__evento {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-4);
      margin: 0;
      padding-block: var(--np-space-4);
      border-block: 1px solid color-mix(in srgb, var(--texto) 22%, transparent);
    }
    .botanica__evento dt {
      font-size: var(--np-text-xs);
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: color-mix(in srgb, var(--texto) 70%, transparent);
    }
    .botanica__evento dd {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-1);
      margin: var(--np-space-1) 0 0;
      font-size: var(--np-text-lg);
    }
    .botanica__direccion {
      font-size: var(--np-text-sm);
      color: color-mix(in srgb, var(--texto) 68%, transparent);
    }
    .botanica__unidad {
      font-size: var(--np-text-xs);
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: color-mix(in srgb, var(--texto) 70%, transparent);
    }
  `,
})
export class PlantillaBotanica {
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
