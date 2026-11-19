import { Injectable, computed, inject, signal } from '@angular/core';

import { SessionStore } from '../../../core/auth/session.store';
import {
  PUERTA_MESAS,
  PUERTA_SENTAR,
  type DatosMesa,
  type FalloMesas,
  type Mesa,
  type ResultadoEscrituraMesa,
} from '../../../core/mesas/mesas-gateway';
import { PUERTA_INVITADOS, type Invitado } from '../../../core/invitados/invitados-gateway';
import { avisosDeMesas, resumenDeMesas, sentadosEn, sinMesa, type InvitadoSentado } from './mesas';

type Estado = 'cargando' | 'lista' | 'error';

/**
 * El reparto de mesas: las mesas y quién se sienta en cada una.
 *
 * Junta dos fuentes porque la pantalla las necesita a la vez: las mesas viven
 * en su colección y la mesa de cada invitado vive en su ficha. Lo segundo lo
 * trae el almacén de invitados, que ya lo carga para su propia pantalla.
 */
@Injectable()
export class MesasStore {
  private readonly sesion = inject(SessionStore);
  private readonly puerta = inject(PUERTA_MESAS);
  private readonly sentarse = inject(PUERTA_SENTAR);
  private readonly puertaInvitados = inject(PUERTA_INVITADOS);

  private readonly _invitados = signal<readonly Invitado[]>([]);

  private readonly _mesas = signal<readonly Mesa[]>([]);
  private readonly _estado = signal<Estado>('cargando');
  private readonly _fallo = signal<FalloMesas | null>(null);

  readonly mesas = this._mesas.asReadonly();
  readonly estado = this._estado.asReadonly();
  readonly fallo = this._fallo.asReadonly();

  /** Los invitados en la forma que entiende el dominio del reparto. */
  readonly comoSentados = computed<readonly InvitadoSentado[]>(() =>
    this._invitados().map(paraSentar),
  );

  readonly porSentar = computed(() => sinMesa(this.comoSentados()));
  readonly avisos = computed(() => avisosDeMesas(this._mesas(), this.comoSentados()));
  readonly resumen = computed(() => resumenDeMesas(this._mesas(), this.comoSentados()));

  sentadosEnMesa(mesaId: string): readonly InvitadoSentado[] {
    return sentadosEn(mesaId, this.comoSentados());
  }

  async cargar(): Promise<void> {
    const weddingId = this.sesion.weddingId();
    this._estado.set('cargando');

    // Las dos a la vez: la pantalla no sirve de nada con una sola.
    const [resultado, listado] = await Promise.all([
      weddingId ? this.puerta.listar(weddingId) : Promise.resolve(null),
      this.puertaInvitados.listar(),
    ]);

    if (listado.ok) this._invitados.set(listado.invitados);

    if (!resultado) {
      this._estado.set('lista');
      return;
    }

    if (resultado.ok) {
      this._mesas.set(resultado.mesas);
      this._fallo.set(null);
      this._estado.set('lista');
    } else {
      this._fallo.set(resultado.fallo);
      this._estado.set('error');
    }
  }

  async guardarMesa(datos: DatosMesa): Promise<ResultadoEscrituraMesa> {
    return this.escribir((weddingId) => this.puerta.guardar(weddingId, datos));
  }

  /**
   * Borra una mesa y **levanta a quien estuviera sentado**.
   *
   * Sin esto, sus invitados se quedarían con el id de una mesa que ya no
   * existe: no saldrían en ninguna mesa ni en la lista de los que faltan por
   * sentar, que es la peor forma de perder a doce personas.
   */
  async borrarMesa(id: string): Promise<ResultadoEscrituraMesa> {
    const sentados = this.sentadosEnMesa(id).map((invitado) => invitado.id);
    if (sentados.length > 0) {
      const levantados = await this.sentar(sentados, null);
      if (!levantados) return { ok: false, fallo: this._fallo() ?? { tipo: 'error', mensaje: '' } };
    }

    return this.escribir((weddingId) => this.puerta.borrar(weddingId, id));
  }

  /** Sienta o levanta. Recarga los invitados, que es donde vive el cambio. */
  async sentar(guestIds: readonly string[], mesaId: string | null): Promise<boolean> {
    if (guestIds.length === 0) return true;

    const resultado = await this.sentarse.sentar(guestIds, mesaId);

    if (!resultado.ok) {
      this._fallo.set(resultado.fallo);
      return false;
    }

    this._fallo.set(null);
    const listado = await this.puertaInvitados.listar();
    if (listado.ok) this._invitados.set(listado.invitados);
    return true;
  }

  private async escribir(
    operacion: (weddingId: string) => Promise<ResultadoEscrituraMesa>,
  ): Promise<ResultadoEscrituraMesa> {
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

function paraSentar(invitado: Invitado): InvitadoSentado {
  return {
    id: invitado.id,
    fullName: invitado.fullName,
    rsvpStatus: invitado.rsvpStatus,
    tableId: invitado.tableId,
    isCompanion: invitado.isCompanion,
    invitedById: invitado.invitedById,
    groupIds: invitado.groupIds,
  };
}
