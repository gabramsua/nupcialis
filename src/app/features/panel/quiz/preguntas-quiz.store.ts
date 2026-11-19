import { Injectable, computed, inject, signal } from '@angular/core';

import { SessionStore } from '../../../core/auth/session.store';
import {
  PUERTA_PREGUNTAS_QUIZ,
  type DatosPregunta,
  type FalloQuizPanel,
  type PreguntaDelPanel,
  type ResultadoEscritura,
} from '../../../core/quiz/quiz-admin-gateway';
import { completa } from '../../public-site/quiz/quiz';

type Estado = 'cargando' | 'lista' | 'error';

/** El banco de preguntas de la boda. Recarga tras cada escritura. */
@Injectable()
export class PreguntasQuizStore {
  private readonly sesion = inject(SessionStore);
  private readonly puerta = inject(PUERTA_PREGUNTAS_QUIZ);

  private readonly _preguntas = signal<readonly PreguntaDelPanel[]>([]);
  private readonly _estado = signal<Estado>('cargando');
  private readonly _fallo = signal<FalloQuizPanel | null>(null);

  readonly preguntas = this._preguntas.asReadonly();
  readonly estado = this._estado.asReadonly();
  readonly fallo = this._fallo.asReadonly();

  /**
   * Las que se pueden jugar: las que están enteras.
   *
   * Se calcula con **la misma función que usa el servidor** al montar una
   * partida, así que lo que aquí se cuenta es exactamente lo que allí se va a
   * poder preguntar.
   */
  readonly jugables = computed(() => this._preguntas().filter(esEntera));

  readonly aMedias = computed(() => this._preguntas().filter((pregunta) => !esEntera(pregunta)));

  async cargar(): Promise<void> {
    const weddingId = this.sesion.weddingId();
    if (!weddingId) {
      this._estado.set('lista');
      return;
    }

    this._estado.set('cargando');
    const resultado = await this.puerta.listar(weddingId);

    if (resultado.ok) {
      this._preguntas.set(resultado.preguntas);
      this._fallo.set(null);
      this._estado.set('lista');
    } else {
      this._fallo.set(resultado.fallo);
      this._estado.set('error');
    }
  }

  async guardar(datos: DatosPregunta): Promise<ResultadoEscritura> {
    return this.escribir((weddingId) => this.puerta.guardar(weddingId, datos));
  }

  async borrar(id: string): Promise<ResultadoEscritura> {
    return this.escribir((weddingId) => this.puerta.borrar(weddingId, id));
  }

  private async escribir(
    operacion: (weddingId: string) => Promise<ResultadoEscritura>,
  ): Promise<ResultadoEscritura> {
    const weddingId = this.sesion.weddingId();
    if (!weddingId) return { ok: false, fallo: { tipo: 'sin-permiso' } };

    const resultado = await operacion(weddingId);
    if (resultado.ok) {
      this._fallo.set(null);
      await this.cargar();
    } else {
      this._fallo.set(resultado.fallo);
    }
    return resultado;
  }
}

/** Entera: enunciado, correcta y tres falsas, todas distintas. */
function esEntera(pregunta: PreguntaDelPanel): boolean {
  return (
    completa(pregunta.id, {
      text: pregunta.text,
      correctAnswer: pregunta.correctAnswer,
      wrongAnswers: [...pregunta.wrongAnswers],
      difficulty: pregunta.difficulty,
      hint: pregunta.hint,
      enabled: pregunta.enabled,
      order: pregunta.order,
    }) !== null
  );
}
