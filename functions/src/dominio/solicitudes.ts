/**
 * Las solicitudes que llegan por el formulario de la HOME de `nupcialis.com`.
 *
 * Una pareja que todavía no es cliente deja su nombre y su correo; Gabriel
 * contesta. Dominio puro, sin Firebase: valida lo que escribe un desconocido
 * (la HOME es pública) y decide cuándo hay que frenarlo.
 *
 * **Todo es texto plano.** Nada de HTML: ni se guarda ni se pinta como HTML, y
 * en el correo de aviso se escapa.
 */

import { esCorreoValido } from './correos';

export const MAX_NOMBRES = 120;
export const MAX_TELEFONO_SOLICITUD = 30;
export const MAX_FECHA_TEXTO = 60;
export const MAX_MENSAJE = 1200;
export const MAX_NOTA = 600;

/** Qué plan le interesa. `undecided` = «aún no lo sé». */
export const PLANES_DE_SOLICITUD = ['basic', 'extended', 'undecided'] as const;
export type PlanDeSolicitud = (typeof PLANES_DE_SOLICITUD)[number];

export const ESTADOS_DE_SOLICITUD = ['new', 'contacted', 'converted', 'discarded'] as const;
export type EstadoDeSolicitud = (typeof ESTADOS_DE_SOLICITUD)[number];

export function esEstadoDeSolicitud(valor: unknown): valor is EstadoDeSolicitud {
  return typeof valor === 'string' && (ESTADOS_DE_SOLICITUD as readonly string[]).includes(valor);
}

export interface SolicitudValida {
  readonly names: string;
  readonly email: string;
  readonly phone: string;
  readonly weddingDate: string;
  readonly plan: PlanDeSolicitud;
  readonly message: string;
}

export type MotivoSolicitudInvalida = 'nombres' | 'correo' | 'telefono' | 'plan' | 'consentimiento';

export type ResultadoSolicitud =
  | { readonly ok: true; readonly solicitud: SolicitudValida }
  | { readonly ok: false; readonly motivo: MotivoSolicitudInvalida };

function plano(valor: unknown, maximo: number): string {
  if (typeof valor !== 'string') return '';
  // Sin caracteres de control (salvo el salto de línea) y con los espacios recortados.
  const limpio = [...valor.replace(/\r\n/g, '\n')]
    .filter((c) => {
      const n = c.charCodeAt(0);
      return n === 10 || (n > 31 && n !== 127);
    })
    .join('');
  return limpio.trim().slice(0, maximo);
}

/**
 * Valida lo que manda el formulario. Los campos que la HOME no pregunta
 * (teléfono, fecha, mensaje) llegan vacíos y valen vacíos.
 */
export function validarSolicitud(crudo: unknown): ResultadoSolicitud {
  const o =
    crudo !== null && typeof crudo === 'object' && !Array.isArray(crudo)
      ? (crudo as Record<string, unknown>)
      : {};

  if (o['consent'] !== true) return { ok: false, motivo: 'consentimiento' };

  const names = plano(o['names'], MAX_NOMBRES);
  if (names.length < 2) return { ok: false, motivo: 'nombres' };

  const email = plano(o['email'], 254).toLowerCase();
  if (!esCorreoValido(email)) return { ok: false, motivo: 'correo' };

  const phone = plano(o['phone'], MAX_TELEFONO_SOLICITUD);
  if (phone !== '' && !/^[0-9+()\-.\s]{6,30}$/.test(phone))
    return { ok: false, motivo: 'telefono' };

  const plan = o['plan'] === undefined || o['plan'] === '' ? 'undecided' : o['plan'];
  if (!(PLANES_DE_SOLICITUD as readonly unknown[]).includes(plan)) {
    return { ok: false, motivo: 'plan' };
  }

  return {
    ok: true,
    solicitud: {
      names,
      email,
      phone,
      weddingDate: plano(o['weddingDate'], MAX_FECHA_TEXTO),
      plan: plan as PlanDeSolicitud,
      message: plano(o['message'], MAX_MENSAJE),
    },
  };
}

// ---------------------------------------------------------------------------
// El freno: cuántas solicitudes por IP y hora
// ---------------------------------------------------------------------------

export const MAX_SOLICITUDES_POR_VENTANA = 5;
export const VENTANA_MS = 60 * 60 * 1000;

export interface ContadorDeSolicitudes {
  /** Cuándo empezó la ventana actual (ms). */
  readonly desde: number;
  readonly n: number;
}

/**
 * ¿Puede esta IP mandar otra solicitud? Devuelve el contador nuevo si puede.
 *
 * Es una ventana fija, sin más: el objetivo no es parar a un atacante decidido
 * (para eso está App Check) sino que un bucle o un bot torpe no llene la
 * bandeja de Gabriel ni la cola de correo.
 */
export function registrarSolicitud(
  actual: ContadorDeSolicitudes | null,
  ahora: number,
):
  | { readonly permitido: true; readonly contador: ContadorDeSolicitudes }
  | { readonly permitido: false } {
  if (!actual || ahora - actual.desde >= VENTANA_MS || actual.desde > ahora) {
    return { permitido: true, contador: { desde: ahora, n: 1 } };
  }
  if (actual.n >= MAX_SOLICITUDES_POR_VENTANA) return { permitido: false };
  return { permitido: true, contador: { desde: actual.desde, n: actual.n + 1 } };
}

// ---------------------------------------------------------------------------
// El correo de aviso a Gabriel
// ---------------------------------------------------------------------------

export const ETIQUETA_DE_PLAN: Readonly<Record<PlanDeSolicitud, string>> = {
  basic: 'Básico',
  extended: 'Extendido',
  undecided: 'Aún no lo sabe',
};

/** El texto plano del aviso. El HTML lo monta quien lo envía, escapando cada línea. */
export function lineasDeAviso(s: SolicitudValida): readonly string[] {
  return [
    `Nombres: ${s.names}`,
    `Correo: ${s.email}`,
    ...(s.phone ? [`Teléfono: ${s.phone}`] : []),
    ...(s.weddingDate ? [`Fecha de la boda: ${s.weddingDate}`] : []),
    `Plan: ${ETIQUETA_DE_PLAN[s.plan]}`,
    ...(s.message ? ['', s.message] : []),
  ];
}

/** El correo al que avisar: el guardado, o ninguno (la bandeja sigue funcionando). */
export function correoDeAviso(guardado: unknown): string {
  return esCorreoValido(guardado) ? guardado : '';
}
