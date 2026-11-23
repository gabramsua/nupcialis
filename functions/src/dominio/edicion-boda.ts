/**
 * Editar los datos de una boda desde el superadmin (D-53).
 *
 * Solo lo que el superadmin puede querer corregir sin que la pareja entre: los
 * nombres, la fecha, el tipo de ceremonia, el plan, el teléfono de contacto, el
 * **precio acordado** (D-56) y —desde D-55— la **dirección de la web** (slug). Cambiarla es delicado: está
 * autorizada en Firebase Auth y puede estar ya repartida en WhatsApp, así que la
 * función que la aplica reserva la nueva, libera la vieja y avisa al superadmin.
 *
 * A diferencia del alta, **la fecha puede estar en el pasado**: corregir una
 * boda que ya se celebró es un caso normal.
 *
 * Dominio puro: devuelve qué escribir o por qué no vale.
 */

import { normalizarTelefono } from './invitados';
import type { Plan } from './planes';
import { normalizarYValidar } from './slug';

export interface EdicionDeBoda {
  readonly partnerA?: string;
  readonly partnerB?: string;
  readonly weddingDate?: Date;
  readonly ceremonyType?: 'civil' | 'religious';
  readonly plan?: Plan;
  /** La dirección nueva, ya normalizada y válida. */
  readonly slug?: string;
  /** `null`: se borra el teléfono de contacto. */
  readonly contactPhone?: string | null;
  /** Lo acordado con esta pareja, en céntimos; `null` lo quita (D-56). */
  readonly agreedPriceCents?: number | null;
}

export type MotivoEdicion =
  'vacio' | 'nombres' | 'fecha' | 'ceremonia' | 'plan' | 'telefono' | 'slug' | 'precio' | 'nada';

export type ResultadoEdicion =
  | { readonly ok: true; readonly cambios: EdicionDeBoda }
  | { readonly ok: false; readonly motivo: MotivoEdicion };

const NOMBRE_MAX = 60;
/** Cien mil euros: más que cualquier boda, y corta un cero de más al teclear. */
export const PRECIO_MAX_CENTIMOS = 10_000_000;
const FORMA_FECHA = /^\d{4}-\d{2}-\d{2}$/;

function limpio(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim().replace(/\s+/g, ' ') : '';
}

export function validarEdicion(bruto: unknown): ResultadoEdicion {
  const e = (bruto !== null && typeof bruto === 'object' ? bruto : {}) as Record<string, unknown>;
  const cambios: {
    -readonly [K in keyof EdicionDeBoda]: EdicionDeBoda[K];
  } = {};

  for (const campo of ['partnerA', 'partnerB'] as const) {
    if (e[campo] === undefined) continue;
    const nombre = limpio(e[campo]);
    if (nombre === '') return { ok: false, motivo: 'vacio' };
    if (nombre.length > NOMBRE_MAX) return { ok: false, motivo: 'nombres' };
    cambios[campo] = nombre;
  }

  if (e['weddingDate'] !== undefined) {
    const texto = limpio(e['weddingDate']);
    const fecha = new Date(texto);
    const anio = fecha.getUTCFullYear();
    if (!FORMA_FECHA.test(texto) || Number.isNaN(fecha.getTime()) || anio < 2000 || anio > 2100) {
      return { ok: false, motivo: 'fecha' };
    }
    // `new Date('2027-06-12')` ya es medianoche UTC; un 31 de febrero se desborda.
    if (fecha.toISOString().slice(0, 10) !== texto) return { ok: false, motivo: 'fecha' };
    cambios.weddingDate = fecha;
  }

  if (e['ceremonyType'] !== undefined) {
    if (e['ceremonyType'] !== 'civil' && e['ceremonyType'] !== 'religious') {
      return { ok: false, motivo: 'ceremonia' };
    }
    cambios.ceremonyType = e['ceremonyType'];
  }

  if (e['plan'] !== undefined) {
    if (e['plan'] !== 'basic' && e['plan'] !== 'extended') return { ok: false, motivo: 'plan' };
    cambios.plan = e['plan'];
  }

  if (e['slug'] !== undefined) {
    const slug = normalizarYValidar(limpio(e['slug']));
    if (!slug.ok) return { ok: false, motivo: 'slug' };
    cambios.slug = slug.slug;
  }

  if (e['contactPhone'] !== undefined) {
    const escrito = limpio(e['contactPhone']);
    if (escrito === '') {
      cambios.contactPhone = null;
    } else {
      const telefono = normalizarTelefono(escrito);
      if (telefono === null) return { ok: false, motivo: 'telefono' };
      cambios.contactPhone = telefono;
    }
  }

  if (e['agreedPriceCents'] !== undefined) {
    const precio = e['agreedPriceCents'];
    if (precio === null) {
      cambios.agreedPriceCents = null;
    } else if (
      typeof precio !== 'number' ||
      !Number.isInteger(precio) ||
      precio < 0 ||
      precio > PRECIO_MAX_CENTIMOS
    ) {
      return { ok: false, motivo: 'precio' };
    } else {
      cambios.agreedPriceCents = precio;
    }
  }

  return Object.keys(cambios).length === 0 ? { ok: false, motivo: 'nada' } : { ok: true, cambios };
}
