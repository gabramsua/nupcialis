import { entero, lista, objeto, texto } from '../../../core/llamadas/llamadas-gateway';

/**
 * Las solicitudes que llegan por el formulario de la HOME (D-68).
 *
 * Lo que vuelve de `listWeddingRequests` es `unknown` hasta pasar por estos
 * lectores (D-19).
 */

export const ESTADOS = ['new', 'contacted', 'converted', 'discarded'] as const;
export type Estado = (typeof ESTADOS)[number];

export interface Solicitud {
  readonly id: string;
  readonly names: string;
  readonly email: string;
  readonly phone: string;
  readonly weddingDate: string;
  readonly plan: 'basic' | 'extended' | 'undecided';
  readonly message: string;
  readonly status: Estado;
  readonly note: string;
  /** Milisegundos desde 1970; 0 si el servidor no la tiene. */
  readonly createdAt: number;
}

export interface DatosDeSolicitudes {
  readonly notifyEmail: string;
  readonly solicitudes: readonly Solicitud[];
}

function estado(valor: unknown): Estado {
  return (ESTADOS as readonly unknown[]).includes(valor) ? (valor as Estado) : 'new';
}

export function leerSolicitud(valor: unknown): Solicitud | null {
  const o = objeto(valor);
  const id = texto(o['id']);
  if (id === '') return null;
  const plan = o['plan'] === 'basic' || o['plan'] === 'extended' ? o['plan'] : 'undecided';
  return {
    id,
    names: texto(o['names']),
    email: texto(o['email']),
    phone: texto(o['phone']),
    weddingDate: texto(o['weddingDate']),
    plan,
    message: texto(o['message']),
    status: estado(o['status']),
    note: texto(o['note']),
    createdAt: entero(o['createdAt']),
  };
}

export function leerSolicitudes(valor: unknown): DatosDeSolicitudes | null {
  const o = objeto(valor);
  if (!Array.isArray(o['solicitudes'])) return null;
  return {
    notifyEmail: texto(o['notifyEmail']),
    solicitudes: lista(o['solicitudes']).flatMap((s) => {
      const leida = leerSolicitud(s);
      return leida ? [leida] : [];
    }),
  };
}

export function leerAviso(valor: unknown): string | null {
  const o = objeto(valor);
  return o['ok'] === true ? texto(o['notifyEmail']) : null;
}

export function leerOk(valor: unknown): true | null {
  return objeto(valor)['ok'] === true ? true : null;
}

/** Cuántas están sin atender: es lo que importa mirar primero. */
export function nuevas(solicitudes: readonly Solicitud[]): number {
  return solicitudes.filter((s) => s.status === 'new').length;
}
