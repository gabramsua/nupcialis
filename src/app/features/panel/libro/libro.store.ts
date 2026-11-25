import { Injectable, computed, inject, signal } from '@angular/core';

import { SessionStore } from '../../../core/auth/session.store';
import {
  PUERTA_LIBRO_PANEL,
  type EstadoFirmaPanel,
  type FalloLibroPanel,
  type FirmaDelPanel,
  type ResultadoEscrituraLibro,
} from '../../../core/libro/libro-panel-gateway';

type Estado = 'cargando' | 'lista' | 'error';

/** El libro de firmas, para la pantalla que lo modera. Recarga tras escribir. */
@Injectable()
export class LibroStore {
  private readonly sesion = inject(SessionStore);
  private readonly puerta = inject(PUERTA_LIBRO_PANEL);

  private readonly _firmas = signal<readonly FirmaDelPanel[]>([]);
  private readonly _estado = signal<Estado>('cargando');
  private readonly _fallo = signal<FalloLibroPanel | null>(null);

  readonly firmas = this._firmas.asReadonly();
  readonly estado = this._estado.asReadonly();
  readonly fallo = this._fallo.asReadonly();

  readonly cuenta = computed(() => {
    const todas = this._firmas();
    const ocultas = todas.filter((f) => f.status === 'hidden').length;
    return { todas: todas.length, visibles: todas.length - ocultas, ocultas };
  });

  async cargar(): Promise<void> {
    const weddingId = this.sesion.weddingId();
    if (!weddingId) {
      this._estado.set('lista');
      return;
    }

    this._estado.set('cargando');
    const resultado = await this.puerta.listar(weddingId);

    if (resultado.ok) {
      this._firmas.set(resultado.firmas);
      this._fallo.set(null);
      this._estado.set('lista');
    } else {
      this._fallo.set(resultado.fallo);
      this._estado.set('error');
    }
  }

  cambiarEstado(id: string, estado: EstadoFirmaPanel): Promise<ResultadoEscrituraLibro> {
    return this.escribir((weddingId) => this.puerta.cambiarEstado(weddingId, id, estado));
  }

  borrar(id: string): Promise<ResultadoEscrituraLibro> {
    return this.escribir((weddingId) => this.puerta.borrar(weddingId, id));
  }

  private async escribir(
    operacion: (weddingId: string) => Promise<ResultadoEscrituraLibro>,
  ): Promise<ResultadoEscrituraLibro> {
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
