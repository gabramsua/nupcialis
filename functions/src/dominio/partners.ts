/**
 * Los proveedores comercializadores (D-26, F0.7.8) y su liquidación (F0.7.9).
 *
 * Una tienda de invitaciones, un fotógrafo o una finca venden Nupcialis junto con
 * lo suyo: cobran ellos a la pareja y liquidan con nosotros aparte, en efectivo,
 * a una **tarifa mayorista**. **No tienen cuenta ni acceso a nada**: el código es
 * una etiqueta en el cobro, no una credencial.
 *
 * Nada de esto es el proveedor de una boda concreta (`weddings/{id}/vendors`,
 * §8.16): aquellos los contrata la pareja; estos venden el producto.
 *
 * Solo de servidor.
 */

import { MAX_IMPORTE_CENTIMOS, esFechaISO } from './superadmin';

export const MAX_NOMBRE_PROVEEDOR = 80;
export const MAX_CONTACTO = 80;
export const MAX_EMAIL = 120;
export const MAX_TELEFONO = 30;
/** Cuántos cobros se pueden liquidar de una vez. Un batch de Firestore admite 500. */
export const MAX_LIQUIDACION = 200;

export interface PartnerValido {
  readonly name: string;
  /** El del enlace `/alta?ref=CODIGO`. Minúsculas, cifras y guiones. */
  readonly code: string;
  readonly contactName: string;
  readonly email: string;
  readonly phone: string;
  /** Tarifa mayorista en céntimos, por plan. */
  readonly wholesalePrice: { readonly basic: number; readonly extended: number };
  /** Apagado: no sale al dar de alta, pero conserva su historial. */
  readonly active: boolean;
}

export type MotivoPartnerInvalido =
  'nombre' | 'codigo' | 'contacto' | 'email' | 'telefono' | 'precio' | 'activo';

export type ResultadoPartner =
  | { readonly ok: true; readonly partner: PartnerValido }
  | { readonly ok: false; readonly motivo: MotivoPartnerInvalido };

const CODIGO = /^[a-z0-9][a-z0-9-]{2,31}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function texto(valor: unknown, maximo: number): string | null {
  if (valor === undefined || valor === null) return '';
  if (typeof valor !== 'string') return null;
  const limpio = valor.trim();
  return limpio.length > maximo ? null : limpio;
}

function centimos(valor: unknown): number | null {
  return typeof valor === 'number' &&
    Number.isInteger(valor) &&
    valor >= 0 &&
    valor <= MAX_IMPORTE_CENTIMOS
    ? valor
    : null;
}

export function validarPartner(valor: unknown): ResultadoPartner {
  if (valor === null || typeof valor !== 'object') return { ok: false, motivo: 'nombre' };
  const p = valor as Record<string, unknown>;

  const name = texto(p['name'], MAX_NOMBRE_PROVEEDOR);
  if (name === null || name === '') return { ok: false, motivo: 'nombre' };

  const code = typeof p['code'] === 'string' ? p['code'].trim().toLowerCase() : '';
  if (!CODIGO.test(code) || code.includes('--')) return { ok: false, motivo: 'codigo' };

  const contactName = texto(p['contactName'], MAX_CONTACTO);
  if (contactName === null) return { ok: false, motivo: 'contacto' };

  const email = texto(p['email'], MAX_EMAIL);
  if (email === null || (email !== '' && !EMAIL.test(email))) return { ok: false, motivo: 'email' };

  const phone = texto(p['phone'], MAX_TELEFONO);
  if (phone === null) return { ok: false, motivo: 'telefono' };

  const precios = p['wholesalePrice'];
  if (precios === null || typeof precios !== 'object') return { ok: false, motivo: 'precio' };
  const basic = centimos((precios as Record<string, unknown>)['basic']);
  const extended = centimos((precios as Record<string, unknown>)['extended']);
  if (basic === null || extended === null) return { ok: false, motivo: 'precio' };

  if (typeof p['active'] !== 'boolean') return { ok: false, motivo: 'activo' };

  return {
    ok: true,
    partner: {
      name,
      code,
      contactName,
      email,
      phone,
      wholesalePrice: { basic, extended },
      active: p['active'],
    },
  };
}

// ---------- liquidación ----------

export interface CobroParaLiquidar {
  readonly id: string;
  readonly partnerId: string;
  readonly status: string;
}

export type MotivoLiquidacion =
  | 'proveedor'
  | 'seleccion'
  | 'demasiados'
  | 'fecha'
  | 'no-existe'
  | 'otro-proveedor'
  | 'ya-cobrado';

export type ResultadoLiquidacion =
  | { readonly ok: true; readonly ids: readonly string[] }
  | { readonly ok: false; readonly motivo: MotivoLiquidacion; readonly id?: string };

/**
 * Decide qué cobros se pueden cerrar de una vez, **todo o nada**.
 *
 * Es la parte que importa: un cobro de otro proveedor colado en la selección, o
 * uno ya cobrado, no se «salta»; la operación entera se rechaza y dice cuál fue.
 * Una liquidación a medias es justo el tipo de cuenta que luego no cuadra.
 */
export function planificarLiquidacion(entrada: {
  readonly partnerId: unknown;
  readonly ids: unknown;
  readonly fecha: unknown;
  readonly cobros: readonly CobroParaLiquidar[];
}): ResultadoLiquidacion {
  const partnerId = typeof entrada.partnerId === 'string' ? entrada.partnerId.trim() : '';
  if (partnerId === '' || partnerId.includes('/')) return { ok: false, motivo: 'proveedor' };

  if (!esFechaISO(entrada.fecha)) return { ok: false, motivo: 'fecha' };

  if (!Array.isArray(entrada.ids) || entrada.ids.length === 0) {
    return { ok: false, motivo: 'seleccion' };
  }
  const ids = [...new Set(entrada.ids.filter((x): x is string => typeof x === 'string'))];
  if (ids.length === 0) return { ok: false, motivo: 'seleccion' };
  if (ids.length > MAX_LIQUIDACION) return { ok: false, motivo: 'demasiados' };

  const porId = new Map(entrada.cobros.map((c) => [c.id, c]));
  for (const id of ids) {
    const cobro = porId.get(id);
    if (!cobro) return { ok: false, motivo: 'no-existe', id };
    if (cobro.partnerId !== partnerId) return { ok: false, motivo: 'otro-proveedor', id };
    if (cobro.status !== 'pending') return { ok: false, motivo: 'ya-cobrado', id };
  }
  return { ok: true, ids };
}
