/**
 * Regalos: lo que la pareja pide y cómo se le puede aportar (§8.8).
 *
 * **Copia literal** de `functions/src/dominio/regalos.ts`. Si tocas una, toca
 * la otra: lo vigila su `.spec.ts`.
 */

// === COPIA LITERAL: de aquí al final, idéntico en cliente y funciones ===

export const MAX_REGALOS = 40;
export const MAX_TITULO = 80;
export const MAX_DESCRIPCION = 300;
export const MAX_MENSAJE = 600;
export const MAX_TITULAR = 80;

/** Lo que la pareja publica para que le aporten. Todo opcional. */
export interface AportacionPublica {
  /** Normalizado, sin espacios y en mayúsculas. `null` si no es un IBAN. */
  readonly iban: string | null;
  /** A nombre de quién está la cuenta: lo que el banco va a pedir. */
  readonly titular: string;
  /** Solo los nueve dígitos españoles. `null` si no es un móvil. */
  readonly bizum: string | null;
  /** El texto de la pareja, con sus saltos de línea. */
  readonly mensaje: string;
}

/** Un regalo de la lista, tal y como lo ve un invitado. */
export interface RegaloPublico {
  readonly id: string;
  readonly titulo: string;
  readonly descripcion: string;
  /** Precio orientativo en euros. `null` si no lo han puesto. */
  readonly precio: number | null;
  /** Dónde verlo o comprarlo. Solo `http` y `https`. */
  readonly enlace: string | null;
  readonly imagen: string | null;
  /** Si ya lo ha cogido alguien. **Quién, no se dice nunca.** */
  readonly reservado: boolean;
  /** Si lo he reservado yo. Es lo único que distingue a un invitado de otro. */
  readonly esMio: boolean;
  readonly order: number;
}

function texto(valor: unknown, maximo: number): string {
  if (typeof valor !== 'string') return '';
  return valor.replace(/\r\n/g, '\n').trim().slice(0, maximo);
}

function numero(valor: unknown, maximo: number): number | null {
  if (typeof valor !== 'number' || !Number.isFinite(valor)) return null;
  if (valor < 0 || valor > maximo) return null;
  return Math.round(valor * 100) / 100;
}

/**
 * Un enlace al que mandar a alguien, o nada.
 *
 * `http` y `https` y nada más, igual que en los alojamientos: un `javascript:`
 * donde la web pinta un enlace es el agujero que evita el saneador de textos.
 */
export function enlaceValido(valor: unknown): string | null {
  if (typeof valor !== 'string') return null;

  const limpio = valor.trim();
  if (limpio === '') return null;

  const conEsquema = /^[a-z][a-z0-9+.-]*:/i.test(limpio) ? limpio : `https://${limpio}`;

  let url: URL;
  try {
    url = new URL(conEsquema);
  } catch {
    return null;
  }

  return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
}

/**
 * El IBAN, comprobado de verdad con el módulo 97.
 *
 * No es puntillismo: un dígito mal en un IBAN publicado significa que el
 * dinero de la boda se queda en el limbo, o peor, que entra en la cuenta de
 * otro. La comprobación cuesta diez líneas y la pareja escribe esto una vez,
 * de memoria, el día que monta su web.
 */
export function ibanValido(valor: unknown): string | null {
  if (typeof valor !== 'string') return null;

  const limpio = valor.replace(/[\s-]/g, '').toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(limpio)) return null;

  // Los cuatro primeros al final, las letras a números (A = 10), módulo 97.
  const movido = limpio.slice(4) + limpio.slice(0, 4);
  let resto = 0;
  for (const caracter of movido) {
    const valorCaracter = /\d/.test(caracter)
      ? caracter
      : String(caracter.charCodeAt(0) - 'A'.charCodeAt(0) + 10);
    for (const digito of valorCaracter) {
      resto = (resto * 10 + Number(digito)) % 97;
    }
  }

  return resto === 1 ? limpio : null;
}

/** El IBAN en grupos de cuatro, que es como se lee y como se teclea. */
export function ibanEnGrupos(iban: string): string {
  return (iban.match(/.{1,4}/g) ?? []).join(' ');
}

/**
 * El Bizum: un móvil español de nueve dígitos.
 *
 * Se acepta escrito con el prefijo y con espacios, y se guarda sin nada: lo
 * que la pareja teclea y lo que la aplicación del banco espera no se parecen.
 */
export function bizumValido(valor: unknown): string | null {
  if (typeof valor !== 'string') return null;

  const limpio = valor.replace(/[\s-]/g, '').replace(/^(\+34|0034|34)/, '');
  return /^[67]\d{8}$/.test(limpio) ? limpio : null;
}

/** Lo que la pareja ha puesto, dejado publicable. Nunca lanza. */
export function sanearAportacion(valor: unknown): AportacionPublica {
  const a = (valor ?? {}) as Record<string, unknown>;

  return {
    iban: ibanValido(a['iban']),
    titular: texto(a['titular'], MAX_TITULAR),
    bizum: bizumValido(a['bizum']),
    mensaje: texto(a['mensaje'], MAX_MENSAJE),
  };
}

/** Si no hay nada que enseñar, la sección no se pinta. */
export function hayAportacion(aportacion: AportacionPublica): boolean {
  return aportacion.iban !== null || aportacion.bizum !== null || aportacion.mensaje !== '';
}

/**
 * Deja la lista publicable. Nunca lanza.
 *
 * `quien` es el invitado que pregunta: de él sale `esMio`, y **solo eso**. Dos
 * invitados distintos ven exactamente la misma lista salvo en qué reservas son
 * suyas; quién ha cogido qué no sale de aquí, que es lo que pide §8.8.
 */
export function sanearRegalos(
  valor: unknown,
  quien: string | null = null,
): readonly RegaloPublico[] {
  if (!Array.isArray(valor)) return [];

  const salida: RegaloPublico[] = [];
  const vistos = new Set<string>();

  for (const crudo of valor) {
    if (crudo === null || typeof crudo !== 'object') continue;

    const r = crudo as Record<string, unknown>;
    const id = texto(r['id'], 60);
    const titulo = texto(r['titulo'] ?? r['title'], MAX_TITULO);

    if (id === '' || vistos.has(id) || titulo === '') continue;
    if (r['enabled'] === false) continue;

    const reservadoPor = texto(r['reservedBy'] ?? r['reservadoPor'], 60);

    vistos.add(id);
    salida.push({
      id,
      titulo,
      descripcion: texto(r['descripcion'] ?? r['description'], MAX_DESCRIPCION),
      precio: numero(r['precio'] ?? r['price'], 100000),
      enlace: enlaceValido(r['enlace'] ?? r['url']),
      imagen: enlaceValido(r['imagen'] ?? r['imageUrl']),
      reservado: reservadoPor !== '',
      esMio: reservadoPor !== '' && quien !== null && reservadoPor === quien,
      order: typeof r['order'] === 'number' && Number.isFinite(r['order']) ? r['order'] : 0,
    });
  }

  return salida.sort(porOrden).slice(0, MAX_REGALOS);
}

/**
 * Lo libre primero y lo reservado al final.
 *
 * Quien entra a elegir regalo quiere ver lo que puede coger, no una lista que
 * empieza con cuatro cosas tachadas. Lo suyo sube con lo libre para que lo
 * encuentre: es donde va a buscar si quiere soltarlo.
 */
export function porOrden(a: RegaloPublico, b: RegaloPublico): number {
  const libreA = !a.reservado || a.esMio;
  const libreB = !b.reservado || b.esMio;
  if (libreA !== libreB) return libreA ? -1 : 1;
  return a.order - b.order || a.id.localeCompare(b.id);
}

/**
 * Lo mismo, pero sobre lo que **devuelve el servidor** y no sobre el documento.
 *
 * Son dos formas distintas y conviene no mezclarlas. En el documento está
 * `reservedBy`, que es un id de invitado y no sale nunca de la función; en lo
 * servido están `reservado` y `esMio`, que son los dos booleanos en los que el
 * servidor ya ha traducido ese id. Esta es la que usa el cliente para
 * comprobar lo que le llega (D-19), y por eso no recibe ningún `quien`: no
 * tiene con qué calcular `esMio`, y no debe tenerlo.
 */
export function sanearRegalosServidos(valor: unknown): readonly RegaloPublico[] {
  if (!Array.isArray(valor)) return [];

  const salida: RegaloPublico[] = [];
  const vistos = new Set<string>();

  for (const crudo of valor) {
    if (crudo === null || typeof crudo !== 'object') continue;

    const r = crudo as Record<string, unknown>;
    const id = texto(r['id'], 60);
    const titulo = texto(r['titulo'], MAX_TITULO);
    if (id === '' || vistos.has(id) || titulo === '') continue;

    const reservado = r['reservado'] === true;

    vistos.add(id);
    salida.push({
      id,
      titulo,
      descripcion: texto(r['descripcion'], MAX_DESCRIPCION),
      precio: numero(r['precio'], 100000),
      enlace: enlaceValido(r['enlace']),
      imagen: enlaceValido(r['imagen']),
      reservado,
      esMio: reservado && r['esMio'] === true,
      order: typeof r['order'] === 'number' && Number.isFinite(r['order']) ? r['order'] : 0,
    });
  }

  return salida.sort(porOrden).slice(0, MAX_REGALOS);
}

export interface ResumenRegalos {
  readonly total: number;
  readonly libres: number;
  readonly reservados: number;
}

export function resumenDeRegalos(regalos: readonly RegaloPublico[]): ResumenRegalos {
  const reservados = regalos.filter((r) => r.reservado).length;
  return { total: regalos.length, libres: regalos.length - reservados, reservados };
}

/**
 * Quién puede reservar y quién puede soltar.
 *
 * Soltar lo ajeno no se permite, ni siquiera «por si se ha equivocado»: la
 * reserva es anónima para el resto, así que desde fuera no hay forma de saber
 * si un regalo lleva cinco minutos o cinco meses cogido.
 */
export function puedeReservar(regalo: Pick<RegaloPublico, 'reservado'>): boolean {
  return !regalo.reservado;
}

export function puedeSoltar(regalo: Pick<RegaloPublico, 'reservado' | 'esMio'>): boolean {
  return regalo.reservado && regalo.esMio;
}
