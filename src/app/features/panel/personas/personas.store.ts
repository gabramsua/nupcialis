import { Injectable, computed, inject, signal } from '@angular/core';

import { SessionStore } from '../../../core/auth/session.store';
import {
  PUERTA_INVITADOS,
  ordenarPorNombre,
  type Invitado,
} from '../../../core/invitados/invitados-gateway';
import {
  ALMACEN_FOTOS_PERSONAS,
  PUERTA_PERSONAS,
  type FalloPersonas,
  type ResultadoEscrituraPersona,
} from '../../../core/personas/personas-gateway';
import { MAX_PERSONAS, intercambiar, type DatosDePersona, type PersonaDelPanel } from './personas';

type Estado = 'cargando' | 'lista' | 'error';

/** Lo que pide guardar una persona, con lo que cambia de su foto. */
export interface PeticionDePersona {
  /** `null` crea; con `id` edita. */
  readonly id: string | null;
  /** Los datos, con la foto **actual** (la que tiene ahora, o `null`). */
  readonly datos: DatosDePersona;
  /** Una foto nueva elegida: se sube al guardar, y sustituye a la actual. */
  readonly fotoNueva: File | null;
  /** Quitar la foto que tiene. */
  readonly quitarFoto: boolean;
}

/**
 * Las personas importantes de la boda.
 *
 * La foto se sube **al guardar**, no al elegirla: cancelar el formulario no
 * deja ficheros huérfanos en Storage. Y la foto vieja se borra solo cuando la
 * ficha ya apunta a la nueva.
 */
@Injectable()
export class PersonasStore {
  private readonly sesion = inject(SessionStore);
  private readonly puerta = inject(PUERTA_PERSONAS);
  private readonly almacen = inject(ALMACEN_FOTOS_PERSONAS);
  private readonly puertaInvitados = inject(PUERTA_INVITADOS);

  private readonly _personas = signal<readonly PersonaDelPanel[]>([]);
  private readonly _estado = signal<Estado>('cargando');
  private readonly _fallo = signal<FalloPersonas | null>(null);

  private readonly _invitados = signal<readonly Invitado[]>([]);
  private readonly _invitadosListos = signal(false);

  /** La lista de invitados, por nombre: de ahí sale el enlace de cada persona. */
  readonly invitados = computed(() => ordenarPorNombre(this._invitados()));
  /**
   * Si la lista de invitados se pudo leer. Mientras no, ningún enlace se da por
   * roto: sin la lista no se sabe si el invitado existe, y guardar la ficha no
   * puede borrar el enlace por un fallo de red.
   */
  readonly invitadosListos = this._invitadosListos.asReadonly();

  readonly estado = this._estado.asReadonly();
  readonly fallo = this._fallo.asReadonly();

  /** En el orden de la pareja. */
  readonly personas = computed(() =>
    [...this._personas()].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id)),
  );
  readonly lleno = computed(() => this._personas().length >= MAX_PERSONAS);

  async cargar(): Promise<void> {
    const weddingId = this.sesion.weddingId();
    if (!weddingId) {
      this._estado.set('lista');
      return;
    }

    this._estado.set('cargando');
    const resultado = await this.puerta.listar(weddingId);

    if (resultado.ok) {
      this._personas.set(resultado.personas);
      this._fallo.set(null);
      this._estado.set('lista');
    } else {
      this._fallo.set(resultado.fallo);
      this._estado.set('error');
    }
  }

  /** Lee los invitados para poder enlazarlos. Un fallo no tumba la pantalla. */
  async cargarInvitados(): Promise<void> {
    const resultado = await this.puertaInvitados.listar();
    if (resultado.ok) {
      this._invitados.set(resultado.invitados);
      this._invitadosListos.set(true);
    } else {
      this._invitadosListos.set(false);
    }
  }

  async guardar(peticion: PeticionDePersona): Promise<ResultadoEscrituraPersona> {
    const weddingId = this.sesion.weddingId();
    if (!weddingId) return { ok: false, fallo: { tipo: 'sin-permiso' } };

    const anterior = peticion.datos.photoPath;
    let datos = peticion.datos;
    let subida: string | null = null;

    if (peticion.fotoNueva) {
      try {
        const foto = await this.almacen.subir(weddingId, peticion.fotoNueva);
        subida = foto.path;
        datos = { ...datos, photoPath: foto.path, photoUrl: foto.url, photoConsent: true };
      } catch {
        const fallo: FalloPersonas = { tipo: 'error', mensaje: 'foto' };
        this._fallo.set(fallo);
        return { ok: false, fallo };
      }
    } else if (peticion.quitarFoto) {
      datos = { ...datos, photoPath: null, photoUrl: null, photoConsent: false };
    }

    const orden = Math.max(0, ...this._personas().map((p) => p.order)) + 1;
    const resultado = await this.puerta.guardar(
      weddingId,
      peticion.id,
      datos,
      orden,
      peticion.fotoNueva !== null,
    );

    if (!resultado.ok) {
      this._fallo.set(resultado.fallo);
      // La ficha no se actualizó: la foto recién subida se queda huérfana.
      if (subida) await this.almacen.borrar(subida);
      return resultado;
    }

    // La ficha ya apunta a la foto nueva (o a ninguna): la vieja sobra.
    if (anterior && anterior !== datos.photoPath) await this.almacen.borrar(anterior);

    this._fallo.set(null);
    await this.cargar();
    return resultado;
  }

  /** Borra la ficha y, después, su foto: sin ficha no hay a quién enseñarla. */
  async borrar(persona: PersonaDelPanel): Promise<ResultadoEscrituraPersona> {
    const weddingId = this.sesion.weddingId();
    if (!weddingId) return { ok: false, fallo: { tipo: 'sin-permiso' } };

    const resultado = await this.puerta.borrar(weddingId, persona.id);
    if (!resultado.ok) {
      this._fallo.set(resultado.fallo);
      return resultado;
    }
    if (persona.photoPath) await this.almacen.borrar(persona.photoPath);
    this._fallo.set(null);
    await this.cargar();
    return resultado;
  }

  async mover(id: string, direccion: -1 | 1): Promise<void> {
    const weddingId = this.sesion.weddingId();
    const cambios = intercambiar(this._personas(), id, direccion);
    if (!weddingId || cambios === null || cambios.length === 0) return;

    const resultado = await this.puerta.reordenar(weddingId, cambios);
    if (resultado.ok) {
      this._fallo.set(null);
      await this.cargar();
    } else {
      this._fallo.set(resultado.fallo);
    }
  }
}
