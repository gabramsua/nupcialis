import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';

import { NpAlert } from '../../../design-system/components/alert/alert';
import { NpButton } from '../../../design-system/components/button/button';
import { NpEmptyState } from '../../../design-system/components/empty-state/empty-state';
import { NpModal } from '../../../design-system/components/modal/modal';
import { NpIcon } from '../../../design-system/icons/icon';
import type { FalloQuizPanel, JugadorDelQuiz } from '../../../core/quiz/quiz-admin-gateway';
import { RankingQuizStore } from './ranking-quiz.store';

/**
 * Quién ha jugado al quiz (§8.7).
 *
 * **Es la única pantalla del producto donde el teléfono sale al lado del
 * nombre en una tabla de ranking**, y es a propósito: la ve la pareja con su
 * sesión, y es lo que le permite saber cuál de los tres «Pepe» de su lista es
 * el que va primero. En la web pública solo viaja el nombre, porque allí esos
 * cuatro dígitos serían media credencial del modo B (`D-11`, regla de oro 3).
 *
 * Y es **el ranking, no la lista de invitados**: lo que no entra en los veinte
 * mejores no se guarda (`D-11`), así que aquí no hay filas con cero puntos. Una
 * tabla llena de ceros no es información, es ruido con nombres y teléfonos
 * dentro.
 */
@Component({
  selector: 'np-panel-ranking-quiz',
  imports: [RouterLink, TranslocoDirective, NpAlert, NpButton, NpEmptyState, NpModal, NpIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <section class="qr">
        <header class="qr__intro">
          <div>
            <h2>{{ t('panel.quizRanking.titulo') }}</h2>
            <p>{{ t('panel.quizRanking.ayuda') }}</p>
          </div>
          <a npButton variant="ghost" size="sm" routerLink="/panel/quiz">
            <np-icon name="game-controller" />
            {{ t('panel.quizRanking.verPreguntas') }}
          </a>
        </header>

        @if (store.fallo(); as fallo) {
          <np-alert status="declined" [heading]="t('panel.quizRanking.error')">
            <p>{{ textoDelFallo(fallo, t) }}</p>
          </np-alert>
        }

        @switch (store.estado()) {
          @case ('cargando') {
            <np-empty-state icon="trophy" [title]="t('panel.quizRanking.cargando')" />
          }
          @default {
            @if (store.jugadores().length === 0) {
              <np-empty-state
                icon="trophy"
                [title]="t('panel.quizRanking.sinPartidas')"
                [description]="t('panel.quizRanking.sinPartidasDescripcion')"
              />
            } @else {
              <p class="qr__resumen">
                {{
                  t('panel.quizRanking.resumen', {
                    enElRanking: store.resumen().enElRanking,
                    partidas: store.resumen().partidas,
                  })
                }}
              </p>

              <ol class="qr__lista">
                @for (jugador of store.jugadores(); track jugador.guestId) {
                  <li class="qr__fila">
                    <span class="qr__puesto">{{ jugador.puesto }}</span>

                    <span class="qr__quien">
                      <strong>{{ jugador.nombre || t('panel.quizRanking.sinNombre') }}</strong>
                      <!--
                        El teléfono, aquí y en ningún otro ranking: esta
                        pantalla es de la pareja, y es lo que distingue a dos
                        homónimos (D-11).
                      -->
                      @if (jugador.telefono) {
                        <small class="qr__telefono">{{ jugador.telefono }}</small>
                      }
                    </span>

                    <span class="qr__marca">
                      <strong>{{
                        t('panel.quizRanking.puntos', { puntos: jugador.puntos })
                      }}</strong>
                      <small>{{ t(clavePartidas(jugador), { n: jugador.partidas }) }}</small>
                    </span>
                  </li>
                }
              </ol>

              <!--
                Vaciar es lo que pide §8.7 para dejarlo limpio antes del día de
                la boda, después de que la pareja y sus amigos lo hayan estado
                probando. Con confirmación, porque no tiene vuelta.
              -->
              <button npButton variant="ghost" type="button" (click)="vaciando.set(true)">
                <np-icon name="trash" />
                {{ t('panel.quizRanking.vaciar') }}
              </button>
            }
          }
        }

        @if (vaciando()) {
          <np-modal
            [open]="true"
            [heading]="t('panel.quizRanking.vaciar')"
            (closed)="vaciando.set(false)"
          >
            <p>{{ t('panel.quizRanking.confirmarVaciado') }}</p>

            <div np-modal-actions>
              <button npButton variant="ghost" type="button" (click)="vaciando.set(false)">
                {{ t('common.cancel') }}
              </button>
              <button
                npButton
                variant="danger"
                type="button"
                [loading]="vaciandoYa()"
                (click)="vaciar()"
              >
                <np-icon name="trash" />
                {{ t('panel.quizRanking.vaciar') }}
              </button>
            </div>
          </np-modal>
        }
      </section>
    </ng-container>
  `,
  styles: `
    .qr__intro {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-3);
      margin-block-end: var(--np-space-4);
    }
    .qr__intro h2 {
      margin: 0;
      font-size: var(--np-text-xl);
      font-weight: var(--np-weight-semibold);
    }
    .qr__intro p {
      margin: var(--np-space-1) 0 0;
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-sm);
    }
    @media (min-width: 48rem) {
      .qr__intro {
        flex-direction: row;
        align-items: flex-start;
        justify-content: space-between;
      }
    }
    .qr__resumen {
      margin: 0;
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-sm);
    }
    .qr__lista {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-1);
      margin: var(--np-space-3) 0;
      padding: 0;
      list-style: none;
    }
    .qr__fila {
      display: grid;
      grid-template-columns: 2.25rem 1fr auto;
      gap: var(--np-space-2);
      align-items: center;
      padding: var(--np-space-2);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-md);
      background: var(--np-surface-surface);
    }
    .qr__puesto {
      display: flex;
      justify-content: center;
      color: var(--np-surface-text-muted);
      font-variant-numeric: tabular-nums;
      font-weight: var(--np-weight-semibold);
    }
    .qr__quien {
      display: flex;
      flex-direction: column;
      min-inline-size: 0;
    }
    .qr__telefono {
      color: var(--np-surface-text-muted);
      font-variant-numeric: tabular-nums;
    }
    .qr__marca {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      text-align: end;
    }
    .qr__marca small {
      color: var(--np-surface-text-muted);
    }
  `,
})
export class PanelRankingQuiz {
  protected readonly store = inject(RankingQuizStore);

  protected readonly vaciando = signal(false);
  protected readonly vaciandoYa = signal(false);

  constructor() {
    void this.store.cargar();
  }

  /** «1 partida» o «3 partidas»: en una tabla, el plural mal puesto canta. */
  protected clavePartidas(jugador: JugadorDelQuiz): string {
    return jugador.partidas === 1 ? 'panel.quizRanking.unaPartida' : 'panel.quizRanking.partidas';
  }

  protected async vaciar(): Promise<void> {
    if (this.vaciandoYa()) return;

    this.vaciandoYa.set(true);
    const ok = await this.store.vaciar();
    this.vaciandoYa.set(false);
    if (ok) this.vaciando.set(false);
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

  /** Expuesto para la prueba: la fila tal como se ordena. */
  protected jugadorDe(jugadores: readonly JugadorDelQuiz[], n: number): JugadorDelQuiz | null {
    return jugadores[n] ?? null;
  }
}
