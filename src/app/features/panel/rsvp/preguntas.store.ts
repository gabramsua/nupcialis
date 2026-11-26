import { Injectable, inject, signal } from '@angular/core';

import { SessionStore } from '../../../core/auth/session.store';
import {
  PUERTA_PREGUNTAS,
  type DatosPregunta,
  type FalloPreguntas,
  type PreguntaDelPanel,
  type ResultadoEscritura,
} from '../../../core/rsvp/preguntas-gateway';

type Estado = 'cargando' | 'lista' | 'error';

/**
 * Las preguntas del formulario, para la pantalla que las edita.
 *
 * Después de cada escritura recarga. Podría apañarse el estado en memoria, pero
 * el orden lo escribe un lote y el id de una pregunta nueva lo decide la
 * puerta: recargar es lo que garantiza que lo que la pareja ve es lo que hay.
 */
@Injectable()
export class PreguntasStore {
  private readonly sesion = inject(SessionStore);
  private readonly puerta = inject(PUERTA_PREGUNTAS);

  private readonly _preguntas = signal<readonly PreguntaDelPanel[]>([]);
  private readonly _estado = signal<Estado>('cargando');
  private readonly _fallo = signal<FalloPreguntas | null>(null);

  readonly preguntas = this._preguntas.asReadonly();
  readonly estado = this._estado.asReadonly();
  readonly fallo = this._fallo.asReadonly();

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

  async reordenar(ids: readonly string[]): Promise<ResultadoEscritura> {
    return this.escribir((weddingId) => this.puerta.reordenar(weddingId, ids));
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
