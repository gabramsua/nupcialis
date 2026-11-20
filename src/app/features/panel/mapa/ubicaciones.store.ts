import { Injectable, inject, signal } from '@angular/core';

import { SessionStore } from '../../../core/auth/session.store';
import {
  PUERTA_UBICACIONES,
  type DatosUbicacion,
  type FalloUbicaciones,
  type ResultadoEscrituraUbicacion,
  type UbicacionDelPanel,
} from '../../../core/mapa/ubicaciones-gateway';

type Estado = 'cargando' | 'lista' | 'error';

/** Las ubicaciones, para la pantalla que las mantiene. Recarga tras escribir. */
@Injectable()
export class UbicacionesStore {
  private readonly sesion = inject(SessionStore);
  private readonly puerta = inject(PUERTA_UBICACIONES);

  private readonly _ubicaciones = signal<readonly UbicacionDelPanel[]>([]);
  private readonly _estado = signal<Estado>('cargando');
  private readonly _fallo = signal<FalloUbicaciones | null>(null);

  readonly ubicaciones = this._ubicaciones.asReadonly();
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
      this._ubicaciones.set(resultado.ubicaciones);
      this._fallo.set(null);
      this._estado.set('lista');
    } else {
      this._fallo.set(resultado.fallo);
      this._estado.set('error');
    }
  }

  async guardar(datos: DatosUbicacion): Promise<ResultadoEscrituraUbicacion> {
    return this.escribir((weddingId) => this.puerta.guardar(weddingId, datos));
  }

  async borrar(id: string): Promise<ResultadoEscrituraUbicacion> {
    return this.escribir((weddingId) => this.puerta.borrar(weddingId, id));
  }

  /**
   * Sube o baja una ubicación un puesto.
   *
   * Reescribe el `order` de las que cambian, empezando por renumerar toda la
   * lista de 1 en adelante: dos fichas con el mismo número no se pueden
   * intercambiar, y es lo que pasa cuando se han ido añadiendo sin orden.
   */
  async mover(id: string, sentido: -1 | 1): Promise<void> {
    const lista = this._ubicaciones().slice();
    const desde = lista.findIndex((u) => u.id === id);
    const hasta = desde + sentido;
    if (desde < 0 || hasta < 0 || hasta >= lista.length) return;

    const [movida] = lista.splice(desde, 1);
    lista.splice(hasta, 0, movida!);

    for (const [i, ubicacion] of lista.entries()) {
      if (ubicacion.order !== i + 1) {
        const resultado = await this.escribir((weddingId) =>
          this.puerta.guardar(weddingId, { ...ubicacion, order: i + 1 }),
        );
        if (!resultado.ok) return;
      }
    }
  }

  private async escribir(
    operacion: (weddingId: string) => Promise<ResultadoEscrituraUbicacion>,
  ): Promise<ResultadoEscrituraUbicacion> {
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
