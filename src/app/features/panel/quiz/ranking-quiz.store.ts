import { Injectable, computed, inject, signal } from '@angular/core';

import {
  PUERTA_RANKING_QUIZ,
  porPuesto,
  resumenDeJuego,
  type FalloQuizPanel,
  type JugadorDelQuiz,
} from '../../../core/quiz/quiz-admin-gateway';

type Estado = 'cargando' | 'lista' | 'error';

/** Quién ha jugado al quiz, con su puesto y su teléfono (`D-11`). */
@Injectable()
export class RankingQuizStore {
  private readonly puerta = inject(PUERTA_RANKING_QUIZ);

  private readonly _jugadores = signal<readonly JugadorDelQuiz[]>([]);
  private readonly _estado = signal<Estado>('cargando');
  private readonly _fallo = signal<FalloQuizPanel | null>(null);

  readonly estado = this._estado.asReadonly();
  readonly fallo = this._fallo.asReadonly();

  /** El ranking, por puesto. */
  readonly jugadores = computed(() => porPuesto(this._jugadores()));
  readonly resumen = computed(() => resumenDeJuego(this._jugadores()));

  async cargar(): Promise<void> {
    this._estado.set('cargando');
    const resultado = await this.puerta.jugadores();

    if (resultado.ok) {
      this._jugadores.set(resultado.jugadores);
      this._fallo.set(null);
      this._estado.set('lista');
    } else {
      this._fallo.set(resultado.fallo);
      this._estado.set('error');
    }
  }

  async vaciar(): Promise<boolean> {
    const resultado = await this.puerta.vaciar();

    if (!resultado.ok) {
      this._fallo.set(resultado.fallo);
      return false;
    }

    this._fallo.set(null);
    await this.cargar();
    return true;
  }
}
