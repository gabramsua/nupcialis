import { Injectable, inject, signal } from '@angular/core';

import { SessionStore } from '../../../core/auth/session.store';
import {
  PUERTA_REGALOS_PANEL,
  type DatosRegalo,
  type FalloRegalosPanel,
  type RegaloDelPanel,
  type ResultadoEscrituraRegalo,
} from '../../../core/regalos/regalos-panel-gateway';

type Estado = 'cargando' | 'lista' | 'error';

/** La lista de regalos, para la pantalla que la mantiene. Recarga tras escribir. */
@Injectable()
export class RegalosStore {
  private readonly sesion = inject(SessionStore);
  private readonly puerta = inject(PUERTA_REGALOS_PANEL);

  private readonly _regalos = signal<readonly RegaloDelPanel[]>([]);
  private readonly _estado = signal<Estado>('cargando');
  private readonly _fallo = signal<FalloRegalosPanel | null>(null);

  readonly regalos = this._regalos.asReadonly();
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
      this._regalos.set(resultado.regalos);
      this._fallo.set(null);
      this._estado.set('lista');
    } else {
      this._fallo.set(resultado.fallo);
      this._estado.set('error');
    }
  }

  async guardar(datos: DatosRegalo): Promise<ResultadoEscrituraRegalo> {
    return this.escribir((weddingId) => this.puerta.guardar(weddingId, datos));
  }

  async borrar(id: string): Promise<ResultadoEscrituraRegalo> {
    return this.escribir((weddingId) => this.puerta.borrar(weddingId, id));
  }

  private async escribir(
    operacion: (weddingId: string) => Promise<ResultadoEscrituraRegalo>,
  ): Promise<ResultadoEscrituraRegalo> {
    const weddingId = this.sesion.weddingId();
    if (!weddingId) return { ok: false, fallo: { tipo: 'sin-permiso' } };

    const resultado = await operacion(weddingId);
    if (resultado.ok) {
      await this.cargar();
    } else {
      this._fallo.set(resultado.fallo);
    }

    return resultado;
  }
}
