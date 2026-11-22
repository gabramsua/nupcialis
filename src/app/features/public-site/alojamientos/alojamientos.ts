/**
 * Alojamientos para los invitados de fuera (§8.10).
 *
 * **Copia literal** de `functions/src/dominio/alojamientos.ts`, de la línea
 * marcadora de ahí abajo hasta el final. No se edita solo este fichero: se
 * editan los dos, o el test de las funciones falla al compararlos.
 */

// === COPIA LITERAL: de aquí al final, idéntico en cliente y funciones ===

export const MAX_ALOJAMIENTOS = 20;
export const MAX_NOMBRE = 80;
export const MAX_DESCRIPCION = 400;
export const MAX_CODIGO = 60;

/**
 * Qué tipo de sitio es.
 *
 * Lista cerrada y corta: lo que hay alrededor de una boda son hoteles, casas
 * rurales, apartamentos y poco más. Sirve para agrupar y para que el invitado
 * sepa de un vistazo si va a dormir en una habitación o en una casa con otros
 * ocho.
 */
export const TIPOS_ALOJAMIENTO = ['hotel', 'rural', 'apartamento', 'camping', 'otro'] as const;

export type TipoAlojamiento = (typeof TIPOS_ALOJAMIENTO)[number];

export function esTipoAlojamiento(valor: unknown): valor is TipoAlojamiento {
  return typeof valor === 'string' && (TIPOS_ALOJAMIENTO as readonly string[]).includes(valor);
}

/** Un alojamiento tal y como llega a la web pública. */
export interface AlojamientoPublico {
  readonly id: string;
  readonly name: string;
  readonly category: TipoAlojamiento;
  readonly description: string;
  /** Precio orientativo por noche, en euros. `null` si no lo han puesto. */
  readonly pricePerNight: number | null;
  /** Distancia al banquete en kilómetros. `null` si no la han puesto. */
  readonly distanceKm: number | null;
  /** En E.164 o como lo escribió la pareja; el enlace `tel:` lo hace la web. */
  readonly phone: string | null;
  /** Solo `http` y `https`: lo demás no es una web a la que mandar a nadie. */
  readonly website: string | null;
  /** «Di que vas a la boda de María y Gabriel», o un código de descuento. */
  readonly discountCode: string;
  /** Cuántas habitaciones ha bloqueado la pareja. `null` si no hay bloqueo. */
  readonly blockedRooms: number | null;
  /** Hasta cuándo se pueden reservar las bloqueadas, en ISO (solo el día). */
  readonly bookingDeadline: string | null;
  /** Los recomendados van primero y lo dicen. */
  readonly recommended: boolean;
  /** Dónde está en el mapa (§8.6), si la pareja lo ha enlazado. `null` si no se publica. */
  readonly locationId: string | null;
  readonly order: number;
}

function texto(valor: unknown, maximo: number): string {
  if (typeof valor !== 'string') return '';
  return valor.replace(/\r\n/g, '\n').trim().slice(0, maximo);
}

/**
 * Un número positivo, o `null`.
 *
 * Un precio en negativo o un «sobre 80 €» no se publican como número: o es un
 * número con el que el invitado puede hacer cuentas, o no está.
 */
function numero(valor: unknown, maximo: number): number | null {
  if (typeof valor !== 'number' || !Number.isFinite(valor)) return null;
  if (valor < 0 || valor > maximo) return null;
  return Math.round(valor * 100) / 100;
}

/**
 * La web del alojamiento, solo si es una web.
 *
 * `http` y `https` y nada más: un `javascript:` en el sitio donde la web pinta
 * un enlace es exactamente el agujero que el saneador evita en los textos.
 */
export function webValida(valor: unknown): string | null {
  if (typeof valor !== 'string') return null;

  const limpio = valor.trim();
  if (limpio === '') return null;

  // Sin esquema se asume `https`: la pareja escribe «hotelcentral.com».
  const conEsquema = /^[a-z][a-z0-9+.-]*:/i.test(limpio) ? limpio : `https://${limpio}`;

  let url: URL;
  try {
    url = new URL(conEsquema);
  } catch {
    return null;
  }

  return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
}

/** El teléfono tal cual, sin espacios raros. Quien llama es el móvil. */
export function telefonoValido(valor: unknown): string | null {
  if (typeof valor !== 'string') return null;

  const limpio = valor.replace(/[^\d+]/g, '');
  return /^\+?\d{6,15}$/.test(limpio) ? limpio : null;
}

/** La fecha límite, solo el día, en ISO. Lo que no es una fecha es `null`. */
export function fechaLimiteValida(valor: unknown): string | null {
  if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor.trim())) {
    const fecha = new Date(`${valor.trim()}T00:00:00.000Z`);
    return Number.isNaN(fecha.getTime()) ? null : valor.trim();
  }

  // Los Timestamp de Firestore llegan con `toDate`.
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
 * Deja la lista publicable. Nunca lanza.
 *
 * Se cae lo apagado y lo que no tiene nombre: una ficha sin nombre no es una
 * ficha. Todo lo demás es opcional a propósito —la pareja apunta el hotel con
 * lo que sabe y completa después—, y la web pinta solo lo que hay.
 */
export function sanearAlojamientos(valor: unknown): readonly AlojamientoPublico[] {
  if (!Array.isArray(valor)) return [];

  const salida: AlojamientoPublico[] = [];
  const vistos = new Set<string>();

  for (const crudo of valor) {
    if (crudo === null || typeof crudo !== 'object') continue;

    const a = crudo as Record<string, unknown>;
    const id = texto(a['id'], 60);
    const name = texto(a['name'], MAX_NOMBRE);

    if (id === '' || vistos.has(id) || name === '') continue;
    if (a['enabled'] === false) continue;

    vistos.add(id);
    salida.push({
      id,
      name,
      category: esTipoAlojamiento(a['category']) ? a['category'] : 'otro',
      description: texto(a['description'], MAX_DESCRIPCION),
      pricePerNight: numero(a['pricePerNight'], 10000),
      distanceKm: numero(a['distanceKm'], 500),
      phone: telefonoValido(a['phone']),
      website: webValida(a['website']),
      discountCode: texto(a['discountCode'], MAX_CODIGO),
      blockedRooms: numero(a['blockedRooms'], 500),
      bookingDeadline: fechaLimiteValida(a['bookingDeadline']),
      recommended: a['recommended'] === true,
      locationId: texto(a['locationId'], 60) || null,
      order: typeof a['order'] === 'number' && Number.isFinite(a['order']) ? a['order'] : 0,
    });
  }

  return salida.sort(porRecomendado).slice(0, MAX_ALOJAMIENTOS);
}

/**
 * Los recomendados primero; dentro, el orden de la pareja.
 *
 * El invitado de fuera abre esto con prisa y reserva el primero que le cuadra,
 * así que el orden **es** la recomendación.
 */
export function porRecomendado(a: AlojamientoPublico, b: AlojamientoPublico): number {
  if (a.recommended !== b.recommended) return a.recommended ? -1 : 1;
  return a.order - b.order || a.id.localeCompare(b.id);
}

export type EstadoPlazo =
  /** Quedan más de siete días. */
  | { readonly estado: 'abierto'; readonly dias: number }
  /** Una semana o menos: es lo que de verdad angustia al invitado de fuera. */
  | { readonly estado: 'ultimos'; readonly dias: number }
  | { readonly estado: 'hoy' }
  | { readonly estado: 'cerrado' }
  /** No hay plazo que contar. */
  | { readonly estado: 'sin-plazo' };

/** A partir de cuándo el plazo pasa a ser urgente. */
export const DIAS_DE_AVISO = 7;

/**
 * Cuánto queda para reservar las habitaciones bloqueadas.
 *
 * El día cuenta entero: «hasta el 1 de junio» incluye el 1. Y un plazo vencido
 * se dice, no se esconde: el invitado que mira la web el día 2 necesita saber
 * que ya no hay bloqueo, no quedarse esperando.
 */
export function plazoDeReserva(limite: string | null, hoy: Date = new Date()): EstadoPlazo {
  if (limite === null) return { estado: 'sin-plazo' };

  const fin = new Date(`${limite}T00:00:00.000Z`).getTime();
  if (Number.isNaN(fin)) return { estado: 'sin-plazo' };

  const hoyUtc = Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate());
  const dias = Math.round((fin - hoyUtc) / (24 * 60 * 60 * 1000));

  if (dias < 0) return { estado: 'cerrado' };
  if (dias === 0) return { estado: 'hoy' };
  return dias <= DIAS_DE_AVISO ? { estado: 'ultimos', dias } : { estado: 'abierto', dias };
}
