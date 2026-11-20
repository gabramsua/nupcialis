import { Injectable, computed, inject, signal } from '@angular/core';

import {
  PUERTA_GALERIA_PANEL,
  type FalloGaleria,
  type FotoPublica,
} from '../../../core/galeria/galeria-panel-gateway';

type Estado = 'cargando' | 'lista' | 'error';

/**
 * La galería vista por la pareja.
 *
 * Acumula páginas en vez de reemplazarlas: la rejilla crece hacia abajo y lo
 * que ya se ha mirado no se vuelve a pedir. Borrar quita la foto de la lista
 * sin recargar nada, que con cien fotos cargadas sería tirar el trabajo.
 */
@Injectable()
export class GaleriaPanelStore {
  private readonly puerta = inject(PUERTA_GALERIA_PANEL);

  private readonly _fotos = signal<readonly FotoPublica[]>([]);
  private readonly _cursor = signal<string | null>(null);
  private readonly _estado = signal<Estado>('cargando');
  private readonly _fallo = signal<FalloGaleria | null>(null);
  private readonly _trayendoMas = signal(false);

  readonly fotos = this._fotos.asReadonly();
  readonly estado = this._estado.asReadonly();
  readonly fallo = this._fallo.asReadonly();
  readonly trayendoMas = this._trayendoMas.asReadonly();

  readonly hayMas = computed(() => this._cursor() !== null);
  readonly cuantas = computed(() => this._fotos().length);

  async cargar(): Promise<void> {
    this._estado.set('cargando');
    this._fotos.set([]);
    this._cursor.set(null);

    const resultado = await this.puerta.listar(null);

    if (resultado.ok) {
      this._fotos.set(resultado.fotos);
      this._cursor.set(resultado.cursor);
      this._fallo.set(null);
      this._estado.set('lista');
    } else {
      this._fallo.set(resultado.fallo);
      this._estado.set('error');
    }
  }

  async traerMas(): Promise<void> {
    const cursor = this._cursor();
    if (cursor === null || this._trayendoMas()) return;

    this._trayendoMas.set(true);
    const resultado = await this.puerta.listar(cursor);
    this._trayendoMas.set(false);

    if (!resultado.ok) {
      this._fallo.set(resultado.fallo);
      return;
    }

    // Por id, no por concatenar a ciegas: si entre dos páginas alguien sube
    // una foto, el cursor por fecha no repite, pero esto lo garantiza igual.
    const vistas = new Set(this._fotos().map((f) => f.id));
    this._fotos.update((previas) => [
      ...previas,
      ...resultado.fotos.filter((f) => !vistas.has(f.id)),
    ]);
    this._cursor.set(resultado.cursor);
    this._fallo.set(null);
  }

  async borrar(photoId: string): Promise<boolean> {
    const resultado = await this.puerta.borrar(photoId);

    if (!resultado.ok) {
      this._fallo.set(resultado.fallo);
      return false;
    }

    this._fotos.update((previas) => previas.filter((f) => f.id !== photoId));
    this._fallo.set(null);
    return true;
  }

  async vaciar(): Promise<boolean> {
    const resultado = await this.puerta.vaciar();

    if (!resultado.ok) {
      this._fallo.set(resultado.fallo);
      return false;
    }

    this._fotos.set([]);
    this._cursor.set(null);
    this._fallo.set(null);
    this._estado.set('lista');
    return true;
  }
}
