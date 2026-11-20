import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  type Signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';

import { NpIcon } from '../../../design-system/icons/icon';
import {
  PUERTA_QUIZ,
  type FalloQuiz,
  type PartidaNueva,
  type PartidaTerminada,
} from '../../../core/quiz/quiz-gateway';
import type { FilaRanking } from './quiz';

type Fase = 'portada' | 'cargando' | 'jugando' | 'entregando' | 'final';

/**
 * El quiz, como lo juega el invitado (§8.7).
 *
 * Se juega con una mano, de pie y con el móvil: por eso **una pregunta por
 * pantalla**, opciones grandes y nada que requiera apuntar. Al tocar una
 * opción se avanza solo, sin botón de «siguiente» y sin volver atrás, que es
 * lo que hace que la partida tenga ritmo.
 *
 * **No se dice si se ha acertado hasta el final**, y no es una decisión de
 * diseño sino la consecuencia de la regla de oro 4: la respuesta correcta no
 * está en el navegador, la tiene el servidor. A cambio, al entregar llegan
 * todas las correcciones de golpe, que es el momento de «¡esa me la sabía!» y
 * lo que hace que se vuelva a jugar. Se puede jugar sin límite (`D-11`).
 *
 * Los colores salen de la paleta de la pareja (`--np-marca-*`) con la reserva
 * de la plantilla detrás: el juego tiene que parecer de **esta** boda.
 */
@Component({
  selector: 'np-quiz-publico',
  imports: [RouterLink, TranslocoDirective, NpIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <div class="qz">
        <!--
          La vuelta a la web de la boda: a esta página se llega por un enlace
          suelto, y sin esto el invitado se queda dentro del juego.
        -->
        <a class="qz__volver" routerLink="/">
          <np-icon name="caret-left" />
          {{ t('publico.quiz.volver') }}
        </a>

        @switch (fase()) {
          @case ('portada') {
            <div class="qz__portada">
              <p class="qz__intro">{{ t('publico.quiz.intro') }}</p>
              @if (fallo(); as cual) {
                <p class="qz__fallo">
                  <np-icon name="warning" />
                  {{ t('publico.quiz.fallo.' + cual.tipo) }}
                </p>
              }
              <button type="button" class="qz__boton" (click)="empezar()">
                <np-icon name="confetti" />
                {{ t('publico.quiz.jugar') }}
              </button>
            </div>
          }

          @case ('cargando') {
            <p class="qz__intro">{{ t('publico.quiz.preparando') }}</p>
          }

          @case ('jugando') {
            @if (actual(); as pregunta) {
              <div class="qz__juego">
                <!--
                  El progreso, con número y barra. La barra sola no dice
                  cuántas quedan y el número solo no se ve de un vistazo.
                -->
                <p class="qz__progreso">
                  <span>{{ t('publico.quiz.progreso', { n: indice() + 1, total: total() }) }}</span>
                  <span
                    class="qz__estrellas"
                    [attr.aria-label]="t('publico.quiz.vale', { puntos: pregunta.puntos })"
                  >
                    @for (estrella of estrellas(pregunta.difficulty); track $index) {
                      <np-icon name="star" weight="fill" />
                    }
                  </span>
                </p>
                <div class="qz__barra">
                  <span [style.inline-size.%]="avance()"></span>
                </div>

                <h3 class="qz__pregunta">{{ pregunta.text }}</h3>

                <ul class="qz__opciones">
                  @for (opcion of pregunta.opciones; track opcion) {
                    <li>
                      <button type="button" class="qz__opcion" (click)="responder(opcion)">
                        {{ opcion }}
                      </button>
                    </li>
                  }
                </ul>

                <!--
                  La pista **cuesta la mitad de los puntos de esta pregunta** y
                  se avisa antes de darla. El texto no viaja con la pregunta: se
                  pide al servidor al aceptar, que es quien apunta el descuento.
                -->
                @if (pregunta.tienePista) {
                  @if (pistaDe(pregunta.id); as pista) {
                    <p class="qz__pista">
                      <np-icon name="info" />
                      {{ pista }}
                    </p>
                  } @else if (confirmandoPista()) {
                    <div class="qz__aviso" role="alert">
                      <p>
                        {{
                          t('publico.quiz.pistaAviso', {
                            puntos: pregunta.puntos,
                            mitad: pregunta.puntos / 2,
                          })
                        }}
                      </p>
                      <div class="qz__avisoBotones">
                        <button type="button" class="qz__verPista" (click)="pedirPista()">
                          {{ t('publico.quiz.pistaSi') }}
                        </button>
                        <button
                          type="button"
                          class="qz__verPista"
                          (click)="confirmandoPista.set(false)"
                        >
                          {{ t('publico.quiz.pistaNo') }}
                        </button>
                      </div>
                    </div>
                  } @else {
                    <button type="button" class="qz__verPista" (click)="confirmandoPista.set(true)">
                      <np-icon name="info" />
                      {{ t('publico.quiz.pista', { mitad: pregunta.puntos / 2 }) }}
                    </button>
                  }
                }
              </div>
            }
          }

          @case ('entregando') {
            <p class="qz__intro">{{ t('publico.quiz.corrigiendo') }}</p>
          }

          @case ('final') {
            @if (resultado(); as fin) {
              <div class="qz__final">
                <p class="qz__puntos">
                  <np-icon name="trophy" weight="fill" />
                  <strong>{{ t('publico.quiz.puntos', { puntos: fin.points }) }}</strong>
                </p>
                @if (fin.puesto !== null) {
                  <p class="qz__puesto">{{ t('publico.quiz.puesto', { puesto: fin.puesto }) }}</p>
                }

                <button type="button" class="qz__boton" (click)="empezar()">
                  <np-icon name="confetti" />
                  {{ t('publico.quiz.otraVez') }}
                </button>

                @if (fin.ranking.length > 0) {
                  <section class="qz__ranking">
                    <h3>{{ t('publico.quiz.ranking') }}</h3>
                    <ol>
                      <!--
                        La fila propia la marca el servidor, no se adivina aquí
                        comparando puestos: dos empatados comparten número y se
                        habrían destacado los dos.
                      -->
                      @for (puesto of fin.ranking; track puesto.id) {
                        <li [class.qz__yo]="puesto.esMio">
                          <span class="qz__puestoN">{{ puesto.puesto }}</span>
                          <span class="qz__quien">
                            {{ puesto.displayName }}
                            @if (puesto.esMio) {
                              <small>{{ t('publico.quiz.tu') }}</small>
                            }
                          </span>
                          <span class="qz__suyos">
                            {{ t('publico.quiz.puntos', { puntos: puesto.points }) }}
                          </span>
                        </li>
                      }
                    </ol>

                    <!--
                      Lo que no entra en el ranking no se guarda (D-11), así
                      que aquí no hay «tu mejor partida» que enseñar: o estás
                      en la tabla, o se te dice que esta vez no.
                    -->
                    @if (!enLaTabla(fin)) {
                      <p class="qz__mio">
                        <np-icon name="trophy" />
                        {{ t('publico.quiz.fuera', { puntos: fin.points }) }}
                      </p>
                    }
                  </section>
                }
              </div>
            }
          }
        }
      </div>
    </ng-container>
  `,
  styles: `
    /* Esta pantalla **es** una página entera, no una sección dentro de otra:
       se llega a ella por su propia URL desde un enlace de WhatsApp. Por eso
       el margen lateral lo pone ella, y sin él el ranking se comía el borde
       derecho en un móvil de 360 px. */
    :host {
      display: block;
      max-inline-size: 36rem;
      margin-inline: auto;
      padding: 1.25rem 1rem 3rem;
      --qz-acento: var(--np-marca-accent, #e54d69);
      --qz-superficie: var(--np-marca-surface, #fff);
      --qz-texto: var(--np-marca-text, inherit);
    }
    .qz__volver {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      margin-block-end: 1rem;
      color: inherit;
      font-size: 0.9rem;
      text-decoration: none;
      opacity: 0.75;
    }
    .qz__intro,
    .qz__fallo {
      margin: 0 0 1rem;
    }
    .qz__fallo {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      font-weight: 600;
    }
    /* El botón principal ocupa el ancho en el móvil: se pulsa con el pulgar y
       sin mirar. */
    .qz__boton {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      inline-size: 100%;
      min-block-size: 3rem;
      padding: 0 1.25rem;
      border: 0;
      border-radius: 999px;
      background: var(--qz-acento);
      color: #fff;
      font: inherit;
      font-weight: 600;
      cursor: pointer;
    }
    .qz__progreso {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin: 0 0 0.5rem;
      font-size: 0.85rem;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      opacity: 0.8;
    }
    .qz__estrellas {
      display: inline-flex;
      gap: 0.1rem;
      color: var(--qz-acento);
    }
    .qz__barra {
      block-size: 4px;
      margin-block-end: 1.5rem;
      border-radius: 999px;
      background: color-mix(in srgb, currentColor 15%, transparent);
    }
    .qz__barra span {
      display: block;
      block-size: 100%;
      border-radius: 999px;
      background: var(--qz-acento);
      transition: inline-size 240ms ease;
    }
    .qz__pregunta {
      margin: 0 0 1.25rem;
      font-size: 1.35rem;
      line-height: 1.3;
    }
    .qz__opciones {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    /* Cada opción es un área de toque entera, no un texto con un radio al
       lado: con el móvil en una mano, fallar el objetivo arruina la partida. */
    .qz__opcion {
      inline-size: 100%;
      min-block-size: 3.25rem;
      padding: 0.75rem 1rem;
      border: 1px solid color-mix(in srgb, currentColor 25%, transparent);
      border-radius: 0.75rem;
      background: var(--qz-superficie);
      color: inherit;
      font: inherit;
      text-align: start;
      cursor: pointer;
    }
    .qz__opcion:hover,
    .qz__opcion:focus-visible {
      border-color: var(--qz-acento);
    }
    .qz__verPista,
    .qz__pista {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      margin: 1rem 0 0;
      padding: 0;
      border: 0;
      background: none;
      color: inherit;
      font: inherit;
      font-size: 0.9rem;
      opacity: 0.85;
      cursor: pointer;
    }
    .qz__final {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .qz__puntos {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      margin: 0;
      color: var(--qz-acento);
      font-size: 1.6rem;
    }
    .qz__puesto {
      margin: 0;
      text-align: center;
    }
    .qz__aviso {
      margin: 1rem 0 0;
      padding: 0.75rem 1rem;
      border: 1px solid currentColor;
      border-radius: 0.75rem;
      font-size: 0.9rem;
    }
    .qz__aviso p {
      margin: 0 0 0.5rem;
    }
    .qz__avisoBotones {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem 1.25rem;
    }
    .qz__ranking h3 {
      margin: 1.5rem 0 0.75rem;
      font-size: 1rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    .qz__ranking ol {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .qz__ranking li {
      display: grid;
      grid-template-columns: 2rem 1fr auto;
      gap: 0.75rem;
      align-items: baseline;
    }
    .qz__mio {
      display: flex;
      /* Arriba y no centrado: en un móvil la frase se parte en dos líneas y el
         icono se quedaba flotando en medio. */
      align-items: flex-start;
      gap: 0.5rem;
      margin: 0.75rem 0 0;
      padding-block-start: 0.75rem;
      border-block-start: 1px solid currentColor;
      font-weight: 600;
      opacity: 0.9;
    }
    .qz__mio np-icon {
      flex: none;
      margin-block-start: 0.15em;
    }
    .qz__puestoN {
      font-variant-numeric: tabular-nums;
      opacity: 0.6;
      text-align: end;
    }
    /* La fila propia, con el acento de la pareja: el juego tiene que parecer
       de **esta** boda. El color no viaja solo —al lado va la palabra «tú»—,
       porque un color por sí mismo no informa a quien no lo distingue. */
    .qz__yo {
      color: var(--qz-acento);
      font-weight: 700;
    }
    .qz__quien small {
      margin-inline-start: 0.4rem;
      font-weight: 400;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      opacity: 0.8;
    }
    .qz__suyos {
      font-variant-numeric: tabular-nums;
    }
  `,
})
export class NpQuizPublico {
  private readonly puerta = inject(PUERTA_QUIZ);

  protected readonly fase = signal<Fase>('portada');
  protected readonly fallo = signal<FalloQuiz | null>(null);
  protected readonly resultado = signal<PartidaTerminada | null>(null);
  /** Está viendo el aviso «la pista cuesta la mitad». */
  protected readonly confirmandoPista = signal(false);
  /** Las pistas ya pedidas en esta partida, por pregunta. */
  private readonly pistas = signal<Record<string, string>>({});

  private readonly partida = signal<PartidaNueva | null>(null);
  protected readonly indice = signal(0);
  private readonly respuestas = signal<Record<string, string>>({});

  protected readonly total: Signal<number> = computed(() => this.partida()?.preguntas.length ?? 0);

  protected readonly actual = computed(() => this.partida()?.preguntas[this.indice()] ?? null);

  protected readonly avance = computed(() => {
    const total = this.total();
    return total === 0 ? 0 : Math.round((this.indice() / total) * 100);
  });

  /** Una, dos o tres estrellas. Es la dificultad, que se ve antes de leer. */
  protected estrellas(dificultad: number): readonly number[] {
    return Array.from({ length: dificultad }, (_, n) => n);
  }

  protected async empezar(): Promise<void> {
    this.fase.set('cargando');
    this.fallo.set(null);
    this.resultado.set(null);
    this.respuestas.set({});
    this.indice.set(0);
    this.confirmandoPista.set(false);
    this.pistas.set({});

    const resultado = await this.puerta.empezar();

    if (!resultado.ok) {
      this.fallo.set(resultado.fallo);
      this.fase.set('portada');
      return;
    }

    this.partida.set(resultado.partida);
    this.fase.set('jugando');
  }

  /**
   * Contesta y avanza.
   *
   * Sin confirmar y sin volver atrás: el prototipo ya era así y es lo que hace
   * que una partida de diez preguntas dure dos minutos y no diez.
   */
  protected async responder(opcion: string): Promise<void> {
    const pregunta = this.actual();
    if (!pregunta) return;

    this.respuestas.update((previas) => ({ ...previas, [pregunta.id]: opcion }));
    this.confirmandoPista.set(false);

    if (this.indice() + 1 < this.total()) {
      this.indice.update((n) => n + 1);
      return;
    }

    await this.entregar();
  }

  private async entregar(): Promise<void> {
    const partida = this.partida();
    if (!partida) return;

    this.fase.set('entregando');
    const resultado = await this.puerta.entregar(partida.gameId, this.respuestas());

    if (!resultado.ok) {
      this.fallo.set(resultado.fallo);
      this.fase.set('portada');
      return;
    }

    this.resultado.set(resultado.resultado);
    this.fase.set('final');
  }

  /**
   * Si ha entrado en el ranking.
   *
   * Con veinte puestos y una boda de ciento veinte, quedarse fuera es el caso
   * normal, no la excepción, y por eso se dice con naturalidad.
   */
  protected enLaTabla(fin: PartidaTerminada): boolean {
    return fin.ranking.some((puesto) => puesto.esMio);
  }

  protected pistaDe(preguntaId: string): string | null {
    return this.pistas()[preguntaId] ?? null;
  }

  /**
   * Acepta el precio y pide la pista. El servidor apunta que se ha pedido
   * (lo que decide la puntuación) y devuelve el texto.
   */
  protected async pedirPista(): Promise<void> {
    const partida = this.partida();
    const pregunta = this.actual();
    if (!partida || !pregunta) return;

    const resultado = await this.puerta.pedirPista(partida.gameId, pregunta.id);
    this.confirmandoPista.set(false);

    if (!resultado.ok) {
      this.fallo.set(resultado.fallo);
      return;
    }

    this.pistas.update((previas) => ({ ...previas, [pregunta.id]: resultado.pista }));
  }

  protected rankingDe(fin: PartidaTerminada): readonly FilaRanking[] {
    return fin.ranking;
  }
}
