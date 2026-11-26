import { Injectable, inject, signal } from '@angular/core';

import { SessionStore } from '../../../core/auth/session.store';
import {
  PUERTA_FAQS,
  type DatosFaq,
  type FalloFaqs,
  type FaqDelPanel,
  type ResultadoEscrituraFaq,
} from '../../../core/faqs/faqs-gateway';

type Estado = 'cargando' | 'lista' | 'error';

/**
 * Las preguntas frecuentes, para la pantalla que las edita.
 *
 * Después de cada escritura recarga, igual que el store de las preguntas del
 * formulario: el orden lo escribe un lote y el id de una nueva lo decide la
 * puerta, así que recargar es lo que garantiza que lo que la pareja ve es lo
 * que hay.
 */
@Injectable()
export class FaqsStore {
  private readonly sesion = inject(SessionStore);
  private readonly puerta = inject(PUERTA_FAQS);

  private readonly _faqs = signal<readonly FaqDelPanel[]>([]);
  private readonly _estado = signal<Estado>('cargando');
  private readonly _fallo = signal<FalloFaqs | null>(null);

  readonly faqs = this._faqs.asReadonly();
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
      this._faqs.set(resultado.faqs);
      this._fallo.set(null);
      this._estado.set('lista');
    } else {
      this._fallo.set(resultado.fallo);
      this._estado.set('error');
    }
  }

  async guardar(datos: DatosFaq): Promise<ResultadoEscrituraFaq> {
    return this.escribir((weddingId) => this.puerta.guardar(weddingId, datos));
  }

  async borrar(id: string): Promise<ResultadoEscrituraFaq> {
    return this.escribir((weddingId) => this.puerta.borrar(weddingId, id));
  }

  async reordenar(ids: readonly string[]): Promise<ResultadoEscrituraFaq> {
    return this.escribir((weddingId) => this.puerta.reordenar(weddingId, ids));
  }

  private async escribir(
    operacion: (weddingId: string) => Promise<ResultadoEscrituraFaq>,
  ): Promise<ResultadoEscrituraFaq> {
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
