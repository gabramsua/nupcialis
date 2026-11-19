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
  FalloRespuestas,
  PuertaRespuestas,
  RespuestasDeInvitado,
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
      visibleIf: null,
      order: typeof p['order'] === 'number' ? p['order'] : 0,
    },
  ];
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
