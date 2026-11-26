import { Injectable, computed, inject, signal } from '@angular/core';

import { SessionStore } from '../../../core/auth/session.store';
import {
  PUERTA_PLAYLIST_PANEL,
  type CancionDelPanel,
  type FalloPlaylistPanel,
  type ResultadoEscrituraPlaylist,
} from '../../../core/playlist/playlist-panel-gateway';
import { mismaCancion, type EstadoCancion } from '../../public-site/playlist/playlist';

type Estado = 'cargando' | 'lista' | 'error';

/** La playlist, para la pantalla que decide qué suena. Recarga tras escribir. */
@Injectable()
export class PlaylistStore {
  private readonly sesion = inject(SessionStore);
  private readonly puerta = inject(PUERTA_PLAYLIST_PANEL);

  private readonly _canciones = signal<readonly CancionDelPanel[]>([]);
  private readonly _estado = signal<Estado>('cargando');
  private readonly _fallo = signal<FalloPlaylistPanel | null>(null);

  readonly canciones = this._canciones.asReadonly();
  readonly estado = this._estado.asReadonly();
  readonly fallo = this._fallo.asReadonly();

  /** Cuántas hay en cada estado, para los filtros y para el resumen. */
  readonly cuenta = computed(() => {
    const cuenta: Record<EstadoCancion, number> = {
      pending: 0,
      accepted: 0,
      discarded: 0,
      vetoed: 0,
    };
    for (const c of this._canciones()) cuenta[c.status]++;
    return cuenta;
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
      this._canciones.set(resultado.canciones);
      this._fallo.set(null);
      this._estado.set('lista');
    } else {
      this._fallo.set(resultado.fallo);
      this._estado.set('error');
    }
  }

  async cambiarEstado(id: string, estado: EstadoCancion): Promise<ResultadoEscrituraPlaylist> {
    return this.escribir((weddingId) => this.puerta.cambiarEstado(weddingId, id, estado));
  }

  /**
   * Pone una canción de la pareja. Si ya estaba —la propuso un invitado—, **no
   * se duplica**: se le cambia el estado, que es lo que la pareja quiere decir
   * cuando teclea «Despacito» en la lista de veto y alguien ya la había pedido.
   */
  async anadir(
    title: string,
    artist: string,
    estado: EstadoCancion,
  ): Promise<ResultadoEscrituraPlaylist> {
    const igual = this._canciones().find((c) => mismaCancion(c, { title, artist }));
    if (igual) return this.cambiarEstado(igual.id, estado);

    return this.escribir((weddingId) => this.puerta.anadir(weddingId, title, artist, estado));
  }

  async borrar(id: string): Promise<ResultadoEscrituraPlaylist> {
    return this.escribir((weddingId) => this.puerta.borrar(weddingId, id));
  }

  private async escribir(
    operacion: (weddingId: string) => Promise<ResultadoEscrituraPlaylist>,
  ): Promise<ResultadoEscrituraPlaylist> {
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
