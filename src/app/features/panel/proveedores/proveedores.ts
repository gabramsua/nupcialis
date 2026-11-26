/**
 * Los proveedores de la boda (§8.16 `vendors`).
 *
 * Es una herramienta **interna** de la pareja: nada de esto llega a la web
 * pública ni a la proyección. Una ficha por proveedor, con su estado
 * (candidato → contratado → pagado, o descartado), lo presupuestado, lo
 * acordado, los pagos hechos y los contratos en PDF.
 *
 * Todo el dinero va en céntimos enteros, como el presupuesto.
 *
 * Frontera de confianza (D-19): `leerProveedor` comprueba lo que vuelve de
 * Firestore y descarta lo roto en vez de tumbar la lista.
 */

import { telefonoValido, webValida } from '../../public-site/alojamientos/alojamientos';
import { MAX_IMPORTE, esDiaIso } from '../presupuesto/presupuesto';

export const MAX_PROVEEDORES = 200;
export const MAX_NOMBRE = 80;
export const MAX_CATEGORIA = 40;
export const MAX_CONTACTO = 80;
export const MAX_NOTAS = 1000;
export const MAX_PAGOS = 30;
export const MAX_CONCEPTO_PAGO = 80;
export const MAX_CONTRATOS = 10;

export const ESTADOS_PROVEEDOR = ['candidate', 'contracted', 'paid', 'discarded'] as const;
export type EstadoProveedor = (typeof ESTADOS_PROVEEDOR)[number];

export function esEstadoProveedor(valor: unknown): valor is EstadoProveedor {
  return ESTADOS_PROVEEDOR.includes(valor as EstadoProveedor);
}

export interface PagoDeProveedor {
  readonly amountCents: number;
  /** El día, `'2027-05-01'`. */
  readonly on: string;
  readonly concept: string;
}

export interface ProveedorDelPanel {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly contactName: string;
  readonly phone: string | null;
  readonly email: string | null;
  readonly website: string | null;
  /** Lo que ha presupuestado. 0 mientras no se sepa. */
  readonly quotedCents: number;
  /** Lo que se ha acordado de verdad. 0 mientras no haya acuerdo. */
  readonly agreedCents: number;
  readonly status: EstadoProveedor;
  readonly payments: readonly PagoDeProveedor[];
  /** Rutas de los contratos en Storage (`weddings/{id}/vendors/{vendorId}/…`). */
  readonly contractPaths: readonly string[];
  /** De 1 a 5, o `null` si todavía no se ha valorado. */
  readonly rating: number | null;
  readonly notes: string;
  readonly order: number;
}

export type DatosDeProveedor = Omit<ProveedorDelPanel, 'id' | 'order'>;

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim() : '';
}

function importe(valor: unknown): number {
  return typeof valor === 'number' && Number.isInteger(valor) && valor >= 0 && valor <= MAX_IMPORTE
    ? valor
    : 0;
}

function leerPago(valor: unknown): PagoDeProveedor | null {
  if (valor === null || typeof valor !== 'object') return null;
  const p = valor as Record<string, unknown>;
  const amountCents = importe(p['amountCents']);
  const on = p['on'];
  if (amountCents === 0 || !esDiaIso(on)) return null;
  return { amountCents, on, concept: texto(p['concept']).slice(0, MAX_CONCEPTO_PAGO) };
}

/** Las rutas de contrato solo valen si cuelgan de la ficha a la que pertenecen. */
export function rutaDeContratoValida(ruta: unknown, weddingId: string, id: string): boolean {
  return typeof ruta === 'string' && ruta.startsWith(`weddings/${weddingId}/vendors/${id}/`);
}

export function leerProveedor(
  id: string,
  crudo: unknown,
  /** Para descartar rutas de contrato que no son de esta ficha. */
  weddingId: string,
): ProveedorDelPanel | null {
  if (crudo === null || typeof crudo !== 'object') return null;
  const d = crudo as Record<string, unknown>;

  const name = texto(d['name']);
  if (name === '') return null;

  const rating = d['rating'];
  const orden = d['order'];

  return {
    id,
    name,
    category: texto(d['category']) || 'Otros',
    contactName: texto(d['contactName']),
    phone: telefonoValido(d['phone']),
    email: texto(d['email']) || null,
    website: webValida(d['website']),
    quotedCents: importe(d['quotedPrice']),
    agreedCents: importe(d['agreedPrice']),
    status: esEstadoProveedor(d['status']) ? d['status'] : 'candidate',
    payments: (Array.isArray(d['payments']) ? d['payments'] : [])
      .flatMap((p) => {
        const leido = leerPago(p);
        return leido ? [leido] : [];
      })
      .slice(0, MAX_PAGOS),
    contractPaths: (Array.isArray(d['contractPaths']) ? d['contractPaths'] : [])
      .filter((r): r is string => rutaDeContratoValida(r, weddingId, id))
      .slice(0, MAX_CONTRATOS),
    rating:
      typeof rating === 'number' && Number.isInteger(rating) && rating >= 1 && rating <= 5
        ? rating
        : null,
    notes: texto(d['notes']),
    order: typeof orden === 'number' && Number.isFinite(orden) ? orden : 0,
  };
}

export type MotivoProveedor =
  | 'nombre'
  | 'categoria'
  | 'contacto'
  | 'telefono'
  | 'email'
  | 'web'
  | 'presupuesto'
  | 'acordado'
  | 'notas';

export interface BorradorDeProveedor {
  readonly name: string;
  readonly category: string;
  readonly contactName: string;
  readonly phone: string;
  readonly email: string;
  readonly website: string;
  readonly quoted: string;
  readonly agreed: string;
  readonly status: EstadoProveedor;
  /** `0` = sin valorar. */
  readonly rating: number;
  readonly notes: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * De lo que escribe la pareja a lo que se guarda, o el campo que falla.
 *
 * Los pagos y los contratos no pasan por aquí: se añaden y se quitan aparte, y
 * llegan ya validados (`validarPago`) o subidos (el almacén).
 */
export function validarProveedor(
  b: BorradorDeProveedor,
  parsear: (texto: string) => number | null,
):
  | {
      readonly ok: true;
      readonly datos: Omit<DatosDeProveedor, 'payments' | 'contractPaths'>;
    }
  | { readonly ok: false; readonly motivo: MotivoProveedor } {
  const name = b.name.replace(/\s+/g, ' ').trim();
  if (name === '' || name.length > MAX_NOMBRE) return { ok: false, motivo: 'nombre' };

  const category = b.category.replace(/\s+/g, ' ').trim() || 'Otros';
  if (category.length > MAX_CATEGORIA) return { ok: false, motivo: 'categoria' };

  const contactName = b.contactName.replace(/\s+/g, ' ').trim();
  if (contactName.length > MAX_CONTACTO) return { ok: false, motivo: 'contacto' };

  const telefono = b.phone.trim();
  const phone = telefono === '' ? null : telefonoValido(telefono);
  if (telefono !== '' && phone === null) return { ok: false, motivo: 'telefono' };

  const correo = b.email.trim();
  if (correo !== '' && !EMAIL.test(correo)) return { ok: false, motivo: 'email' };

  const web = b.website.trim();
  const website = web === '' ? null : webValida(web);
  if (web !== '' && website === null) return { ok: false, motivo: 'web' };

  const quotedCents = parsear(b.quoted);
  if (quotedCents === null || quotedCents > MAX_IMPORTE) {
    return { ok: false, motivo: 'presupuesto' };
  }
  const agreedCents = parsear(b.agreed);
  if (agreedCents === null || agreedCents > MAX_IMPORTE) return { ok: false, motivo: 'acordado' };

  const notes = b.notes.trim();
  if (notes.length > MAX_NOTAS) return { ok: false, motivo: 'notas' };

  return {
    ok: true,
    datos: {
      name,
      category,
      contactName,
      phone,
      email: correo === '' ? null : correo,
      website,
      quotedCents,
      agreedCents,
      status: b.status,
      rating: b.rating >= 1 && b.rating <= 5 ? Math.round(b.rating) : null,
      notes,
    },
  };
}

export type MotivoPago = 'importe' | 'fecha' | 'concepto';

export function validarPago(
  b: { readonly importe: string; readonly fecha: string; readonly concepto: string },
  parsear: (texto: string) => number | null,
):
  | { readonly ok: true; readonly pago: PagoDeProveedor }
  | { readonly ok: false; readonly motivo: MotivoPago } {
  const amountCents = parsear(b.importe);
  if (amountCents === null || amountCents <= 0 || amountCents > MAX_IMPORTE) {
    return { ok: false, motivo: 'importe' };
  }
  const on = b.fecha.trim();
  if (!esDiaIso(on)) return { ok: false, motivo: 'fecha' };
  const concept = b.concepto.replace(/\s+/g, ' ').trim();
  if (concept.length > MAX_CONCEPTO_PAGO) return { ok: false, motivo: 'concepto' };
  return { ok: true, pago: { amountCents, on, concept } };
}

/** Lo ya pagado a un proveedor: la suma de sus pagos. */
export function pagado(p: Pick<ProveedorDelPanel, 'payments'>): number {
  return p.payments.reduce((suma, pago) => suma + pago.amountCents, 0);
}

/**
 * Lo que queda por pagar de lo acordado. Nunca negativo: pagar de más no es
 * una deuda a favor, es un dato que la pareja querrá revisar, no un saldo.
 */
export function pendiente(p: Pick<ProveedorDelPanel, 'agreedCents' | 'payments'>): number {
  return Math.max(0, p.agreedCents - pagado(p));
}

export interface TotalesDeProveedores {
  readonly proveedores: number;
  readonly candidatos: number;
  readonly contratados: number;
  /** Lo acordado con los que están contratados o pagados. */
  readonly acordado: number;
  readonly pagado: number;
  readonly pendiente: number;
}

/** Los descartados no cuentan: no se les va a pagar. */
export function totales(proveedores: readonly ProveedorDelPanel[]): TotalesDeProveedores {
  const vivos = proveedores.filter((p) => p.status !== 'discarded');
  const cerrados = vivos.filter((p) => p.status === 'contracted' || p.status === 'paid');

  return {
    proveedores: vivos.length,
    candidatos: vivos.filter((p) => p.status === 'candidate').length,
    contratados: cerrados.length,
    acordado: cerrados.reduce((s, p) => s + p.agreedCents, 0),
    pagado: cerrados.reduce((s, p) => s + pagado(p), 0),
    pendiente: cerrados.reduce((s, p) => s + pendiente(p), 0),
  };
}

export interface GrupoDeProveedores {
  readonly category: string;
  readonly proveedores: readonly ProveedorDelPanel[];
  /**
   * El candidato con el presupuesto más bajo, **solo si hay al menos dos
   * candidatos con precio** y uno es estrictamente más barato: con uno solo no
   * hay nada que comparar, y con un empate no hay ganador.
   */
  readonly masBarato: string | null;
}

const PESO_ESTADO: Record<EstadoProveedor, number> = {
  contracted: 0,
  paid: 1,
  candidate: 2,
  discarded: 3,
};

/**
 * Los proveedores por categoría (la comparativa de candidatos de §8.16).
 *
 * Dentro de cada una: contratados, pagados, candidatos (los más baratos
 * primero) y por último los descartados, que se quedan visibles por si la
 * pareja se arrepiente.
 */
export function agruparPorCategoria(
  proveedores: readonly ProveedorDelPanel[],
): readonly GrupoDeProveedores[] {
  const ordenados = [...proveedores].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  const mapa = new Map<string, ProveedorDelPanel[]>();

  for (const p of ordenados) {
    const lista = mapa.get(p.category);
    if (lista) lista.push(p);
    else mapa.set(p.category, [p]);
  }

  return [...mapa.entries()].map(([category, lista]) => {
    const conPrecio = lista.filter((p) => p.status === 'candidate' && p.quotedCents > 0);
    const minimo = Math.min(...conPrecio.map((p) => p.quotedCents));
    const empatados = conPrecio.filter((p) => p.quotedCents === minimo);

    return {
      category,
      masBarato: conPrecio.length >= 2 && empatados.length === 1 ? empatados[0]!.id : null,
      proveedores: [...lista].sort((a, b) => {
        const peso = PESO_ESTADO[a.status] - PESO_ESTADO[b.status];
        if (peso !== 0) return peso;
        if (a.status === 'candidate') {
          // Los candidatos sin precio, al final de los candidatos.
          const pa = a.quotedCents || Number.MAX_SAFE_INTEGER;
          const pb = b.quotedCents || Number.MAX_SAFE_INTEGER;
          if (pa !== pb) return pa - pb;
        }
        return a.order - b.order || a.id.localeCompare(b.id);
      }),
    };
  });
}

/** El nombre legible de un contrato: lo que hay tras el último `/` y el sello de hora. */
export function nombreDeContrato(ruta: string): string {
  const fichero = ruta.split('/').pop() ?? ruta;
  return fichero.replace(/^\d{10,}-/, '');
}

/** El nombre de fichero que se sube: sin rutas ni caracteres raros, y con `.pdf`. */
export function nombreSeguroDeContrato(nombre: string): string {
  const base = nombre
    .replace(/\.pdf$/i, '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 60);
  return `${base || 'contrato'}.pdf`;
}
