import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';

import { NpAlert } from '../../../design-system/components/alert/alert';
import { NpButton } from '../../../design-system/components/button/button';
import { NpEmptyState } from '../../../design-system/components/empty-state/empty-state';
import { NpModal } from '../../../design-system/components/modal/modal';
import { NpStatusChip } from '../../../design-system/components/status-chip/status-chip';
import { NpIcon } from '../../../design-system/icons/icon';
import type { FalloQuizPanel, PreguntaDelPanel } from '../../../core/quiz/quiz-admin-gateway';
import {
  MAX_OPCION,
  MAX_PISTA,
  MAX_PREGUNTAS_BANCO,
  MAX_TEXTO,
  MIN_POR_PARTIDA,
  PUNTOS,
  type Dificultad,
} from '../../public-site/quiz/quiz';
import { PreguntasQuizStore } from './preguntas-quiz.store';

/**
 * El banco de preguntas del quiz (§8.7).
 *
 * Tres cosas que esta pantalla tiene que hacer bien:
 *
 * 1. **Decir cuántas se pueden jugar**, que no es lo mismo que cuántas hay. El
 *    servidor solo pregunta las que están **enteras** —enunciado, correcta y
 *    tres falsas distintas—; una pregunta a medio escribir no se juega y aquí
 *    es donde se arregla.
 * 2. **Avisar si no llegan para una partida.** Con menos de tres, el juego no
 *    arranca y el invitado solo ve un mensaje.
 * 3. **No tratar la respuesta correcta como un secreto en esta pantalla.** Lo
 *    es para el invitado, no para la pareja: aquí se ve y se edita como un
 *    campo más, marcada con color, icono y texto (§9.1).
 */
@Component({
  selector: 'np-panel-preguntas-quiz',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    TranslocoDirective,
    NpAlert,
    NpButton,
    NpEmptyState,
    NpModal,
    NpStatusChip,
    NpIcon,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <section class="qp">
        <header class="qp__intro">
          <div>
            <h2>{{ t('panel.quiz.titulo') }}</h2>
            <p>{{ t('panel.quiz.ayuda') }}</p>
          </div>
          <div class="qp__acciones">
            <a npButton variant="ghost" size="sm" routerLink="/panel/quiz/ranking">
              <np-icon name="trophy" />
              {{ t('panel.quiz.verRanking') }}
            </a>
            <button npButton type="button" [disabled]="lleno()" (click)="nueva()">
              <np-icon name="plus" />
              {{ t('panel.quiz.anadir') }}
            </button>
          </div>
        </header>

        @if (store.fallo(); as fallo) {
          <np-alert status="declined" [heading]="t('panel.quiz.errorGuardar')">
            <p>{{ textoDelFallo(fallo, t) }}</p>
          </np-alert>
        }

        @if (avisos().length > 0) {
          <np-alert status="attention" [heading]="t('panel.quiz.avisos')">
            <ul class="qp__avisos">
              @for (aviso of avisos(); track aviso) {
                <li>{{ aviso }}</li>
              }
            </ul>
          </np-alert>
        }

        @switch (store.estado()) {
          @case ('cargando') {
            <np-empty-state icon="game-controller" [title]="t('panel.quiz.cargando')" />
          }
          @default {
            @if (store.preguntas().length === 0) {
              <np-empty-state
                icon="game-controller"
                [title]="t('panel.quiz.ninguna')"
                [description]="t('panel.quiz.ningunaDescripcion')"
              />
            } @else {
              <p class="qp__cuenta">
                {{
                  t('panel.quiz.jugables', {
                    jugables: store.jugables().length,
                    total: store.preguntas().length,
                  })
                }}
              </p>

              <ul class="qp__lista">
                @for (pregunta of store.preguntas(); track pregunta.id) {
                  <li class="qp__ficha">
                    <p class="qp__texto">
                      <span class="qp__estrellas" [attr.aria-label]="dificultad(pregunta, t)">
                        @for (estrella of estrellas(pregunta.difficulty); track estrella) {
                          <np-icon name="star" weight="fill" />
                        }
                      </span>
                      <strong>{{ pregunta.text || t('panel.quiz.sinEnunciado') }}</strong>
                      <small>{{ t('panel.quiz.vale', { puntos: puntos(pregunta) }) }}</small>
                    </p>

                    <p class="qp__opciones">
                      <span class="qp__buena">
                        <np-icon name="check-circle" />
                        {{ pregunta.correctAnswer || t('panel.quiz.sinCorrecta') }}
                      </span>
                      @for (falsa of pregunta.wrongAnswers; track $index) {
                        @if (falsa) {
                          <span class="qp__falsa">{{ falsa }}</span>
                        }
                      }
                    </p>

                    @if (!entera(pregunta)) {
                      <span class="qp__estados">
                        <np-status-chip status="declined" [label]="t('panel.quiz.aMedias')" />
                      </span>
                    }

                    <div class="qp__botones">
                      <button
                        npButton
                        size="sm"
                        variant="ghost"
                        type="button"
                        (click)="editar(pregunta)"
                      >
                        <np-icon name="pencil-simple" />
                        {{ t('common.edit') }}
                      </button>
                      <button
                        npButton
                        size="sm"
                        variant="ghost"
                        type="button"
                        (click)="duplicar(pregunta)"
                      >
                        <np-icon name="copy" />
                        {{ t('panel.quiz.duplicar') }}
                      </button>
                      <button
                        npButton
                        size="sm"
                        variant="ghost"
                        type="button"
                        (click)="borrando.set(pregunta)"
                      >
                        <np-icon name="trash" />
                        {{ t('common.delete') }}
                      </button>
                    </div>
                  </li>
                }
              </ul>
            }
          }
        }

        @if (editando(); as cual) {
          <np-modal
            [open]="true"
            [heading]="cual === 'nueva' ? t('panel.quiz.nueva') : t('panel.quiz.editar')"
            (closed)="editando.set(null)"
          >
            <form class="qp__form" [formGroup]="formulario" (submit)="enviar($event)">
              <label>
                {{ t('panel.quiz.campo.enunciado') }}
                <textarea formControlName="text" rows="2" [attr.maxlength]="maximoTexto"></textarea>
              </label>

              <!--
                La correcta separada de las falsas y marcada: aquí la pareja
                tiene que verla de un golpe, porque equivocarse de casilla
                convierte la pregunta en una trampa.
              -->
              <label class="qp__correcta">
                <span>
                  <np-icon name="check-circle" />
                  {{ t('panel.quiz.campo.correcta') }}
                </span>
                <input formControlName="correctAnswer" [attr.maxlength]="maximoOpcion" />
              </label>

              @for (campo of camposFalsos; track campo) {
                <label>
                  {{ t('panel.quiz.campo.falsa', { n: $index + 1 }) }}
                  <input [formControlName]="campo" [attr.maxlength]="maximoOpcion" />
                </label>
              }

              <label>
                {{ t('panel.quiz.campo.dificultad') }}
                <select formControlName="difficulty">
                  @for (nivel of niveles; track nivel) {
                    <option [value]="nivel">
                      {{ t('panel.quiz.nivel.' + nivel) }} · {{ puntosDe(nivel) }}
                    </option>
                  }
                </select>
              </label>

              <label>
                {{ t('panel.quiz.campo.pista') }}
                <input formControlName="hint" [attr.maxlength]="maximoPista" />
                <small>{{ t('panel.quiz.campo.pistaAyuda') }}</small>
              </label>
            </form>

            <div np-modal-actions>
              <button npButton variant="ghost" type="button" (click)="editando.set(null)">
                {{ t('common.cancel') }}
              </button>
              <button
                npButton
                type="button"
                [loading]="guardando()"
                [disabled]="formulario.invalid"
                (click)="guardar()"
              >
                {{ t('common.save') }}
              </button>
            </div>
          </np-modal>
        }

        @if (borrando(); as cual) {
          <np-modal [open]="true" [heading]="t('common.delete')" (closed)="borrando.set(null)">
            <p>{{ t('panel.quiz.confirmarBorrado', { texto: cual.text }) }}</p>

            <div np-modal-actions>
              <button npButton variant="ghost" type="button" (click)="borrando.set(null)">
                {{ t('common.cancel') }}
              </button>
              <button
                npButton
                variant="danger"
                type="button"
                [loading]="borrandoYa()"
                (click)="borrar()"
              >
                <np-icon name="trash" />
                {{ t('common.delete') }}
              </button>
            </div>
          </np-modal>
        }
      </section>
    </ng-container>
  `,
  styles: `
    .qp__intro {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-3);
      margin-block-end: var(--np-space-4);
    }
    .qp__intro h2 {
      margin: 0;
      font-size: var(--np-text-xl);
      font-weight: var(--np-weight-semibold);
    }
    .qp__intro p {
      margin: var(--np-space-1) 0 0;
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-sm);
    }
    .qp__acciones {
      display: flex;
      flex-wrap: wrap;
      gap: var(--np-space-2);
    }
    @media (min-width: 48rem) {
      .qp__intro {
        flex-direction: row;
        align-items: flex-start;
        justify-content: space-between;
      }
    }
    .qp__avisos {
      margin: var(--np-space-1) 0 0;
      padding-inline-start: 1.1em;
    }
    .qp__cuenta {
      margin: var(--np-space-3) 0 0;
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-sm);
    }
    .qp__lista {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-2);
      margin: var(--np-space-2) 0 0;
      padding: 0;
      list-style: none;
    }
    .qp__ficha {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-2);
      padding: var(--np-space-3);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-md);
      background: var(--np-surface-surface);
    }
    .qp__texto {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--np-space-2);
      margin: 0;
    }
    .qp__texto small {
      color: var(--np-surface-text-muted);
    }
    .qp__estrellas {
      display: inline-flex;
      flex: none;
      color: var(--np-attention-fg);
    }
    .qp__opciones {
      display: flex;
      flex-wrap: wrap;
      gap: var(--np-space-1) var(--np-space-3);
      margin: 0;
      font-size: var(--np-text-sm);
    }
    /* La correcta, con icono y color: en esta pantalla no es un secreto, es
       justo lo que hay que poder comprobar de un vistazo. */
    .qp__buena {
      display: inline-flex;
      align-items: center;
      gap: var(--np-space-1);
      color: var(--np-confirmed-fg);
      font-weight: var(--np-weight-medium);
    }
    .qp__falsa {
      color: var(--np-surface-text-muted);
    }
    .qp__estados,
    .qp__botones {
      display: flex;
      flex-wrap: wrap;
      gap: var(--np-space-2);
    }
    .qp__botones {
      gap: var(--np-space-1);
    }
    .qp__form {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-3);
    }
    .qp__form label {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-1);
      font-size: var(--np-text-sm);
    }
    .qp__correcta > span {
      display: flex;
      align-items: center;
      gap: var(--np-space-1);
      color: var(--np-confirmed-fg);
      font-weight: var(--np-weight-medium);
    }
    .qp__form small {
      color: var(--np-surface-text-muted);
    }
  `,
})
export class PanelPreguntasQuiz {
  protected readonly store = inject(PreguntasQuizStore);
  private readonly fb = inject(FormBuilder);

  protected readonly niveles: readonly Dificultad[] = [1, 2, 3];
  protected readonly camposFalsos = ['falsa1', 'falsa2', 'falsa3'] as const;
  protected readonly maximoTexto = MAX_TEXTO;
  protected readonly maximoOpcion = MAX_OPCION;
  protected readonly maximoPista = MAX_PISTA;

  protected readonly editando = signal<PreguntaDelPanel | 'nueva' | null>(null);
  protected readonly borrando = signal<PreguntaDelPanel | null>(null);
  protected readonly guardando = signal(false);
  protected readonly borrandoYa = signal(false);

  protected readonly lleno = computed(() => this.store.preguntas().length >= MAX_PREGUNTAS_BANCO);

  protected readonly formulario = this.fb.nonNullable.group({
    text: ['', Validators.required],
    correctAnswer: ['', Validators.required],
    falsa1: ['', Validators.required],
    falsa2: ['', Validators.required],
    falsa3: ['', Validators.required],
    difficulty: [1 as Dificultad],
    hint: [''],
  });

  /**
   * Lo que la pareja no puede ver contando fichas.
   *
   * El primero es el que de verdad rompe el juego: sin preguntas jugables
   * suficientes, el invitado toca «Jugar» y se encuentra un mensaje.
   */
  protected readonly avisos = computed(() => {
    const avisos: string[] = [];
    const jugables = this.store.jugables().length;
    const aMedias = this.store.aMedias().length;

    if (this.store.preguntas().length > 0 && jugables < MIN_POR_PARTIDA) {
      avisos.push(
        `Con ${jugables} ${jugables === 1 ? 'pregunta' : 'preguntas'} listas no se puede jugar: hacen falta al menos ${MIN_POR_PARTIDA}.`,
      );
    }

    if (aMedias > 0) {
      avisos.push(
        `Hay ${aMedias} a medio escribir. Una pregunta solo se juega con su enunciado, la correcta y tres falsas distintas.`,
      );
    }

    return avisos;
  });

  constructor() {
    void this.store.cargar();
  }

  protected entera(pregunta: PreguntaDelPanel): boolean {
    return !this.store.aMedias().some((otra) => otra.id === pregunta.id);
  }

  protected puntos(pregunta: PreguntaDelPanel): number {
    return PUNTOS[pregunta.difficulty];
  }

  protected puntosDe(nivel: Dificultad): number {
    return PUNTOS[nivel];
  }

  protected estrellas(dificultad: number): readonly number[] {
    return Array.from({ length: dificultad }, (_, n) => n);
  }

  protected dificultad(pregunta: PreguntaDelPanel, t: (clave: string) => string): string {
    return t('panel.quiz.nivel.' + pregunta.difficulty);
  }

  protected nueva(): void {
    this.rellenar(null);
    this.editando.set('nueva');
  }

  protected editar(pregunta: PreguntaDelPanel): void {
    this.rellenar(pregunta);
    this.editando.set(pregunta);
  }

  /**
   * Duplicar: el atajo de §8.7 para montar un banco deprisa.
   *
   * Se abre como **nueva** con lo de la otra dentro, porque lo normal es
   * cambiar una palabra del enunciado y las falsas, no empezar de cero.
   */
  protected duplicar(pregunta: PreguntaDelPanel): void {
    this.rellenar(pregunta);
    this.editando.set('nueva');
  }

  private rellenar(pregunta: PreguntaDelPanel | null): void {
    this.formulario.reset({
      text: pregunta?.text ?? '',
      correctAnswer: pregunta?.correctAnswer ?? '',
      falsa1: pregunta?.wrongAnswers[0] ?? '',
      falsa2: pregunta?.wrongAnswers[1] ?? '',
      falsa3: pregunta?.wrongAnswers[2] ?? '',
      difficulty: pregunta?.difficulty ?? 1,
      hint: pregunta?.hint ?? '',
    });
  }

  protected enviar(evento: Event): void {
    evento.preventDefault();
    void this.guardar();
  }

  protected async guardar(): Promise<void> {
    const cual = this.editando();
    if (!cual || this.formulario.invalid || this.guardando()) return;

    const valores = this.formulario.getRawValue();
    const nueva = cual === 'nueva';
    this.guardando.set(true);

    const resultado = await this.store.guardar({
      id: nueva ? undefined : cual.id,
      text: valores.text.trim(),
      correctAnswer: valores.correctAnswer.trim(),
      wrongAnswers: [valores.falsa1.trim(), valores.falsa2.trim(), valores.falsa3.trim()],
      difficulty: Number(valores.difficulty) as Dificultad,
      hint: valores.hint.trim() === '' ? null : valores.hint.trim(),
      // Todas las preguntas del banco se preguntan: apagarlas sueltas no hacía
      // falta y era un interruptor más que explicar. Se borran o se dejan.
      enabled: true,
      order: nueva ? this.store.preguntas().length + 1 : cual.order,
    });

    this.guardando.set(false);
    if (resultado.ok) this.editando.set(null);
  }

  protected async borrar(): Promise<void> {
    const cual = this.borrando();
    if (!cual || this.borrandoYa()) return;

    this.borrandoYa.set(true);
    const resultado = await this.store.borrar(cual.id);
    this.borrandoYa.set(false);
    if (resultado.ok) this.borrando.set(null);
  }

  protected textoDelFallo(fallo: FalloQuizPanel, t: (clave: string) => string): string {
    switch (fallo.tipo) {
      case 'sin-permiso':
      case 'red':
        return t(`panel.quiz.fallo.${fallo.tipo}`);
      default:
        return t('panel.quiz.fallo.desconocido');
    }
  }
}
