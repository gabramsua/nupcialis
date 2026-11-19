import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

import { NpIcon } from '../../../../design-system/icons/icon';
import { NpFaqsPublicas } from '../../faqs/faqs-publicas';
import { NpCronologiaPublica } from '../../cronologia/cronologia-publica';
import { NpAlojamientosPublicos } from '../../alojamientos/alojamientos-publicos';
import { NpDressCodePublico } from '../../dress-code/dress-code-publico';
import { NpQuizLlamada } from '../../quiz/quiz-llamada';
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
 * Plantilla «Clásica»: papel claro, serifa y mucho aire.
 *
 * Los colores se escriben como `var(--np-marca-*, <reserva>)`: si la pareja ha
 * elegido su paleta, la envoltura pública la pone en el host y manda; si no,
 * manda la reserva de esta plantilla. Así una boda recién creada ya se ve bien
 * sin que nadie haya tocado un selector de color.
 */
@Component({
  selector: 'np-plantilla-clasica',
  imports: [
    TranslocoDirective,
    NpIcon,
    NpFaqsPublicas,
    NpCronologiaPublica,
    NpAlojamientosPublicos,
    NpDressCodePublico,
    NpQuizLlamada,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <main
        class="clasica"
        [class.clasica--con-foto]="datos().heroImageUrl"
        [style.--foto]="foto()"
      >
        <div class="clasica__texto">
          <p class="clasica__antetitulo">
            <np-icon name="diamond" weight="fill" />
            {{ t('publico.nosCasamos') }}
          </p>

          @if (hayNombres()) {
            <h1 class="clasica__nombres">
              @if (losDos()) {
                <span>{{ datos().nombres.partnerA }}</span>
                <span class="clasica__amperson">&amp;</span>
                <span>{{ datos().nombres.partnerB }}</span>
              } @else {
                <span>{{ unNombre() }}</span>
              }
            </h1>
          }

          @if (fecha(); as escrita) {
            <p class="clasica__fecha">
              <np-icon name="calendar" />
              {{ escrita }}
            </p>
          }

          @if (faltan(); as restante) {
            <div class="clasica__cuenta">
              <div class="clasica__casilla">
                <span class="clasica__numero">{{ restante.dias }}</span>
                <span class="clasica__unidad">{{ t('publico.dias') }}</span>
              </div>
              <!--
                Horas y minutos solo si la pareja ha fijado la hora. Sin ella,
                lo que quedaría hasta la medianoche no es lo que queda hasta la
                boda, y enseñarlo sería inventarse una precisión.
              -->
              @if (restante.conHora) {
                <div class="clasica__casilla">
                  <span class="clasica__numero">{{ restante.horas }}</span>
                  <span class="clasica__unidad">{{ t('publico.horas') }}</span>
                </div>
                <div class="clasica__casilla">
                  <span class="clasica__numero">{{ restante.minutos }}</span>
                  <span class="clasica__unidad">{{ t('publico.minutos') }}</span>
                </div>
              }
            </div>
          }
        </div>
      </main>

      @for (seccion of secciones(); track seccion.id) {
        <section class="clasica__seccion">
          @if (seccion.fields['titulo']; as titulo) {
            <h2 class="clasica__titulo">{{ titulo }}</h2>
          }

          @switch (seccion.type) {
            @case ('texto') {
              <!--
                HTML, y no texto plano: lo que la pareja escribe con la barra
                de formato llega ya **saneado desde el servidor** (regla de oro
                5, en dominio/html.ts de las funciones). Angular lo vuelve a
                sanear al pintarlo, que es la segunda red y no estorba.
              -->
              <div class="np-rico clasica__rico" [innerHTML]="seccion.fields['texto']"></div>
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
            @case ('evento') {
              <!--
                El marco solo se pinta si hay algo dentro. Una sección de
                evento recién encendida y sin rellenar dibujaba una caja vacía
                debajo del título, que parece un fallo de la web y no una
                sección a medio escribir.
              -->
              @if (seccion.fields['hora'] || seccion.fields['lugar']) {
                <dl class="clasica__evento">
                  @if (seccion.fields['hora']) {
                    <div>
                      <dt><np-icon name="clock" />{{ t('publico.seccion.hora') }}</dt>
                      <dd>{{ seccion.fields['hora'] }}</dd>
                    </div>
                  }
                  @if (seccion.fields['lugar']) {
                    <div>
                      <dt><np-icon name="map-pin" />{{ t('publico.seccion.lugar') }}</dt>
                      <dd>
                        {{ seccion.fields['lugar'] }}
                        @if (seccion.fields['direccion']; as direccion) {
                          <span class="clasica__direccion">{{ direccion }}</span>
                        }
                      </dd>
                    </div>
                  }
                </dl>
              }
              @if (seccion.fields['nota']; as nota) {
                <p class="clasica__parrafo">{{ nota }}</p>
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
      /* Reservas de la plantilla. La paleta de la pareja las pisa si existe. */
      --fondo: var(--np-marca-background, #faf8f6);
      --texto: var(--np-marca-text, #241f1c);
      --acento: var(--np-marca-accent, #e54d69);
      --superficie: var(--np-marca-surface, #ffffff);
      --borde: color-mix(in srgb, var(--texto) 12%, transparent);
      --serifa: 'Cormorant Garamond', georgia, 'Times New Roman', serif;
      --palo: 'Karla', system-ui, sans-serif;
    }
    .clasica {
      display: grid;
      place-content: center;
      min-block-size: 100dvh;
      padding: var(--np-space-6) var(--np-space-5);
      background: var(--fondo);
      color: var(--texto);
      font-family: var(--palo);
      text-align: center;
    }
    /*
      Con foto, la portada cambia de reglas: texto claro sobre la imagen, y un
      velo por encima. El velo no es estética, es legibilidad — una foto de
      playa a mediodía deja unos nombres blancos invisibles, y eso no lo puede
      saber el código. El fondo se queda en scroll a propósito: fijarlo va a
      tirones en iOS, que es medio público de la boda.
    */
    .clasica--con-foto {
      position: relative;
      background-image: linear-gradient(rgb(0 0 0 / 45%), rgb(0 0 0 / 55%)), var(--foto);
      background-position: center;
      background-size: cover;
      color: #ffffff;
    }
    .clasica--con-foto .clasica__antetitulo,
    .clasica--con-foto .clasica__fecha,
    .clasica--con-foto .clasica__unidad {
      color: rgb(255 255 255 / 85%);
    }
    .clasica--con-foto .clasica__casilla {
      border-color: rgb(255 255 255 / 35%);
      background: rgb(255 255 255 / 12%);
    }
    .clasica__texto {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--np-space-5);
    }
    .clasica__antetitulo {
      display: flex;
      align-items: center;
      gap: var(--np-space-2);
      margin: 0;
      font-size: var(--np-text-xs);
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: color-mix(in srgb, var(--texto) 65%, transparent);
    }
    .clasica__antetitulo np-icon {
      color: var(--acento);
      --np-icon-size: 1em;
    }
    .clasica__nombres {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-1);
      margin: 0;
      font-family: var(--serifa);
      font-size: clamp(3rem, 2rem + 7vw, 6rem);
      font-weight: 400;
      line-height: 0.95;
      text-wrap: balance;
    }
    .clasica__amperson {
      font-style: italic;
      color: var(--acento);
    }
    .clasica__fecha {
      display: flex;
      align-items: center;
      gap: var(--np-space-2);
      margin: 0;
      font-size: var(--np-text-lg);
      color: color-mix(in srgb, var(--texto) 70%, transparent);
    }
    .clasica__fecha np-icon {
      --np-icon-size: 1.1em;
    }
    .clasica__cuenta {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: var(--np-space-3);
    }
    .clasica__casilla {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--np-space-1);
      min-inline-size: 5.5rem;
      padding: var(--np-space-3) var(--np-space-4);
      border: 1px solid var(--borde);
      border-radius: var(--np-radius-lg);
      background: var(--superficie);
    }
    .clasica__numero {
      font-family: var(--serifa);
      font-size: var(--np-text-2xl);
      line-height: 1;
    }
    .clasica__unidad {
      font-size: var(--np-text-xs);
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: color-mix(in srgb, var(--texto) 60%, transparent);
    }
    /* Primero móvil: una columna con aire, y el ancho se limita en ch para que
       la línea no pase de unos 70 caracteres en pantallas grandes. */
    .clasica__seccion {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-4);
      max-inline-size: 62ch;
      margin-inline: auto;
      padding: var(--np-space-6) var(--np-space-5);
      background: var(--fondo);
      color: var(--texto);
      font-family: var(--palo);
    }
    .clasica__titulo {
      margin: 0;
      font-family: var(--serifa);
      font-size: var(--np-text-2xl);
      font-weight: 500;
      text-align: center;
      text-wrap: balance;
    }
    /* El color y poco más: las reglas del texto enriquecido son globales
       (design-system/components/rich-text.scss), porque son las mismas para
       todas las plantillas y aquí hay 4 kB de presupuesto por componente. */
    .clasica__rico {
      color: color-mix(in srgb, var(--texto) 85%, transparent);
    }
    .clasica__parrafo {
      margin: 0;
      white-space: pre-line;
      line-height: 1.7;
      color: color-mix(in srgb, var(--texto) 85%, transparent);
    }
    .clasica__evento {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-3);
      margin: 0;
      padding: var(--np-space-4);
      border: 1px solid var(--borde);
      border-radius: var(--np-radius-lg);
      background: var(--superficie);
    }
    .clasica__evento dt {
      display: flex;
      align-items: center;
      gap: var(--np-space-2);
      font-size: var(--np-text-xs);
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: color-mix(in srgb, var(--texto) 60%, transparent);
    }
    .clasica__evento dt np-icon {
      color: var(--acento);
      --np-icon-size: 1em;
    }
    .clasica__evento dd {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-1);
      margin: var(--np-space-1) 0 0;
    }
    .clasica__direccion {
      font-size: var(--np-text-sm);
      color: color-mix(in srgb, var(--texto) 65%, transparent);
    }
  `,
})
export class PlantillaClasica {
  /** La portada no pinta el título si la boda todavía no tiene nombres. */
  protected readonly hayNombres = computed(() => hayNombres(this.datos().nombres));
  protected readonly losDos = computed(() => losDosNombres(this.datos().nombres));
  protected readonly unNombre = computed(() => elNombreQueHaya(this.datos().nombres));
  readonly datos = input.required<DatosPortada>();

  /**
   * Se calcula una vez al montar, no con un temporizador.
   *
   * Un contador que baja cada segundo obliga a repintar la portada sin parar y
   * no aporta nada: nadie se queda mirando cuántos minutos faltan para una boda
   * que es dentro de nueve meses.
   */
  protected readonly faltan = computed(() => cuentaAtras(this.datos(), new Date()));

  /** La foto, lista para meter en `background-image`. */
  protected readonly foto = computed(() => {
    const url = this.datos().heroImageUrl;
    // Las comillas y los paréntesis se escapan: la URL viene de Storage, pero
    // una URL con `)` cerraría el `url()` y dejaría CSS colgando.
    return url ? `url("${url.replace(/["\\)]/g, encodeURIComponent)}")` : null;
  });

  protected readonly secciones = computed(() => seccionesVisibles(this.datos()));

  protected readonly fecha = computed(() =>
    fechaLarga(this.datos().weddingDate, this.datos().locale),
  );
}
