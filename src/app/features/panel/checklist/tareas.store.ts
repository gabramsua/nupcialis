import { Injectable, computed, inject, signal } from '@angular/core';

import {
  PUERTA_TAREAS,
  type DatosTarea,
  type EnlacesDeTarea,
  type FalloTareas,
} from '../../../core/checklist/tareas-gateway';
import type { ResultadoEscrituraTarea } from '../../../core/checklist/tareas-gateway';
import { SessionStore } from '../../../core/auth/session.store';
import { MAX_TAREAS, type TareaDelPanel } from './tareas';

type Estado = 'cargando' | 'lista' | 'error';

/**
 * Las tareas, para la pantalla que las mantiene.
 *
 * Marcar una tarea como hecha es **lo que más se hace** y tiene que sentirse
 * instantáneo: se refleja en pantalla al tocar y se confirma después. Si la
 * escritura falla, se deshace y se dice. El resto de cambios recargan.
 */
@Injectable()
export class TareasStore {
  private readonly sesion = inject(SessionStore);
  private readonly puerta = inject(PUERTA_TAREAS);

  private readonly _tareas = signal<readonly TareaDelPanel[]>([]);
  private readonly _estado = signal<Estado>('cargando');
  private readonly _fallo = signal<FalloTareas | null>(null);

  readonly tareas = this._tareas.asReadonly();
  readonly estado = this._estado.asReadonly();
  readonly fallo = this._fallo.asReadonly();

  readonly lleno = computed(() => this._tareas().length >= MAX_TAREAS);

  /** Las categorías que ya existen, para sugerirlas al escribir una nueva. */
  readonly categorias = computed(() =>
    [
      ...new Set(
        this._tareas()
          .map((t) => t.category)
          .filter((c) => c !== ''),
      ),
    ].sort((a, b) => a.localeCompare(b, 'es')),
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
      this._tareas.set(resultado.tareas);
      this._fallo.set(null);
      this._estado.set('lista');
    } else {
      this._fallo.set(resultado.fallo);
      this._estado.set('error');
    }
  }

  async guardar(datos: Omit<DatosTarea, 'order'>): Promise<ResultadoEscrituraTarea> {
    const orden = Math.max(0, ...this._tareas().map((t) => t.order)) + 1;
    return this.escribirYRecargar((w) => this.puerta.guardar(w, { ...datos, order: orden }));
  }

  async borrar(id: string): Promise<ResultadoEscrituraTarea> {
    return this.escribirYRecargar((w) => this.puerta.borrar(w, id));
  }

  /** Enlaza o desenlaza una tarea con un proveedor o una partida (F4.1c). */
  async enlazar(id: string, enlaces: EnlacesDeTarea): Promise<ResultadoEscrituraTarea> {
    return this.escribirYRecargar((w) => this.puerta.enlazar(w, id, enlaces));
  }

  async marcar(id: string, hecha: boolean): Promise<void> {
    const weddingId = this.sesion.weddingId();
    if (!weddingId) return;

    const por = { uid: this.sesion.sesion().uid, email: this.sesion.sesion().email };
    const antes = this._tareas();
    this._tareas.set(
      antes.map((t) =>
        t.id === id
          ? {
              ...t,
              done: hecha,
              doneAt: hecha ? new Date() : null,
              doneByUid: hecha ? por.uid : null,
              doneByEmail: hecha ? por.email : null,
            }
          : t,
      ),
    );

    const resultado = await this.puerta.marcar(weddingId, id, hecha, por);
    if (!resultado.ok) {
      this._tareas.set(antes);
      this._fallo.set(resultado.fallo);
    } else {
      this._fallo.set(null);
    }
  }

  private async escribirYRecargar(
    operacion: (weddingId: string) => Promise<ResultadoEscrituraTarea>,
  ): Promise<ResultadoEscrituraTarea> {
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
