import { Injectable, computed, inject, signal } from '@angular/core';

import { SessionStore } from '../../../core/auth/session.store';
import { PUERTA_INVITADOS, type Invitado } from '../../../core/invitados/invitados-gateway';
import {
  PUERTA_RECIBIDOS,
  type DatosRecibido,
  type FalloRecibidos,
  type RegaloRecibido,
  type ResultadoEscrituraRecibido,
} from '../../../core/regalos/recibidos-gateway';
import { apuntadosQueNoVinieron, resumenDeRecibidos, vinieronSinApuntar } from './recibidos';

type Estado = 'cargando' | 'lista' | 'error';

/** El cuaderno de lo recibido, para la pantalla que lo mantiene. */
@Injectable()
export class RecibidosStore {
  private readonly sesion = inject(SessionStore);
  private readonly puerta = inject(PUERTA_RECIBIDOS);
  private readonly puertaInvitados = inject(PUERTA_INVITADOS);

  private readonly _recibidos = signal<readonly RegaloRecibido[]>([]);
  private readonly _estado = signal<Estado>('cargando');
  private readonly _fallo = signal<FalloRecibidos | null>(null);
  private readonly _invitados = signal<readonly Invitado[]>([]);

  readonly recibidos = this._recibidos.asReadonly();
  readonly invitados = this._invitados.asReadonly();
  readonly estado = this._estado.asReadonly();
  readonly fallo = this._fallo.asReadonly();

  readonly resumen = computed(() => resumenDeRecibidos(this._recibidos()));

  /** Quién vino y no tiene nada apuntado. Información, nunca reproche (§8.8). */
  readonly sinApuntar = computed(() => vinieronSinApuntar(this._invitados(), this._recibidos()));
  /** Y quien no pudo venir y mandó algo igual: a quien más se agradece. */
  readonly noVinieron = computed(() =>
    apuntadosQueNoVinieron(this._invitados(), this._recibidos()),
  );

  /** El nombre de un invitado, para firmar cada anotación. */
  readonly nombrePorId = computed(() => {
    const porId = new Map(this._invitados().map((i) => [i.id, i.fullName]));
    return (guestId: string) => porId.get(guestId) ?? null;
  });

  async cargar(): Promise<void> {
    const weddingId = this.sesion.weddingId();
    if (!weddingId) {
      this._estado.set('lista');
      return;
    }

    this._estado.set('cargando');

    // Las dos a la vez: sin los invitados no se puede ni firmar una anotación
    // ni cruzar nada, y es lo que hace útil a esta pantalla.
    const [resultado, listado] = await Promise.all([
      this.puerta.listar(weddingId),
      this.puertaInvitados.listar(),
    ]);

    if (listado.ok) this._invitados.set(listado.invitados);

    if (resultado.ok) {
      this._recibidos.set(resultado.recibidos);
      this._fallo.set(null);
      this._estado.set('lista');
    } else {
      this._fallo.set(resultado.fallo);
      this._estado.set('error');
    }
  }

  async guardar(datos: DatosRecibido): Promise<ResultadoEscrituraRecibido> {
    return this.escribir((weddingId) => this.puerta.guardar(weddingId, datos));
  }

  async borrar(id: string): Promise<ResultadoEscrituraRecibido> {
    return this.escribir((weddingId) => this.puerta.borrar(weddingId, id));
  }

  /**
   * Marca o desmarca el agradecimiento, sin abrir el formulario.
   *
   * Es el gesto que se repite cincuenta veces la semana siguiente a la boda,
   * así que tiene que ser un toque y no un formulario con un guardar al final.
   */
  async agradecer(recibido: RegaloRecibido, hoy: string): Promise<ResultadoEscrituraRecibido> {
    return this.guardar({
      id: recibido.id,
      guestId: recibido.guestId,
      fromLabel: recibido.fromLabel,
      amount: recibido.amount,
      method: recibido.method,
      giftDescription: recibido.giftDescription,
      receivedAt: recibido.receivedAt,
      thanked: !recibido.thanked,
      thankedAt: recibido.thanked ? null : hoy,
      notes: recibido.notes,
    });
  }

  private async escribir(
    operacion: (weddingId: string) => Promise<ResultadoEscrituraRecibido>,
  ): Promise<ResultadoEscrituraRecibido> {
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
