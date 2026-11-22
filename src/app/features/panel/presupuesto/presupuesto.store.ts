import { Injectable, computed, inject, signal } from '@angular/core';

import { SessionStore } from '../../../core/auth/session.store';
import {
  PUERTA_PRESUPUESTO,
  type FalloPresupuesto,
  type ResultadoEscrituraPartida,
} from '../../../core/presupuesto/presupuesto-gateway';
import {
  MAX_PARTIDAS,
  agruparPorCategoria,
  totales,
  type DatosDePartida,
  type PartidaDelPanel,
} from './presupuesto';

type Estado = 'cargando' | 'lista' | 'error';

/**
 * El presupuesto de la boda.
 *
 * Marcar «pagada» se refleja al tocar y se confirma después (si falla, se
 * deshace y se dice). El resto de cambios recargan la lista.
 */
@Injectable()
export class PresupuestoStore {
  private readonly sesion = inject(SessionStore);
  private readonly puerta = inject(PUERTA_PRESUPUESTO);

  private readonly _partidas = signal<readonly PartidaDelPanel[]>([]);
  private readonly _estado = signal<Estado>('cargando');
  private readonly _fallo = signal<FalloPresupuesto | null>(null);

  readonly partidas = this._partidas.asReadonly();
  readonly estado = this._estado.asReadonly();
  readonly fallo = this._fallo.asReadonly();

  readonly totales = computed(() => totales(this._partidas()));
  readonly grupos = computed(() => agruparPorCategoria(this._partidas()));
  readonly lleno = computed(() => this._partidas().length >= MAX_PARTIDAS);

  /** Las categorías que ya existen, para sugerirlas al escribir una partida. */
  readonly categorias = computed(() =>
    [...new Set(this._partidas().map((p) => p.category))].sort((a, b) => a.localeCompare(b, 'es')),
  );

  async cargar(): Promise<void> {
    const weddingId = this.sesion.weddingId();
    if (!weddingId) {
      this._estado.set('lista');
      return;
    }

    this._estado.set('cargando');
    const resultado = await this.puerta.listar(weddingId);

    if (resultado.ok) {
      this._partidas.set(resultado.partidas);
      this._fallo.set(null);
      this._estado.set('lista');
    } else {
      this._fallo.set(resultado.fallo);
      this._estado.set('error');
    }
  }

  /** Con `id` edita; sin él crea al final. */
  async guardar(id: string | null, datos: DatosDePartida): Promise<ResultadoEscrituraPartida> {
    const orden = Math.max(0, ...this._partidas().map((p) => p.order)) + 1;
    return this.escribirYRecargar((w) => this.puerta.guardar(w, id, datos, orden));
  }

  async borrar(id: string): Promise<ResultadoEscrituraPartida> {
    return this.escribirYRecargar((w) => this.puerta.borrar(w, id));
  }

  async marcarPagada(id: string, pagada: boolean): Promise<boolean> {
    const weddingId = this.sesion.weddingId();
    if (!weddingId) return false;

    const antes = this._partidas();
    this._partidas.set(antes.map((p) => (p.id === id ? { ...p, paid: pagada } : p)));

    const resultado = await this.puerta.marcarPagada(weddingId, id, pagada);
    if (!resultado.ok) {
      this._partidas.set(antes);
      this._fallo.set(resultado.fallo);
      return false;
    }
    this._fallo.set(null);
    return true;
  }

  private async escribirYRecargar(
    operacion: (weddingId: string) => Promise<ResultadoEscrituraPartida>,
  ): Promise<ResultadoEscrituraPartida> {
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
