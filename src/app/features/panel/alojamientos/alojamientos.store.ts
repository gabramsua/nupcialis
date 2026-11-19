import { Injectable, inject, signal } from '@angular/core';

import { SessionStore } from '../../../core/auth/session.store';
import {
  PUERTA_ALOJAMIENTOS,
  type AlojamientoDelPanel,
  type DatosAlojamiento,
  type FalloAlojamientos,
  type ResultadoEscrituraAlojamiento,
} from '../../../core/alojamientos/alojamientos-gateway';

type Estado = 'cargando' | 'lista' | 'error';

/** Los alojamientos, para la pantalla que los mantiene. Recarga tras escribir. */
@Injectable()
export class AlojamientosStore {
  private readonly sesion = inject(SessionStore);
  private readonly puerta = inject(PUERTA_ALOJAMIENTOS);

  private readonly _alojamientos = signal<readonly AlojamientoDelPanel[]>([]);
  private readonly _estado = signal<Estado>('cargando');
  private readonly _fallo = signal<FalloAlojamientos | null>(null);

  readonly alojamientos = this._alojamientos.asReadonly();
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
      this._alojamientos.set(resultado.alojamientos);
      this._fallo.set(null);
      this._estado.set('lista');
    } else {
      this._fallo.set(resultado.fallo);
      this._estado.set('error');
    }
  }

  async guardar(datos: DatosAlojamiento): Promise<ResultadoEscrituraAlojamiento> {
    return this.escribir((weddingId) => this.puerta.guardar(weddingId, datos));
  }

  async borrar(id: string): Promise<ResultadoEscrituraAlojamiento> {
    return this.escribir((weddingId) => this.puerta.borrar(weddingId, id));
  }

  private async escribir(
    operacion: (weddingId: string) => Promise<ResultadoEscrituraAlojamiento>,
  ): Promise<ResultadoEscrituraAlojamiento> {
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
