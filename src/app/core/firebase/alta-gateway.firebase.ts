/**
 * Implementación del alta de bodas con Cloud Functions.
 *
 * El trabajo de este fichero es traducir: los errores que devuelve una función
 * invocable llegan como `FunctionsError`, con un código y un `details` sin
 * tipar, y aquí se convierten en los casos concretos que la pantalla sabe
 * contar. Dejar que un `functions/already-exists` llegue hasta la plantilla
 * acaba en un "ha ocurrido un error" que no ayuda a nadie.
 */

import { inject } from '@angular/core';
import { httpsCallable } from 'firebase/functions';

import {
  type AltaCreada,
  type DatosDeAlta,
  type FalloAlta,
  type PuertaAlta,
  type ResultadoAlta,
} from '../alta/alta-gateway';
import { FIREBASE_FUNCTIONS } from './functions.providers';

interface ErrorInvocable {
  readonly code?: string;
  readonly message?: string;
  readonly details?: unknown;
}

export function crearPuertaAltaFirebase(): PuertaAlta {
  const functions = inject(FIREBASE_FUNCTIONS);

  return {
    async crearBoda(datos: DatosDeAlta): Promise<ResultadoAlta> {
      const provisionWedding = httpsCallable<DatosDeAlta, AltaCreada>(
        functions,
        'provisionWedding',
      );

      try {
        const respuesta = await provisionWedding(datos);
        return { ok: true, alta: respuesta.data };
      } catch (error) {
        return { ok: false, fallo: traducir(error) };
      }
    },

    async autorizarDominio(weddingId: string) {
      const authorizeWeddingDomain = httpsCallable<{ weddingId: string }, { dominio: string }>(
        functions,
        'authorizeWeddingDomain',
      );

      try {
        const respuesta = await authorizeWeddingDomain({ weddingId });
        return { ok: true, mensaje: `${respuesta.data.dominio} autorizado en Firebase Auth.` };
      } catch (error) {
        const fallo = traducir(error);
        return {
          ok: false,
          mensaje: fallo.tipo === 'error' ? fallo.mensaje : 'No se pudo autorizar el subdominio.',
        };
      }
    },
  };
}

function traducir(error: unknown): FalloAlta {
  const fallo = (error ?? {}) as ErrorInvocable;
  const detalles = (fallo.details ?? {}) as Record<string, unknown>;

  switch (fallo.code) {
    case 'functions/already-exists':
      return {
        tipo: 'slug-ocupado' as const,
        alternativas: Array.isArray(detalles['alternativas'])
          ? detalles['alternativas'].filter((x): x is string => typeof x === 'string')
          : [],
      };

    case 'functions/invalid-argument':
      return { tipo: 'datos-invalidos' as const, campos: camposConError(detalles['motivos']) };

    case 'functions/permission-denied':
    case 'functions/unauthenticated':
      return { tipo: 'sin-permiso' as const };

    default:
      // El mensaje de la función es más útil que uno genérico nuestro: trae el
      // motivo real cuando algo de Firebase falla por debajo.
      return {
        tipo: 'error' as const,
        mensaje: fallo.message ?? 'No se pudo dar de alta la boda.',
      };
  }
}

/** Los campos que la función señaló como inválidos, sin repetirlos. */
function camposConError(motivos: unknown): readonly string[] {
  if (!Array.isArray(motivos)) return [];
  const campos = motivos
    .map((m) =>
      m !== null && typeof m === 'object' ? (m as Record<string, unknown>)['campo'] : null,
    )
    .filter((c): c is string => typeof c === 'string');
  return [...new Set(campos)];
}
