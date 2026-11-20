/**
 * Regalos recibidos: el cuaderno privado de la pareja (§8.8).
 *
 * **Copia literal** del fichero del cliente, de la línea marcadora de ahí abajo
 * hasta el final. No se edita solo este fichero: se editan los dos, o el test
 * de la copia falla.
 *
 * Es **el dato más sensible del producto**: importes de dinero con nombre y
 * apellidos al lado. No sube a la proyección pública, no sale de la sesión de
 * la pareja y no existe ninguna función que lo sirva a un invitado.
 */

// === COPIA LITERAL: de aquí al final, idéntico en cliente y funciones ===

export const MAX_NOTAS = 300;
export const MAX_ETIQUETA = 80;
export const MAX_DESCRIPCION_REGALO = 160;

/**
 * Cómo ha llegado.
 *
 * Lista cerrada y corta. Sirve para una sola cosa, que es la que la pareja
 * pregunta de verdad: cuánto ha entrado por cada sitio, porque el sobre de la
 * boda y el Bizum de la semana siguiente no se cuadran igual.
 */
export const METODOS = ['cash', 'bizum', 'transfer', 'gift', 'other'] as const;
export type MetodoRegalo = (typeof METODOS)[number];

export function esMetodo(valor: unknown): valor is MetodoRegalo {
  return typeof valor === 'string' && (METODOS as readonly string[]).includes(valor);
}

/** Los que son dinero. `gift` y `other` no suman al total. */
export const METODOS_CON_IMPORTE: readonly MetodoRegalo[] = ['cash', 'bizum', 'transfer'];

export interface RegaloRecibido {
  readonly id: string;
  /** El invitado al que se ha vinculado, o `null` si es texto libre. */
  readonly guestId: string | null;
  /** «Los vecinos del 3ºB»: cuando no se puede vincular a nadie de la lista. */
  readonly fromLabel: string;
  readonly amount: number | null;
  readonly method: MetodoRegalo;
  /** Cuando no es dinero: «la vajilla», «un fin de semana en Cádiz». */
  readonly giftDescription: string;
  /** ISO, solo el día. */
  readonly receivedAt: string;
  readonly thanked: boolean;
  readonly thankedAt: string | null;
  readonly notes: string;
}

function texto(valor: unknown, maximo: number): string {
  if (typeof valor !== 'string') return '';
  return valor.replace(/\r\n/g, '\n').trim().slice(0, maximo);
}

function importe(valor: unknown): number | null {
  if (typeof valor !== 'number' || !Number.isFinite(valor)) return null;
  if (valor < 0 || valor > 1_000_000) return null;
  return Math.round(valor * 100) / 100;
}

/** Una fecha de solo día, en ISO. Acepta `Timestamp`, `Date` y la cadena. */
export function diaValido(valor: unknown): string | null {
  if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor.trim())) {
    const fecha = new Date(`${valor.trim()}T00:00:00.000Z`);
    return Number.isNaN(fecha.getTime()) ? null : valor.trim();
  }

  const posible = valor as { toDate?: () => Date } | null;
  if (posible && typeof posible.toDate === 'function') {
    const fecha = posible.toDate();
    return Number.isNaN(fecha.getTime()) ? null : fecha.toISOString().slice(0, 10);
  }

  return valor instanceof Date && !Number.isNaN(valor.getTime())
    ? valor.toISOString().slice(0, 10)
    : null;
}

/**
 * Deja la lista utilizable. Nunca lanza.
 *
 * Aquí **no se cae casi nada**, al revés que en los módulos públicos. Una
 * anotación a medias sigue siendo dinero que ha entrado: perderla porque le
 * falta el nombre sería lo peor que puede hacer este cuaderno.
 */
export function sanearRecibidos(valor: unknown): readonly RegaloRecibido[] {
  if (!Array.isArray(valor)) return [];

  const salida: RegaloRecibido[] = [];
  const vistos = new Set<string>();

  for (const crudo of valor) {
    if (crudo === null || typeof crudo !== 'object') continue;

    const r = crudo as Record<string, unknown>;
    const id = texto(r['id'], 60);
    if (id === '' || vistos.has(id)) continue;

    const guestId = texto(r['guestId'], 60);

    vistos.add(id);
    salida.push({
      id,
      guestId: guestId === '' ? null : guestId,
      fromLabel: texto(r['fromLabel'], MAX_ETIQUETA),
      amount: importe(r['amount']),
      method: esMetodo(r['method']) ? r['method'] : 'other',
      giftDescription: texto(r['giftDescription'], MAX_DESCRIPCION_REGALO),
      receivedAt: diaValido(r['receivedAt']) ?? '',
      thanked: r['thanked'] === true,
      thankedAt: diaValido(r['thankedAt']),
      notes: texto(r['notes'], MAX_NOTAS),
    });
  }

  return salida.sort(porFecha);
}

/** Lo último primero: lo que se apunta hoy es lo que se mira hoy. */
export function porFecha(a: RegaloRecibido, b: RegaloRecibido): number {
  return b.receivedAt.localeCompare(a.receivedAt) || a.id.localeCompare(b.id);
}

export interface TotalPorMetodo {
  readonly method: MetodoRegalo;
  readonly cuantos: number;
  /** En euros. Los que no son dinero suman `0` y se cuentan aparte. */
  readonly total: number;
}

export interface ResumenRecibidos {
  readonly cuantos: number;
  readonly total: number;
  readonly porMetodo: readonly TotalPorMetodo[];
  readonly sinAgradecer: number;
  /** Anotaciones sin importe: regalos de verdad, no dinero. */
  readonly enEspecie: number;
}

/**
 * Los totales que la pareja mira.
 *
 * El total general suma **solo lo que lleva importe**. Un regalo en especie no
 * tiene precio y ponerle uno inventado sería el principio de un ranking de
 * invitados, que es justo lo que §8.8 dice que no se hace.
 */
export function resumenDeRecibidos(recibidos: readonly RegaloRecibido[]): ResumenRecibidos {
  const porMetodo = METODOS.map((method) => {
    const suyos = recibidos.filter((r) => r.method === method);
    return {
      method,
      cuantos: suyos.length,
      total: suyos.reduce((suma, r) => suma + (r.amount ?? 0), 0),
    };
  }).filter((t) => t.cuantos > 0);

  return {
    cuantos: recibidos.length,
    total: recibidos.reduce((suma, r) => suma + (r.amount ?? 0), 0),
    porMetodo,
    sinAgradecer: recibidos.filter((r) => !r.thanked).length,
    enEspecie: recibidos.filter((r) => r.amount === null).length,
  };
}

/** Cómo firma una anotación: el invitado vinculado, o lo que se escribió. */
export function nombreDe(
  recibido: RegaloRecibido,
  nombrePorId: (guestId: string) => string | null,
): string {
  if (recibido.guestId !== null) {
    const nombre = nombrePorId(recibido.guestId);
    if (nombre !== null && nombre !== '') return nombre;
  }
  return recibido.fromLabel;
}

export interface CaboSuelto {
  readonly guestId: string;
  readonly nombre: string;
}

/**
 * Quién vino y no tiene nada apuntado.
 *
 * **Se presenta como información y nunca como reproche** (§8.8): es una lista
 * de a quién repasar, no de quién no ha regalado. Por eso no lleva importes al
 * lado ni se ordena por nada que se parezca a un ranking, y por eso los
 * acompañantes no salen: lo que llevara la pareja vino en un solo sobre.
 */
export function vinieronSinApuntar(
  invitados: readonly {
    id: string;
    fullName: string;
    rsvpStatus: string;
    isCompanion: boolean;
  }[],
  recibidos: readonly RegaloRecibido[],
): readonly CaboSuelto[] {
  const conRegalo = new Set(recibidos.flatMap((r) => (r.guestId === null ? [] : [r.guestId])));

  return invitados
    .filter((i) => i.rsvpStatus === 'confirmed' && !i.isCompanion && !conRegalo.has(i.id))
    .map((i) => ({ guestId: i.id, nombre: i.fullName }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

/**
 * Lo apuntado de quien no vino.
 *
 * No es un error y no se llama así: hay gente que no puede ir y manda algo
 * igual, y es justo a quien más se agradece. Sale para que no se quede sin
 * agradecer por no estar en ninguna lista del día.
 */
export function apuntadosQueNoVinieron(
  invitados: readonly { id: string; fullName: string; rsvpStatus: string }[],
  recibidos: readonly RegaloRecibido[],
): readonly CaboSuelto[] {
  const vino = new Map(invitados.map((i) => [i.id, i]));

  return recibidos
    .flatMap((r) => {
      if (r.guestId === null) return [];
      const invitado = vino.get(r.guestId);
      if (!invitado || invitado.rsvpStatus === 'confirmed') return [];
      return [{ guestId: invitado.id, nombre: invitado.fullName }];
    })
    .filter((c, i, todos) => todos.findIndex((o) => o.guestId === c.guestId) === i)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}
