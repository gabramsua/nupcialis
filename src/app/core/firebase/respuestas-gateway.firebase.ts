/**
 * Las respuestas del formulario, con Cloud Functions.
 *
 * Traduce, como el resto de los adaptadores: lo que llega es `unknown` —lo
 * escribe un despliegue que puede ir por delante o por detrás de este código— y
 * un invitado sin `respuestas` reventaría el recuento.
 */

import { inject } from '@angular/core';
import { httpsCallable } from 'firebase/functions';

import type {
  FalloAlGuardar,
  FalloDePregunta,
  FalloRespuestas,
  PuertaRespuestas,
  RespuestasDeInvitado,
  ResultadoGuardarRespuesta,
  ResultadoRespuestaEnLote,
  ResultadoRespuestas,
} from '../rsvp/respuestas-gateway';
import { TIPOS_PREGUNTA, type Pregunta, type TipoPregunta } from '../rsvp/rsvp-gateway';
import { FIREBASE_FUNCTIONS } from './functions.providers';

interface ErrorInvocable {
  readonly code?: string;
  readonly message?: string;
}

export function crearPuertaRespuestasFirebase(): PuertaRespuestas {
  const functions = inject(FIREBASE_FUNCTIONS);

  return {
    async leer(): Promise<ResultadoRespuestas> {
      const listRsvpAnswers = httpsCallable<unknown, unknown>(functions, 'listRsvpAnswers');

      try {
        const respuesta = await listRsvpAnswers({});
        const d = (respuesta.data ?? {}) as Record<string, unknown>;

        return {
          ok: true,
          datos: {
            preguntas: Array.isArray(d['preguntas']) ? d['preguntas'].flatMap(aPregunta) : [],
            invitados: Array.isArray(d['invitados']) ? d['invitados'].flatMap(aInvitado) : [],
          },
        };
      } catch (error) {
        return { ok: false, fallo: traducir(error) };
      }
    },

    async guardarEnLote(guestIds, estado): Promise<ResultadoRespuestaEnLote> {
      const setGuestsRsvp = httpsCallable<unknown, unknown>(functions, 'setGuestsRsvp');

      try {
        const resultado = await setGuestsRsvp({ guestIds, estado });
        const d = (resultado.data ?? {}) as Record<string, unknown>;

        return {
          ok: true,
          cambiados: typeof d['cambiados'] === 'number' ? d['cambiados'] : 0,
          omitidos: typeof d['omitidos'] === 'number' ? d['omitidos'] : 0,
        };
      } catch (error) {
        return { ok: false, fallo: traducir(error) };
      }
    },

    async guardar(guestId, respuesta): Promise<ResultadoGuardarRespuesta> {
      const setGuestRsvp = httpsCallable<unknown, unknown>(functions, 'setGuestRsvp');

      try {
        const resultado = await setGuestRsvp({ guestId, ...respuesta });
        const estado = (resultado.data as Record<string, unknown> | null)?.['estado'];

        return {
          ok: true,
          estado: estado === 'confirmed' || estado === 'declined' ? estado : 'pending',
        };
      } catch (error) {
        return { ok: false, fallo: traducirAlGuardar(error) };
      }
    },
  };
}

function aPregunta(cruda: unknown): readonly Pregunta[] {
  if (cruda === null || typeof cruda !== 'object') return [];
  const p = cruda as Record<string, unknown>;

  const id = typeof p['id'] === 'string' ? p['id'] : '';
  if (id === '') return [];

  const tipo = p['type'];

  return [
    {
      id,
      label: typeof p['label'] === 'string' && p['label'] !== '' ? p['label'] : id,
      helpText: typeof p['helpText'] === 'string' ? p['helpText'] : '',
      type: TIPOS_PREGUNTA.includes(tipo as TipoPregunta) ? (tipo as TipoPregunta) : 'text',
      options: Array.isArray(p['options']) ? p['options'].flatMap(aOpcion) : [],
      required: p['required'] === true,
      visibleIf: aCondicion(p['visibleIf']),
      order: typeof p['order'] === 'number' ? p['order'] : 0,
      target:
        p['target'] === 'guest' || p['target'] === 'companion' ? p['target'] : ('both' as const),
      mapsTo: typeof p['mapsTo'] === 'string' && p['mapsTo'] !== '' ? p['mapsTo'] : null,
      enabled: p['enabled'] !== false,
    },
  ];
}

function aCondicion(cruda: unknown): Pregunta['visibleIf'] {
  if (cruda === null || typeof cruda !== 'object') return null;
  const c = cruda as Record<string, unknown>;
  const questionId = typeof c['questionId'] === 'string' ? c['questionId'] : '';
  return questionId === '' ? null : { questionId, equals: c['equals'] ?? null };
}

function aOpcion(cruda: unknown): readonly { value: string; label: string }[] {
  if (cruda === null || typeof cruda !== 'object') return [];
  const o = cruda as Record<string, unknown>;
  const value = typeof o['value'] === 'string' ? o['value'] : '';
  if (value === '') return [];
  return [
    { value, label: typeof o['label'] === 'string' && o['label'] !== '' ? o['label'] : value },
  ];
}

function aInvitado(crudo: unknown): readonly RespuestasDeInvitado[] {
  if (crudo === null || typeof crudo !== 'object') return [];
  const i = crudo as Record<string, unknown>;

  const guestId = typeof i['guestId'] === 'string' ? i['guestId'] : '';
  if (guestId === '') return [];

  const estado = i['estado'];
  const respuestas = i['respuestas'];

  return [
    {
      guestId,
      nombre: typeof i['nombre'] === 'string' ? i['nombre'] : '',
      mote: typeof i['mote'] === 'string' ? i['mote'] : '',
      estado: estado === 'confirmed' || estado === 'declined' ? estado : 'pending',
      esAcompanante: i['esAcompanante'] === true,
      traidoPor: typeof i['traidoPor'] === 'string' ? i['traidoPor'] : '',
      cuando: typeof i['cuando'] === 'string' ? i['cuando'] : null,
      respuestas:
        respuestas !== null && typeof respuestas === 'object' && !Array.isArray(respuestas)
          ? (respuestas as Record<string, unknown>)
          : {},
    },
  ];
}

/** Exportada para probarla sin red, como las demás traducciones. */
export function traducir(error: unknown): FalloRespuestas {
  const fallo = (error ?? {}) as ErrorInvocable;

  switch (fallo.code) {
    case 'functions/permission-denied':
      return { tipo: 'sin-permiso' };

    case 'functions/unauthenticated':
      return { tipo: 'sin-verificar' };

    case 'functions/unavailable':
    case 'functions/deadline-exceeded':
      return { tipo: 'red' };

    default:
      return { tipo: 'error', mensaje: fallo.message ?? 'Error desconocido' };
  }
}

/** Lo de `guardar`: añade lo que solo ese caso puede decir. */
export function traducirAlGuardar(error: unknown): FalloAlGuardar {
  const fallo = (error ?? {}) as ErrorInvocable & { details?: unknown };

  if (fallo.code === 'functions/not-found') return { tipo: 'no-existe' };

  if (fallo.code === 'functions/invalid-argument') {
    const detalles = (fallo.details ?? {}) as Record<string, unknown>;
    const fallos = Array.isArray(detalles['fallos'])
      ? detalles['fallos'].flatMap((f): readonly FalloDePregunta[] => {
          const o = (f ?? {}) as Record<string, unknown>;
          return typeof o['questionId'] === 'string' && typeof o['motivo'] === 'string'
            ? [{ questionId: o['questionId'], motivo: o['motivo'] }]
            : [];
        })
      : [];
    return { tipo: 'no-valen', fallos };
  }

  return traducir(error);
}
