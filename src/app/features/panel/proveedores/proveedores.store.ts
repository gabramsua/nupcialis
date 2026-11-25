import { Injectable, computed, inject, signal } from '@angular/core';

import { SessionStore } from '../../../core/auth/session.store';
import {
  ALMACEN_CONTRATOS,
  PUERTA_PROVEEDORES,
  type FalloProveedores,
  type ResultadoEscrituraProveedor,
} from '../../../core/proveedores/proveedores-gateway';
import {
  MAX_CONTRATOS,
  MAX_PROVEEDORES,
  agruparPorCategoria,
  totales,
  type DatosDeProveedor,
  type ProveedorDelPanel,
} from './proveedores';

type Estado = 'cargando' | 'lista' | 'error';

/** Los proveedores de la boda. Cada cambio recarga la lista. */
@Injectable()
export class ProveedoresStore {
  private readonly sesion = inject(SessionStore);
  private readonly puerta = inject(PUERTA_PROVEEDORES);
  private readonly almacen = inject(ALMACEN_CONTRATOS);

  private readonly _proveedores = signal<readonly ProveedorDelPanel[]>([]);
  private readonly _estado = signal<Estado>('cargando');
  private readonly _fallo = signal<FalloProveedores | null>(null);

  readonly proveedores = this._proveedores.asReadonly();
  readonly estado = this._estado.asReadonly();
  readonly fallo = this._fallo.asReadonly();

  readonly totales = computed(() => totales(this._proveedores()));
  readonly grupos = computed(() => agruparPorCategoria(this._proveedores()));
  readonly lleno = computed(() => this._proveedores().length >= MAX_PROVEEDORES);

  /** Las categorías que ya existen, para sugerirlas al escribir una ficha. */
  readonly categorias = computed(() =>
    [...new Set(this._proveedores().map((p) => p.category))].sort((a, b) =>
      a.localeCompare(b, 'es'),
    ),
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
      this._proveedores.set(resultado.proveedores);
      this._fallo.set(null);
      this._estado.set('lista');
    } else {
      this._fallo.set(resultado.fallo);
      this._estado.set('error');
    }
  }

  /** Con `id` edita; sin él crea al final. */
  async guardar(id: string | null, datos: DatosDeProveedor): Promise<ResultadoEscrituraProveedor> {
    const orden = Math.max(0, ...this._proveedores().map((p) => p.order)) + 1;
    return this.escribirYRecargar((w) => this.puerta.guardar(w, id, datos, orden));
  }

  /** Borra la ficha y, después, sus contratos: sin ficha no hay quien los abra. */
  async borrar(proveedor: ProveedorDelPanel): Promise<ResultadoEscrituraProveedor> {
    const resultado = await this.escribirYRecargar((w) => this.puerta.borrar(w, proveedor.id));
    if (resultado.ok) {
      await Promise.all(proveedor.contractPaths.map((ruta) => this.almacen.borrar(ruta)));
    }
    return resultado;
  }

  /**
   * Sube un contrato y lo cuelga de la ficha. `false` si no se pudo, con el
   * fallo guardado para que la pantalla lo enseñe.
   */
  async subirContrato(proveedor: ProveedorDelPanel, fichero: File): Promise<boolean> {
    const weddingId = this.sesion.weddingId();
    if (!weddingId || proveedor.contractPaths.length >= MAX_CONTRATOS) return false;

    let ruta: string;
    try {
      ruta = await this.almacen.subir(weddingId, proveedor.id, fichero);
    } catch {
      this._fallo.set({ tipo: 'error', mensaje: 'contrato' });
      return false;
    }

    const resultado = await this.guardarContratos(proveedor, [...proveedor.contractPaths, ruta]);
    // Si la ficha no se pudo actualizar, el PDF se queda huérfano: se quita.
    if (!resultado.ok) await this.almacen.borrar(ruta);
    return resultado.ok;
  }

  async quitarContrato(proveedor: ProveedorDelPanel, ruta: string): Promise<boolean> {
    const resultado = await this.guardarContratos(
      proveedor,
      proveedor.contractPaths.filter((r) => r !== ruta),
    );
    if (resultado.ok) await this.almacen.borrar(ruta);
    return resultado.ok;
  }

  /** La URL para abrir un contrato, o `null` si no se pudo resolver. */
  async urlDeContrato(ruta: string): Promise<string | null> {
    try {
      return await this.almacen.url(ruta);
    } catch {
      this._fallo.set({ tipo: 'error', mensaje: 'contrato' });
      return null;
    }
  }

  private guardarContratos(
    proveedor: ProveedorDelPanel,
    contractPaths: readonly string[],
  ): Promise<ResultadoEscrituraProveedor> {
    const datos: DatosDeProveedor = {
      name: proveedor.name,
      category: proveedor.category,
      contactName: proveedor.contactName,
      phone: proveedor.phone,
      email: proveedor.email,
      website: proveedor.website,
      quotedCents: proveedor.quotedCents,
      agreedCents: proveedor.agreedCents,
      status: proveedor.status,
      payments: proveedor.payments,
      contractPaths,
      rating: proveedor.rating,
      notes: proveedor.notes,
    };
    return this.escribirYRecargar((w) =>
      this.puerta.guardar(w, proveedor.id, datos, proveedor.order),
    );
  }

  private async escribirYRecargar(
    operacion: (weddingId: string) => Promise<ResultadoEscrituraProveedor>,
  ): Promise<ResultadoEscrituraProveedor> {
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
