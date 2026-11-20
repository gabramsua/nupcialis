import { Injectable, inject, signal } from '@angular/core';

import { SessionStore } from '../../../core/auth/session.store';
import {
  PUERTA_CRONOLOGIA,
  type DatosHito,
  type FalloCronologia,
  type HitoDelPanel,
  type ResultadoEscrituraHito,
} from '../../../core/cronologia/cronologia-gateway';

type Estado = 'cargando' | 'lista' | 'error';

/** La cronología del día, para la pantalla que la monta. Recarga tras escribir. */
@Injectable()
export class CronologiaStore {
  private readonly sesion = inject(SessionStore);
  private readonly puerta = inject(PUERTA_CRONOLOGIA);

  private readonly _hitos = signal<readonly HitoDelPanel[]>([]);
  private readonly _estado = signal<Estado>('cargando');
  private readonly _fallo = signal<FalloCronologia | null>(null);

  readonly hitos = this._hitos.asReadonly();
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
      this._hitos.set(resultado.hitos);
      this._fallo.set(null);
      this._estado.set('lista');
    } else {
      this._fallo.set(resultado.fallo);
      this._estado.set('error');
    }
  }

  async guardar(datos: DatosHito): Promise<ResultadoEscrituraHito> {
    return this.escribir((weddingId) => this.puerta.guardar(weddingId, datos));
  }

  async borrar(id: string): Promise<ResultadoEscrituraHito> {
    return this.escribir((weddingId) => this.puerta.borrar(weddingId, id));
  }

  private async escribir(
    operacion: (weddingId: string) => Promise<ResultadoEscrituraHito>,
  ): Promise<ResultadoEscrituraHito> {
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
