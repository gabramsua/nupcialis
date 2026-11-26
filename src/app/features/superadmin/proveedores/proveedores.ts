import { entero, lista, objeto, texto } from '../../../core/llamadas/llamadas-gateway';
import type { Pago } from '../gestion/gestion';

/**
 * Los proveedores comercializadores y lo que nos deben (D-26, F0.7.8, F0.7.9).
 *
 * Lo que vuelve de las funciones es `unknown` hasta pasar por estos lectores
 * (D-19). El saldo se calcula aquí a partir de los cobros: no se guarda en
 * ningún sitio, así que no puede quedar desfasado respecto al libro.
 */

export interface Proveedor {
  readonly id: string;
  readonly name: string;
  /** El del enlace `/alta?ref=CODIGO`. Una etiqueta, no una credencial. */
  readonly code: string;
  readonly contactName: string;
  readonly email: string;
  readonly phone: string;
  /** Tarifa mayorista en céntimos, por plan. */
  readonly wholesalePrice: { readonly basic: number; readonly extended: number };
  readonly active: boolean;
}

export type ProveedorEnEdicion = Omit<Proveedor, 'id'>;

export function leerProveedor(valor: unknown): Proveedor | null {
  const o = objeto(valor);
  const id = texto(o['id']);
  if (id === '') return null;
  const precios = objeto(o['wholesalePrice']);
  return {
    id,
    name: texto(o['name']),
    code: texto(o['code']),
    contactName: texto(o['contactName']),
    email: texto(o['email']),
    phone: texto(o['phone']),
    wholesalePrice: { basic: entero(precios['basic']), extended: entero(precios['extended']) },
    active: o['active'] === true,
  };
}

export function leerProveedores(valor: unknown): readonly Proveedor[] | null {
  const o = objeto(valor);
  if (!Array.isArray(o['proveedores'])) return null;
  return lista(o['proveedores']).flatMap((p) => {
    const leido = leerProveedor(p);
    return leido ? [leido] : [];
  });
}

export function leerLiquidacion(valor: unknown): { liquidados: number; totalCents: number } | null {
  const o = objeto(valor);
  return typeof o['liquidados'] === 'number'
    ? { liquidados: entero(o['liquidados']), totalCents: entero(o['totalCents']) }
    : null;
}

export interface SaldoDeProveedor {
  readonly proveedor: Proveedor;
  /** Bodas distintas que entraron por él. */
  readonly bodas: number;
  /** Lo que nos debe: cobros suyos todavía `pending`. */
  readonly pendienteCents: number;
  /** Lo que ya nos ha liquidado. */
  readonly liquidadoCents: number;
  readonly pendientes: readonly Pago[];
}

/**
 * Una fila por proveedor con sus bodas y su saldo, **ordenadas por lo que nos
 * deben**: arriba, a quien hay que llamar.
 */
export function saldosPorProveedor(
  proveedores: readonly Proveedor[],
  pagos: readonly Pago[],
): readonly SaldoDeProveedor[] {
  return proveedores
    .map((proveedor) => {
      const suyos = pagos.filter((p) => p.partnerId === proveedor.id);
      const pendientes = suyos
        .filter((p) => p.status === 'pending')
        .sort((a, b) => a.concept.localeCompare(b.concept, 'es'));
      return {
        proveedor,
        bodas: new Set(suyos.map((p) => p.weddingId)).size,
        pendienteCents: pendientes.reduce((t, p) => t + p.amountCents, 0),
        liquidadoCents: suyos
          .filter((p) => p.status === 'paid')
          .reduce((t, p) => t + p.amountCents, 0),
        pendientes,
      };
    })
    .sort(
      (a, b) =>
        b.pendienteCents - a.pendienteCents ||
        a.proveedor.name.localeCompare(b.proveedor.name, 'es'),
    );
}

/** La tarifa mayorista de un plan, o `null` si el proveedor no existe o es otro plan. */
export function tarifaDe(proveedor: Proveedor | undefined, plan: string): number | null {
  if (!proveedor) return null;
  return plan === 'extended' ? proveedor.wholesalePrice.extended : proveedor.wholesalePrice.basic;
}
