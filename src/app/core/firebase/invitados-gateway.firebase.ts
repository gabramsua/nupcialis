/**
 * La lista de invitados con Cloud Functions.
 *
 * El trabajo de este fichero es traducir: los errores de una invocable llegan
 * como `FunctionsError`, con un código y un `details` sin tipar, y aquí se
 * convierten en los casos concretos que la pantalla sabe contar. Dejar que un
 * `functions/already-exists` llegue a la plantilla acaba en un "ha ocurrido un
 * error" que no le dice a nadie que el invitado ya estaba.
 */

import { inject } from '@angular/core';
import { httpsCallable } from 'firebase/functions';

import {
  type DatosInvitado,
  type FalloInvitado,
  type Invitado,
  type PuertaInvitados,
  type ResultadoBorrado,
  type ResultadoGuardado,
  type ResultadoListado,
} from '../invitados/invitados-gateway';
import { FIREBASE_FUNCTIONS } from './functions.providers';

interface ErrorInvocable {
  readonly code?: string;
  readonly message?: string;
  readonly details?: unknown;
}

export function crearPuertaInvitadosFirebase(): PuertaInvitados {
  const functions = inject(FIREBASE_FUNCTIONS);

  return {
    async listar(): Promise<ResultadoListado> {
      const listGuests = httpsCallable<unknown, { invitados: readonly Invitado[] }>(
        functions,
        'listGuests',
      );

      try {
        const respuesta = await listGuests({});
        return { ok: true, invitados: respuesta.data.invitados ?? [] };
      } catch (error) {
        return { ok: false, fallo: traducir(error) };
      }
    },

    async guardar(datos: DatosInvitado, forzar = false): Promise<ResultadoGuardado> {
      const upsertGuest = httpsCallable<
        DatosInvitado & { forzar: boolean },
        { id: string; creado: boolean }
      >(functions, 'upsertGuest');

      try {
        const respuesta = await upsertGuest({ ...datos, forzar });
        return { ok: true, id: respuesta.data.id, creado: respuesta.data.creado };
      } catch (error) {
        return { ok: false, fallo: traducir(error) };
      }
    },

    async borrar(id: string): Promise<ResultadoBorrado> {
      const deleteGuest = httpsCallable<{ id: string }, { borrado: boolean }>(
        functions,
        'deleteGuest',
      );

      try {
        await deleteGuest({ id });
        return { ok: true };
      } catch (error) {
        return { ok: false, fallo: traducir(error) };
      }
    },
  };
}

/**
 * Convierte el error del SDK en un caso que la pantalla sabe contar.
 *
 * Exportada **para poder probarla**. Es la pieza que evita que un
 * `functions/unauthenticated` llegue a la pareja como «Unauthenticated [401]»,
 * y eso no se puede comprobar desde un test de la pantalla: ahí la puerta ya
 * viene doblada y la traducción no llega a ejecutarse. Ya pasó una vez.
 */
export function traducir(error: unknown): FalloInvitado {
  const fallo = (error ?? {}) as ErrorInvocable;
  const detalles = (fallo.details ?? {}) as Record<string, unknown>;

  switch (fallo.code) {
    case 'functions/invalid-argument':
      return { tipo: 'datos-invalidos', campos: camposConError(detalles['motivos']) };

    case 'functions/already-exists':
      return {
        tipo: 'duplicado',
        id: typeof detalles['duplicadoDe'] === 'string' ? detalles['duplicadoDe'] : '',
        motivo: detalles['motivo'] === 'telefono' ? 'telefono' : 'nombre',
      };

    case 'functions/failed-precondition':
      return {
        tipo: 'con-acompanantes',
        cuantos: typeof detalles['acompanantes'] === 'number' ? detalles['acompanantes'] : 0,
      };

    case 'functions/permission-denied':
      return { tipo: 'sin-permiso' };

    // 401. Con sesión iniciada y claim correcto, el sospechoso es App Check.
    case 'functions/unauthenticated':
      return { tipo: 'sin-verificar' };

    default:
      return { tipo: 'error', mensaje: fallo.message ?? 'No se ha podido guardar el invitado.' };
  }
}

/** Los campos que la función señaló como inválidos, con su motivo. */
function camposConError(motivos: unknown): readonly { campo: string; motivo: string }[] {
  if (!Array.isArray(motivos)) return [];

  return motivos
    .map((m) => (m !== null && typeof m === 'object' ? (m as Record<string, unknown>) : {}))
    .filter((m) => typeof m['campo'] === 'string')
    .map((m) => ({
      campo: m['campo'] as string,
      motivo: typeof m['motivo'] === 'string' ? m['motivo'] : 'invalido',
    }));
}
