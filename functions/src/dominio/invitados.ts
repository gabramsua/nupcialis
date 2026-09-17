/**
 * El dominio de los invitados: normalizar, validar y detectar duplicados.
 *
 * Aquí no hay red ni Firestore. Es la parte que decide si «Mª José Pérez» y
 * «maria jose perez» son la misma persona, y esa decisión la usan dos sitios
 * muy distintos: la importación desde CSV, para no crear dos veces al mismo
 * invitado, y `guestLogin`, para reconocer a quien escribe su nombre en el
 * móvil (regla 3). Que las dos usen exactamente la misma función es lo que
 * evita que un invitado exista en la lista y no pueda entrar.
 */

export type Lado = 'A' | 'B' | 'both';
export type Edad = 'adult' | 'child' | 'baby';

export const LADOS: readonly Lado[] = ['A', 'B', 'both'];
export const EDADES: readonly Edad[] = ['adult', 'child', 'baby'];

export const MAX_NOMBRE = 80;
export const MAX_NOTA = 500;
/** Un titular no puede traerse media boda. */
export const MAX_ACOMPANANTES = 10;

/**
 * Nombre normalizado para comparar: minúsculas, sin acentos, sin puntuación y
 * con los espacios colapsados.
 *
 * Se guarda en el documento (`normalizedName`) y no se calcula al vuelo porque
 * hace falta para **buscar**: Firestore no sabe comparar ignorando acentos, así
 * que la única forma de encontrar a «Pérez» escribiendo «perez» es tener el
 * campo ya normalizado.
 *
 * La ñ se conserva: en español no es una n con virgulilla, es otra letra, y
 * quitarla haría que «Muñoz» y «Munoz» fueran la misma persona. Se normaliza lo
 * que la gente teclea distinto, no lo que distingue nombres.
 */
export function normalizarNombre(valor: unknown): string {
  if (typeof valor !== 'string') return '';

  return (
    valor
      .normalize('NFD')
      // Quita los diacríticos sueltos pero deja la ñ y la ü, que se recomponen
      // justo después con NFC.
      .replace(/[̀-ͯ]/g, (acento, posicion: number, texto: string) => {
        const base = texto[posicion - 1];
        const esEnie = (base === 'n' || base === 'N') && acento === '̃';
        const esDieresis = (base === 'u' || base === 'U') && acento === '̈';
        return esEnie || esDieresis ? acento : '';
      })
      .normalize('NFC')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

/** Nombre tal como se enseña: espacios colapsados y recortado. Nada más. */
export function limpiarNombre(valor: unknown): string {
  if (typeof valor !== 'string') return '';
  return valor.replace(/\s+/g, ' ').trim().slice(0, MAX_NOMBRE);
}

/**
 * Teléfono en E.164, asumiendo España cuando no trae prefijo.
 *
 * España porque es el mercado, y está escrito aquí para que el día que deje de
 * serlo se vea de un vistazo qué hay que cambiar. Devuelve `null` si no se
 * puede: un teléfono a medias es peor que ninguno, porque en los modos de
 * acceso B y C es lo que deja a un invitado fuera de la web.
 */
export function normalizarTelefono(valor: unknown, prefijoPorDefecto = '34'): string | null {
  if (typeof valor !== 'string') return null;

  const limpio = valor.replace(/[\s.\-()]/g, '');
  if (limpio === '') return null;

  if (limpio.startsWith('+')) {
    const digitos = limpio.slice(1);
    return /^\d{8,15}$/.test(digitos) ? `+${digitos}` : null;
  }

  // 0034... y 00 34...
  if (limpio.startsWith('00')) {
    const digitos = limpio.slice(2);
    return /^\d{8,15}$/.test(digitos) ? `+${digitos}` : null;
  }

  if (!/^\d+$/.test(limpio)) return null;

  // Nueve dígitos que empiezan por 6, 7, 8 o 9: número español sin prefijo.
  if (/^[6789]\d{8}$/.test(limpio)) return `+${prefijoPorDefecto}${limpio}`;

  // Cualquier otra ristra de dígitos sin prefijo no se adivina. Inventarle un
  // país a un número es peor que rechazarlo: el fallo aparecería meses después,
  // cuando ese invitado intente entrar en la web.
  return null;
}

/** Los cuatro últimos dígitos, que son la contraseña del modo B (regla 3). */
export function ultimos4(telefono: string | null): string | null {
  if (!telefono) return null;
  const digitos = telefono.replace(/\D/g, '');
  return digitos.length >= 4 ? digitos.slice(-4) : null;
}

export interface EntradaInvitado {
  readonly fullName?: unknown;
  readonly nickname?: unknown;
  readonly phone?: unknown;
  readonly email?: unknown;
  readonly side?: unknown;
  readonly ageGroup?: unknown;
  readonly groupIds?: unknown;
  readonly maxCompanions?: unknown;
  readonly notes?: unknown;
}

export interface InvitadoValidado {
  readonly fullName: string;
  readonly normalizedName: string;
  readonly nickname: string;
  readonly phone: string | null;
  readonly phoneLast4: string | null;
  readonly email: string | null;
  readonly side: Lado;
  readonly ageGroup: Edad;
  readonly groupIds: readonly string[];
  readonly maxCompanions: number;
  readonly notes: string;
}

export type MotivoInvitado =
  | { readonly campo: 'fullName'; readonly motivo: 'ausente' | 'demasiado-largo' }
  | { readonly campo: 'phone'; readonly motivo: 'no-es-telefono' }
  | { readonly campo: 'email'; readonly motivo: 'no-es-email' }
  | { readonly campo: 'maxCompanions'; readonly motivo: 'fuera-de-rango' };

export type ResultadoInvitado =
  | { readonly ok: true; readonly datos: InvitadoValidado }
  | { readonly ok: false; readonly motivos: readonly MotivoInvitado[] };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Valida y normaliza un invitado. Devuelve **todos** los motivos de una vez.
 *
 * De uno en uno es una tortura en una importación de doscientas filas: se
 * corrige el teléfono, se vuelve a subir, y entonces se entera uno de que
 * además faltaba el nombre.
 */
export function validarInvitado(entrada: EntradaInvitado): ResultadoInvitado {
  const motivos: MotivoInvitado[] = [];

  const crudo = typeof entrada.fullName === 'string' ? entrada.fullName.trim() : '';
  if (crudo === '') motivos.push({ campo: 'fullName', motivo: 'ausente' });
  else if (crudo.length > MAX_NOMBRE)
    motivos.push({ campo: 'fullName', motivo: 'demasiado-largo' });

  // Un teléfono escrito y no entendido es un error; no ponerlo es legítimo.
  const telefonoEscrito = typeof entrada.phone === 'string' && entrada.phone.trim() !== '';
  const phone = telefonoEscrito ? normalizarTelefono(entrada.phone) : null;
  if (telefonoEscrito && !phone) motivos.push({ campo: 'phone', motivo: 'no-es-telefono' });

  const emailEscrito = typeof entrada.email === 'string' && entrada.email.trim() !== '';
  const email = emailEscrito ? (entrada.email as string).trim().toLowerCase() : null;
  if (email && !EMAIL.test(email)) motivos.push({ campo: 'email', motivo: 'no-es-email' });

  const cupo = entrada.maxCompanions;
  const maxCompanions = typeof cupo === 'number' && Number.isFinite(cupo) ? Math.floor(cupo) : 0;
  if (maxCompanions < 0 || maxCompanions > MAX_ACOMPANANTES) {
    motivos.push({ campo: 'maxCompanions', motivo: 'fuera-de-rango' });
  }

  if (motivos.length > 0) return { ok: false, motivos };

  const fullName = limpiarNombre(crudo);

  return {
    ok: true,
    datos: {
      fullName,
      normalizedName: normalizarNombre(fullName),
      // Sin mote, el nombre. Es lo que va en la tarjeta de la mesa, y ahí no
      // puede quedar un hueco.
      nickname: limpiarNombre(entrada.nickname) || fullName,
      phone,
      phoneLast4: ultimos4(phone),
      email,
      side: LADOS.includes(entrada.side as Lado) ? (entrada.side as Lado) : 'both',
      ageGroup: EDADES.includes(entrada.ageGroup as Edad) ? (entrada.ageGroup as Edad) : 'adult',
      groupIds: Array.isArray(entrada.groupIds)
        ? [
            ...new Set(
              entrada.groupIds.filter((g): g is string => typeof g === 'string' && g !== ''),
            ),
          ]
        : [],
      maxCompanions,
      notes: typeof entrada.notes === 'string' ? entrada.notes.trim().slice(0, MAX_NOTA) : '',
    },
  };
}

/** Por qué creemos que este invitado ya estaba. */
export type MotivoDuplicado = 'telefono' | 'nombre';

export interface Existente {
  readonly id: string;
  readonly phone?: string | null;
  readonly normalizedName?: string;
}

/**
 * ¿Es el mismo invitado que uno que ya está en la lista?
 *
 * El teléfono manda cuando lo hay: es el único dato que de verdad identifica a
 * una persona, y es lo que pide §8.3 para la importación. Sin teléfono se cae
 * al nombre normalizado, que se equivoca con dos primos llamados igual — por
 * eso devuelve **por qué** coincide, y quien importa decide si fusiona o crea.
 */
export function duplicadoDe(
  candidato: InvitadoValidado,
  existentes: readonly Existente[],
): { readonly id: string; readonly motivo: MotivoDuplicado } | null {
  if (candidato.phone) {
    const porTelefono = existentes.find((e) => e.phone && e.phone === candidato.phone);
    if (porTelefono) return { id: porTelefono.id, motivo: 'telefono' };
  }

  const porNombre = existentes.find(
    (e) => e.normalizedName && e.normalizedName === candidato.normalizedName,
  );
  return porNombre ? { id: porNombre.id, motivo: 'nombre' } : null;
}
