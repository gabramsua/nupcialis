import { InjectionToken } from '@angular/core';

import type { ModoAcceso } from '../acceso/acceso';

/**
 * Puerto del formulario de confirmación.
 *
 * Al otro lado hay dos invocables (`getRsvpForm`, `submitRsvp`) y no hay atajo:
 * las respuestas van en el documento del invitado, que está cerrado a lectura
 * directa, y la validación de verdad es la del servidor.
 *
 * De este lado, una interfaz que se dobla en un test. Es lo que permite probar
 * la pantalla —ocho tipos de campo, visibilidad condicional, fallos por
 * pregunta— sin red y sin una boda de verdad.
 */

export const TIPOS_PREGUNTA = [
  'text',
  'textarea',
  'select',
  'radio',
  'checkbox',
  'number',
  'date',
  'boolean',
] as const;

export type TipoPregunta = (typeof TIPOS_PREGUNTA)[number];

export interface OpcionPregunta {
  readonly value: string;
  readonly label: string;
}

export interface Pregunta {
  readonly id: string;
  readonly label: string;
  readonly helpText: string;
  readonly type: TipoPregunta;
  readonly options: readonly OpcionPregunta[];
  readonly required: boolean;
  readonly visibleIf: { readonly questionId: string; readonly equals: unknown } | null;
  readonly order: number;
}

export type Respuestas = Readonly<Record<string, unknown>>;

/** Un acompañante, como lo ve quien lo añadió. */
export interface Acompanante {
  readonly id: string;
  readonly fullName: string;
  readonly ageGroup: 'adult' | 'child' | 'baby';
  /** Si ya ha entrado en la web, el titular ya no puede quitarlo. */
  readonly yaEntro: boolean;
}

/** Lo que el invitado escribe de su acompañante. Nada más (§5.5, RGPD). */
export interface DatosAcompanante {
  readonly fullName: string;
  readonly phone: string;
  readonly ageGroup: 'adult' | 'child' | 'baby';
}

export interface Formulario {
  readonly preguntas: readonly Pregunta[];
  readonly respuestas: Respuestas;
  readonly estado: 'pending' | 'confirmed' | 'declined';
  /** El mote del invitado, para saludarle por su nombre. */
  readonly nombre: string;
  /** `YYYY-MM-DD`, o `null` si la pareja no ha puesto fecha límite. */
  readonly limite: string | null;
  readonly abierto: boolean;
  readonly yaContestado: boolean;
  /** A quién trae ya, y si puede traer a alguien más. */
  readonly acompanantes: readonly Acompanante[];
  readonly puedeAnadirAcompanantes: boolean;
  readonly quedanAcompanantes: number;
  /** Si hay que pedirle el teléfono del acompañante para que pueda entrar. */
  readonly exigeTelefonoDelAcompanante: boolean;
}

/** Qué pregunta falla y por qué, para poder señalarla en la pantalla. */
export interface FalloPregunta {
  readonly questionId: string;
  readonly motivo: 'obligatoria' | 'tipo' | 'opcion' | 'largo' | 'rango' | 'fecha';
}

/**
 * Lo que puede salir mal.
 *
 * `plazo-cerrado` lleva la fecha: delante de un formulario recién rellenado,
 * «no se puede» sin decir hasta cuándo se podía es lo que hace que la gente le
 * dé cinco veces al botón.
 */
/** Por qué no puede añadir a nadie, cuando no puede. */
export type MotivoSinCupo =
  'modulo-apagado' | 'sin-cupo' | 'cupo-lleno' | 'es-acompanante' | 'inactivo';

export interface CampoDelAcompanante {
  readonly campo: 'fullName' | 'phone' | 'ageGroup';
  readonly motivo: string;
}

export type FalloAcompanante =
  | { readonly tipo: 'sin-cupo'; readonly motivo: MotivoSinCupo }
  | { readonly tipo: 'pide-verificar' }
  | { readonly tipo: 'datos'; readonly campos: readonly CampoDelAcompanante[] }
  | { readonly tipo: 'ya-entro' }
  | { readonly tipo: 'no-es-tuyo' }
  | { readonly tipo: 'sin-sesion' }
  | { readonly tipo: 'red' }
  | { readonly tipo: 'error'; readonly mensaje: string };

export type ResultadoAcompanante =
  | { readonly ok: true; readonly id: string; readonly quedan: number }
  | { readonly ok: false; readonly fallo: FalloAcompanante };

export type ResultadoBorradoAcompanante =
  { readonly ok: true } | { readonly ok: false; readonly fallo: FalloAcompanante };

export type FalloRsvp =
  | { readonly tipo: 'sin-sesion' }
  /**
   * Está dentro por el enlace, pero esto pide los cuatro dígitos (D-34).
   *
   * Lleva el modo porque la pantalla tiene que saber qué preguntar: los cuatro
   * dígitos en modo B, el teléfono entero en modo C.
   */
  | { readonly tipo: 'pide-verificar'; readonly modo: ModoAcceso }
  | { readonly tipo: 'no-disponible' }
  | { readonly tipo: 'plazo-cerrado'; readonly limite: string | null }
  | { readonly tipo: 'respuestas'; readonly fallos: readonly FalloPregunta[] }
  | { readonly tipo: 'sin-verificar' }
  | { readonly tipo: 'red' }
  | { readonly tipo: 'error'; readonly mensaje: string };

export type ResultadoFormulario =
  | { readonly ok: true; readonly formulario: Formulario }
  | { readonly ok: false; readonly fallo: FalloRsvp };

export type ResultadoEnvio =
  | { readonly ok: true; readonly estado: 'confirmed' | 'declined' }
  | { readonly ok: false; readonly fallo: FalloRsvp };

export interface PuertaRsvp {
  leer(): Promise<ResultadoFormulario>;
  enviar(respuestas: Respuestas): Promise<ResultadoEnvio>;
  anadirAcompanante(datos: DatosAcompanante): Promise<ResultadoAcompanante>;
  quitarAcompanante(id: string): Promise<ResultadoBorradoAcompanante>;
}

export const PUERTA_RSVP = new InjectionToken<PuertaRsvp>('PUERTA_RSVP');
