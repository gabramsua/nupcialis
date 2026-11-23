/**
 * El formulario de confirmación con Cloud Functions.
 *
 * El trabajo de este fichero es traducir. Un `functions/failed-precondition`
 * tiene que llegar a la pantalla como «el plazo terminó el 1 de junio», y un
 * `functions/invalid-argument` como «te falta el menú», señalando esa pregunta y
 * no las otras siete. Si eso se hiciera en la pantalla, el invitado leería
 * «INTERNAL» encima de un formulario que acaba de rellenar entero.
 */

import { inject } from '@angular/core';
import { httpsCallable } from 'firebase/functions';

import {
  TIPOS_PREGUNTA,
  type Acompanante,
  type CampoDelAcompanante,
  type DatosAcompanante,
  type FalloAcompanante,
  type MotivoSinCupo,
  type ResultadoAcompanante,
  type ResultadoBorradoAcompanante,
  type FalloPregunta,
  type FalloRsvp,
  type Formulario,
  type Pregunta,
  type PuertaRsvp,
  type Respuestas,
  type ResultadoEnvio,
  type ResultadoFormulario,
  type TipoPregunta,
} from '../rsvp/rsvp-gateway';
import { esModoAcceso } from '../acceso/acceso';
import { FIREBASE_FUNCTIONS } from './functions.providers';

interface ErrorInvocable {
  readonly code?: string;
  readonly message?: string;
  readonly details?: unknown;
}

const MOTIVOS: readonly FalloPregunta['motivo'][] = [
  'obligatoria',
  'tipo',
  'opcion',
  'largo',
  'rango',
  'fecha',
];

export function crearPuertaRsvpFirebase(): PuertaRsvp {
  const functions = inject(FIREBASE_FUNCTIONS);

  return {
    async leer(): Promise<ResultadoFormulario> {
      const getRsvpForm = httpsCallable<unknown, unknown>(functions, 'getRsvpForm');

      try {
        const respuesta = await getRsvpForm({});
        return { ok: true, formulario: aFormulario(respuesta.data) };
      } catch (error) {
        return { ok: false, fallo: traducir(error) };
      }
    },

    async anadirAcompanante(datos: DatosAcompanante): Promise<ResultadoAcompanante> {
      const addCompanion = httpsCallable<DatosAcompanante, { id?: unknown; quedan?: unknown }>(
        functions,
        'addCompanion',
      );

      try {
        const respuesta = await addCompanion(datos);
        return {
          ok: true,
          id: typeof respuesta.data.id === 'string' ? respuesta.data.id : '',
          quedan: typeof respuesta.data.quedan === 'number' ? respuesta.data.quedan : 0,
        };
      } catch (error) {
        return { ok: false, fallo: traducirAcompanante(error) };
      }
    },

    async quitarAcompanante(id: string): Promise<ResultadoBorradoAcompanante> {
      const deleteCompanion = httpsCallable<{ id: string }, unknown>(functions, 'deleteCompanion');

      try {
        await deleteCompanion({ id });
        return { ok: true };
      } catch (error) {
        return { ok: false, fallo: traducirAcompanante(error) };
      }
    },

    async enviar(respuestas: Respuestas): Promise<ResultadoEnvio> {
      const submitRsvp = httpsCallable<{ respuestas: Respuestas }, { estado?: unknown }>(
        functions,
        'submitRsvp',
      );

      try {
        const respuesta = await submitRsvp({ respuestas });
        return {
          ok: true,
          estado: respuesta.data.estado === 'declined' ? 'declined' : 'confirmed',
        };
      } catch (error) {
        return { ok: false, fallo: traducir(error) };
      }
    },
  };
}

/**
 * Lo que llega de la invocable, puesto en forma.
 *
 * Exportada para poder probarla: la respuesta de una función es `unknown` de
 * verdad —la escribe un despliegue que puede ir por delante o por detrás de
 * este código— y una pregunta sin `options` reventaría el `@for` de la
 * plantilla.
 */
export function aFormulario(datos: unknown): Formulario {
  const d = (datos ?? {}) as Record<string, unknown>;
  const estado = d['estado'];

  return {
    preguntas: Array.isArray(d['preguntas']) ? d['preguntas'].flatMap(aPregunta) : [],
    respuestas:
      d['respuestas'] !== null &&
      typeof d['respuestas'] === 'object' &&
      !Array.isArray(d['respuestas'])
        ? (d['respuestas'] as Respuestas)
        : {},
    estado: estado === 'confirmed' || estado === 'declined' ? estado : 'pending',
    nombre: typeof d['nombre'] === 'string' ? d['nombre'] : '',
    limite: typeof d['limite'] === 'string' ? d['limite'] : null,
    // Ante la duda, cerrado: enseñar un formulario que el servidor va a
    // rechazar es peor que decir que el plazo terminó.
    abierto: d['abierto'] === true,
    yaContestado: d['yaContestado'] === true,
    acompanantes: Array.isArray(d['acompanantes']) ? d['acompanantes'].flatMap(aAcompanante) : [],
    puedeAnadirAcompanantes: d['puedeAnadirAcompanantes'] === true,
    quedanAcompanantes: typeof d['quedanAcompanantes'] === 'number' ? d['quedanAcompanantes'] : 0,
    // Ante la duda, pedirlo: un acompañante sin teléfono en un modo que lo
    // exige recibe un enlace que no puede abrir.
    exigeTelefonoDelAcompanante: d['exigeTelefonoDelAcompanante'] !== false,
  };
}

const EDADES = ['adult', 'child', 'baby'] as const;

function aAcompanante(cruda: unknown): readonly Acompanante[] {
  if (cruda === null || typeof cruda !== 'object') return [];
  const a = cruda as Record<string, unknown>;

  const id = typeof a['id'] === 'string' ? a['id'] : '';
  if (id === '') return [];

  const edad = a['ageGroup'];

  return [
    {
      id,
      fullName: typeof a['fullName'] === 'string' ? a['fullName'] : '',
      ageGroup: EDADES.includes(edad as Acompanante['ageGroup'])
        ? (edad as Acompanante['ageGroup'])
        : 'adult',
      yaEntro: a['yaEntro'] === true,
    },
  ];
}

const MOTIVOS_SIN_CUPO: readonly MotivoSinCupo[] = [
  'modulo-apagado',
  'cupo-lleno',
  'es-acompanante',
  'inactivo',
];

/**
 * El error de las funciones de acompañantes, traducido.
 *
 * Aparte del de `submitRsvp` porque los casos son otros: aquí lo que falla es
 * el cupo o un dato del acompañante, y «no puedes» sin decir por qué, delante
 * de un formulario recién rellenado, acaba en un WhatsApp a los novios.
 */
export function traducirAcompanante(error: unknown): FalloAcompanante {
  const fallo = (error ?? {}) as ErrorInvocable;
  const detalles = (fallo.details ?? {}) as Record<string, unknown>;

  switch (fallo.code) {
    case 'functions/failed-precondition': {
      if (detalles['motivo'] === 'ya-entro') return { tipo: 'ya-entro' };
      const motivo = detalles['motivo'];
      return {
        tipo: 'sin-cupo',
        motivo: MOTIVOS_SIN_CUPO.includes(motivo as MotivoSinCupo)
          ? (motivo as MotivoSinCupo)
          : 'modulo-apagado',
      };
    }

    case 'functions/invalid-argument':
      return { tipo: 'datos', campos: camposDelAcompanante(detalles['motivos']) };

    case 'functions/not-found':
      return { tipo: 'no-es-tuyo' };

    case 'functions/permission-denied':
      return detalles['motivo'] === 'sin-verificar'
        ? { tipo: 'pide-verificar' }
        : { tipo: 'sin-sesion' };

    case 'functions/unauthenticated':
      return { tipo: 'sin-sesion' };

    case 'functions/unavailable':
    case 'functions/deadline-exceeded':
      return { tipo: 'red' };

    default:
      return { tipo: 'error', mensaje: fallo.message ?? 'Error desconocido' };
  }
}

function camposDelAcompanante(valor: unknown): readonly CampoDelAcompanante[] {
  if (!Array.isArray(valor)) return [];

  return valor.flatMap((crudo) => {
    if (crudo === null || typeof crudo !== 'object') return [];
    const m = crudo as Record<string, unknown>;
    const campo = m['campo'];
    if (campo !== 'fullName' && campo !== 'phone' && campo !== 'ageGroup') return [];
    return [{ campo, motivo: typeof m['motivo'] === 'string' ? m['motivo'] : 'tipo' }];
  });
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
      label: typeof p['label'] === 'string' ? p['label'] : id,
      helpText: typeof p['helpText'] === 'string' ? p['helpText'] : '',
      type: TIPOS_PREGUNTA.includes(tipo as TipoPregunta) ? (tipo as TipoPregunta) : 'text',
      options: Array.isArray(p['options']) ? p['options'].flatMap(aOpcion) : [],
      required: p['required'] === true,
      visibleIf: aCondicion(p['visibleIf']),
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

function aCondicion(cruda: unknown): Pregunta['visibleIf'] {
  if (cruda === null || typeof cruda !== 'object') return null;
  const c = cruda as Record<string, unknown>;
  const questionId = typeof c['questionId'] === 'string' ? c['questionId'] : '';
  return questionId === '' ? null : { questionId, equals: c['equals'] ?? null };
}

/**
 * Convierte el error del SDK en algo que el invitado entienda.
 *
 * Exportada para poder probarla sin red: en los tests de la pantalla la puerta
 * va doblada y esto no llega a ejecutarse, que es exactamente el agujero por el
 * que una vez salió un «Unauthenticated [401]» a la cara de la pareja.
 */
export function traducir(error: unknown): FalloRsvp {
  const fallo = (error ?? {}) as ErrorInvocable;
  const detalles = (fallo.details ?? {}) as Record<string, unknown>;

  switch (fallo.code) {
    case 'functions/invalid-argument':
      return { tipo: 'respuestas', fallos: fallosDe(detalles['fallos']) };

    case 'functions/failed-precondition':
      return {
        tipo: 'plazo-cerrado',
        limite: typeof detalles['limite'] === 'string' ? detalles['limite'] : null,
      };

    // La boda ya no está publicada, o el invitado ya no está en la lista.
    case 'functions/not-found':
      return { tipo: 'no-disponible' };

    case 'functions/permission-denied':
      // Dentro por el enlace, pero esto pide los cuatro dígitos (D-34). No es
      // lo mismo que una sesión caducada y no se arregla igual: aquí se le
      // pregunta, allí se le manda a la puerta.
      if (detalles['motivo'] === 'sin-verificar') {
        return {
          tipo: 'pide-verificar',
          modo: esModoAcceso(detalles['modo']) ? detalles['modo'] : 'name_phone4',
        };
      }
      return { tipo: 'sin-sesion' };

    // 401 con sesión: el sospechoso es App Check.
    case 'functions/unauthenticated':
      return { tipo: 'sin-verificar' };

    case 'functions/unavailable':
    case 'functions/deadline-exceeded':
      return { tipo: 'red' };

    default:
      return { tipo: 'error', mensaje: fallo.message ?? 'Error desconocido' };
  }
}

function fallosDe(valor: unknown): readonly FalloPregunta[] {
  if (!Array.isArray(valor)) return [];

  return valor.flatMap((crudo) => {
    if (crudo === null || typeof crudo !== 'object') return [];
    const f = crudo as Record<string, unknown>;
    const questionId = typeof f['questionId'] === 'string' ? f['questionId'] : '';
    const motivo = f['motivo'];
    if (questionId === '') return [];
    return [
      {
        questionId,
        motivo: MOTIVOS.includes(motivo as FalloPregunta['motivo'])
          ? (motivo as FalloPregunta['motivo'])
          : 'tipo',
      },
    ];
  });
}
