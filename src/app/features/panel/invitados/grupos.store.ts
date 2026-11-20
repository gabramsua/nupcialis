import { Injectable, computed, inject, signal } from '@angular/core';

import { SessionStore } from '../../../core/auth/session.store';
import {
  PUERTA_GRUPOS,
  ordenarGrupos,
  type DatosGrupo,
  type FalloGrupo,
  type Grupo,
  type ResultadoBorradoGrupo,
  type ResultadoGuardadoGrupo,
  type ResultadoOrdenGrupos,
} from '../../../core/invitados/grupos-gateway';

type Estado = 'cargando' | 'lista' | 'error';

/**
 * Los grupos de la boda, cargados una vez para todo el panel.
 *
 * Los usan tres pantallas —la lista de invitados, la de grupos y la de
 * importar— y tienen que ver lo mismo: si la pareja crea «Primos» en una y en
 * la siguiente no aparece, no hay forma de explicar que era una copia vieja.
 */
@Injectable()
export class GruposStore {
  private readonly sesion = inject(SessionStore);
  private readonly puerta = inject(PUERTA_GRUPOS);

  private readonly _grupos = signal<readonly Grupo[]>([]);
  private readonly _estado = signal<Estado>('cargando');
  private readonly _fallo = signal<FalloGrupo | null>(null);

  readonly grupos = this._grupos.asReadonly();
  readonly estado = this._estado.asReadonly();
  readonly fallo = this._fallo.asReadonly();

  readonly porId = computed(() => new Map(this._grupos().map((g) => [g.id, g])));

  constructor() {
    void this.cargar();
  }

  async cargar(): Promise<void> {
    const weddingId = this.sesion.weddingId();
    // Sin boda en el token no hay grupos que leer. No es un error: la guarda
    // del panel ya se encarga de que aquí no se llegue así.
    if (!weddingId) {
      this._estado.set('lista');
      return;
    }

    const resultado = await this.puerta.listar(weddingId);
    if (resultado.ok) {
      this._grupos.set(resultado.grupos);
      this._fallo.set(null);
      this._estado.set('lista');
    } else {
      this._fallo.set(resultado.fallo);
      this._estado.set('error');
    }
  }

  /** Guarda y recarga: el color o el orden los puede haber decidido el servidor. */
  async guardar(datos: DatosGrupo): Promise<ResultadoGuardadoGrupo> {
    const resultado = await this.puerta.guardar(datos);
    if (resultado.ok) await this.cargar();
    return resultado;
  }

  /**
   * Cambia el orden y lo enseña **antes** de que conteste el servidor.
   *
   * Mover un grupo y esperar medio segundo a que suba se siente roto, y es un
   * cambio sin consecuencias: si falla, se vuelve a cargar y se recupera el
   * orden que había.
   */
  async reordenar(grupos: readonly Grupo[]): Promise<ResultadoOrdenGrupos> {
    const antes = this._grupos();
    this._grupos.set(grupos);

    const resultado = await this.puerta.reordenar(grupos.map((g) => g.id));
    if (!resultado.ok) {
      this._grupos.set(antes);
      this._fallo.set(resultado.fallo);
    }

    return resultado;
  }

  async borrar(id: string): Promise<ResultadoBorradoGrupo> {
    const resultado = await this.puerta.borrar(id);
    if (resultado.ok)
      this._grupos.update((grupos) => ordenarGrupos(grupos.filter((g) => g.id !== id)));
    return resultado;
  }
}
