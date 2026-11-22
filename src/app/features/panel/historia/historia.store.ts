import { Injectable, computed, inject, signal } from '@angular/core';

import { SessionStore } from '../../../core/auth/session.store';
import { PUERTA_HISTORIA, type FalloHistoria } from '../../../core/historia/historia-gateway';
import {
  CLAVES_HISTORIA,
  FOTOS_POR_APARTADO,
  sanearHistoria,
  type ApartadoDeHistoria,
  type ClaveHistoria,
} from '../../public-site/historia/historia';

type Estado = 'cargando' | 'lista' | 'error';

/**
 * «Nuestra historia» de la boda: cinco apartados con su texto y hasta dos
 * fotos cada uno.
 *
 * Cada operación devuelve `true` si salió bien; si no, deja el motivo en
 * `fallo` y **no cambia lo que se ve**: el panel nunca enseña como guardado
 * algo que no lo está.
 */
@Injectable()
export class HistoriaStore {
  private readonly sesion = inject(SessionStore);
  private readonly puerta = inject(PUERTA_HISTORIA);

  private readonly _apartados = signal<readonly ApartadoDeHistoria[]>(sanearHistoria(null));
  private readonly _estado = signal<Estado>('cargando');
  private readonly _fallo = signal<FalloHistoria | null>(null);
  private readonly _ocupados = signal<ReadonlySet<ClaveHistoria>>(new Set());

  readonly apartados = this._apartados.asReadonly();
  readonly estado = this._estado.asReadonly();
  readonly fallo = this._fallo.asReadonly();

  /** ¿Hay algo escrito o subido? Para decirle a la pareja si la historia está vacía. */
  readonly vacia = computed(() =>
    this._apartados().every(
      (a) => a.fotos.length === 0 && a.html.replace(/<[^>]*>|&nbsp;|\s/g, '') === '',
    ),
  );

  apartado(clave: ClaveHistoria): ApartadoDeHistoria {
    return this._apartados().find((a) => a.clave === clave) ?? { clave, html: '', fotos: [] };
  }

  ocupado(clave: ClaveHistoria): boolean {
    return this._ocupados().has(clave);
  }

  async cargar(): Promise<void> {
    const weddingId = this.sesion.weddingId();
    if (!weddingId) {
      this._estado.set('lista');
      return;
    }

    this._estado.set('cargando');
    const r = await this.puerta.leer(weddingId);
    if (r.ok) {
      this._apartados.set(r.valor);
      this._fallo.set(null);
      this._estado.set('lista');
    } else {
      this._fallo.set(r.fallo);
      this._estado.set('error');
    }
  }

  async guardarTexto(clave: ClaveHistoria, html: string): Promise<boolean> {
    const weddingId = this.sesion.weddingId();
    if (!weddingId || this.ocupado(clave)) return false;

    return this.conOcupado(clave, async () => {
      const r = await this.puerta.guardarTexto(weddingId, clave, html);
      if (!r.ok) return this.fallar(r.fallo);
      this.cambiar(clave, (a) => ({ ...a, html }));
      return true;
    });
  }

  /** Sube una foto y la añade al final del apartado. Máximo `FOTOS_POR_APARTADO`. */
  async anadirFoto(clave: ClaveHistoria, fichero: File): Promise<boolean> {
    const weddingId = this.sesion.weddingId();
    if (!weddingId || this.ocupado(clave)) return false;
    if (this.apartado(clave).fotos.length >= FOTOS_POR_APARTADO) return false;

    return this.conOcupado(clave, async () => {
      const subida = await this.puerta.subirFoto(weddingId, fichero);
      if (!subida.ok) return this.fallar(subida.fallo);

      const fotos = [...this.apartado(clave).fotos, subida.valor];
      const guardada = await this.puerta.guardarFotos(weddingId, clave, fotos);
      if (!guardada.ok) {
        // El documento no apunta al fichero: se borra para no dejar basura.
        await this.puerta.borrarFichero(subida.valor.path);
        return this.fallar(guardada.fallo);
      }

      this.cambiar(clave, (a) => ({ ...a, fotos }));
      return true;
    });
  }

  async quitarFoto(clave: ClaveHistoria, url: string): Promise<boolean> {
    const weddingId = this.sesion.weddingId();
    if (!weddingId || this.ocupado(clave)) return false;

    const quitada = this.apartado(clave).fotos.find((f) => f.url === url);
    if (!quitada) return false;

    return this.conOcupado(clave, async () => {
      const fotos = this.apartado(clave).fotos.filter((f) => f.url !== url);
      const r = await this.puerta.guardarFotos(weddingId, clave, fotos);
      if (!r.ok) return this.fallar(r.fallo);

      // El fichero se borra **después** de que el documento ya no lo cite.
      if (quitada.path !== '') await this.puerta.borrarFichero(quitada.path);
      this.cambiar(clave, (a) => ({ ...a, fotos }));
      return true;
    });
  }

  private async conOcupado(
    clave: ClaveHistoria,
    trabajo: () => Promise<boolean>,
  ): Promise<boolean> {
    this._ocupados.update((s) => new Set(s).add(clave));
    this._fallo.set(null);
    try {
      return await trabajo();
    } finally {
      this._ocupados.update((s) => {
        const n = new Set(s);
        n.delete(clave);
        return n;
      });
    }
  }

  private fallar(fallo: FalloHistoria): false {
    this._fallo.set(fallo);
    return false;
  }

  private cambiar(clave: ClaveHistoria, f: (a: ApartadoDeHistoria) => ApartadoDeHistoria): void {
    this._apartados.update((lista) =>
      CLAVES_HISTORIA.map((c) => {
        const actual = lista.find((a) => a.clave === c) ?? { clave: c, html: '', fotos: [] };
        return c === clave ? f(actual) : actual;
      }),
    );
  }
}
