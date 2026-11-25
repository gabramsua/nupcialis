import { signal, type Provider } from '@angular/core';

import { SessionStore } from '../../../core/auth/session.store';
import { PUERTA_TAREAS, type PuertaTareas } from '../../../core/checklist/tareas-gateway';
import {
  PUERTA_INVITADOS,
  type Invitado,
  type PuertaInvitados,
} from '../../../core/invitados/invitados-gateway';
import {
  PUERTA_PRESUPUESTO,
  type PuertaPresupuesto,
} from '../../../core/presupuesto/presupuesto-gateway';
import {
  ALMACEN_CONTRATOS,
  PUERTA_PROVEEDORES,
  type AlmacenContratos,
  type PuertaProveedores,
} from '../../../core/proveedores/proveedores-gateway';
import { BodaStore } from '../boda.store';
import { BODA_DE_PRUEBA } from '../boda.testing';
import type { Modulo } from '../boda';
import type { DatosTarea } from '../../../core/checklist/tareas-gateway';
import type { TareaDelPanel } from '../checklist/tareas';
import { TareasStore } from '../checklist/tareas.store';
import type { PartidaDelPanel } from '../presupuesto/presupuesto';
import { PresupuestoStore } from '../presupuesto/presupuesto.store';
import type { ProveedorDelPanel } from '../proveedores/proveedores';
import { ProveedoresStore } from '../proveedores/proveedores.store';

/**
 * Los dobles que necesitan las pantallas que se enlazan entre sí (F4.1c).
 *
 * Tareas, partidas, proveedores e invitados viven en gateways distintos, pero
 * las pantallas de checklist, presupuesto, proveedores y personas leen de los
 * cuatro. Aquí se montan **en memoria** y apuntando lo que se escribe, para que
 * cada spec solo diga lo que le importa. Sin módulos activos (lo normal en los
 * specs antiguos) los bloques de enlaces no se pintan y nada cambia.
 *
 * Se pone **al principio** de `providers`: lo que el spec declare después
 * sustituye a estos dobles.
 */
export interface OpcionesDeEnlaces {
  readonly modulos?: readonly Modulo[];
  readonly proveedores?: readonly ProveedorDelPanel[];
  readonly partidas?: readonly PartidaDelPanel[];
  readonly tareas?: readonly TareaDelPanel[];
  readonly invitados?: readonly Invitado[];
}

export interface RegistroDeEnlaces {
  /** Las tareas que se guardaron (nuevas o editadas). */
  readonly tareasGuardadas: DatosTarea[];
  readonly tareasEnlazadas: {
    id: string;
    vendorId?: string | null;
    budgetItemId?: string | null;
  }[];
  readonly partidasEnlazadas: { id: string; vendorId: string | null }[];
}

export function doblesDeEnlaces(opciones: OpcionesDeEnlaces = {}): {
  readonly providers: Provider[];
  readonly registro: RegistroDeEnlaces;
} {
  const registro: RegistroDeEnlaces = {
    tareasGuardadas: [],
    tareasEnlazadas: [],
    partidasEnlazadas: [],
  };

  // Estado vivo: un enlace hecho se ve en la siguiente carga, como en Firestore.
  let tareas = [...(opciones.tareas ?? [])];
  let partidas = [...(opciones.partidas ?? [])];

  const puertaTareas: PuertaTareas = {
    async listar() {
      return { ok: true, tareas };
    },
    async guardar(_w, datos) {
      registro.tareasGuardadas.push(datos);
      return { ok: true };
    },
    async marcar() {
      return { ok: true };
    },
    async enlazar(_w, id, enlaces) {
      registro.tareasEnlazadas.push({ id, ...enlaces });
      tareas = tareas.map((t) => (t.id === id ? { ...t, ...enlaces } : t));
      return { ok: true };
    },
    async borrar() {
      return { ok: true };
    },
  };

  const puertaPresupuesto: PuertaPresupuesto = {
    async listar() {
      return { ok: true, partidas };
    },
    async guardar() {
      return { ok: true };
    },
    async marcarPagada() {
      return { ok: true };
    },
    async enlazarProveedor(_w, id, vendorId) {
      registro.partidasEnlazadas.push({ id, vendorId });
      partidas = partidas.map((p) => (p.id === id ? { ...p, vendorId } : p));
      return { ok: true };
    },
    async borrar() {
      return { ok: true };
    },
  };

  const puertaProveedores: PuertaProveedores = {
    async listar() {
      return { ok: true, proveedores: opciones.proveedores ?? [] };
    },
    async guardar() {
      return { ok: true, id: 'nuevo' };
    },
    async borrar() {
      return { ok: true, id: '' };
    },
  };

  const almacen: AlmacenContratos = {
    async subir() {
      return '';
    },
    async url() {
      return '';
    },
    async borrar() {
      return undefined;
    },
  };

  const puertaInvitados = {
    async listar() {
      return { ok: true, invitados: opciones.invitados ?? [] };
    },
  } as unknown as PuertaInvitados;

  const modulos = Object.fromEntries(
    (opciones.modulos ?? []).map((m) => [m, { enabled: true, visibility: 'visible' as const }]),
  );

  return {
    registro,
    providers: [
      { provide: PUERTA_TAREAS, useValue: puertaTareas },
      { provide: PUERTA_PRESUPUESTO, useValue: puertaPresupuesto },
      { provide: PUERTA_PROVEEDORES, useValue: puertaProveedores },
      { provide: ALMACEN_CONTRATOS, useValue: almacen },
      { provide: PUERTA_INVITADOS, useValue: puertaInvitados },
      {
        provide: SessionStore,
        useValue: {
          weddingId: () => 'w1',
          sesion: () => ({ uid: 'u1', email: 'maria@ejemplo.com' }),
        },
      },
      {
        provide: BodaStore,
        useValue: { boda: signal({ ...BODA_DE_PRUEBA, modulos }) },
      },
      TareasStore,
      PresupuestoStore,
      ProveedoresStore,
    ],
  };
}
