/**
 * Acompañantes añadidos por el propio invitado.
 *
 * Un acompañante **no es un dato dentro del invitado**: es un documento de
 * invitado de pleno derecho (§5.5), porque también entra en la web, tiene su
 * menú, su mesa y su contador de accesos. Lo que cambia es de dónde viene:
 * `addedBy: 'guest'` e `invitedById` apuntando a quien lo trae.
 *
 * Aquí viven las tres reglas que no se pueden mirar desde una pantalla:
 *
 * 1. **El cupo.** Lo fija la pareja por invitado (`maxCompanions`) y además hay
 *    un interruptor por boda. Dos pestañas abiertas pueden mandar el mismo alta
 *    dos veces, así que el cupo se cuenta en el servidor con lo que hay escrito,
 *    nunca con lo que diga el cliente.
 * 2. **La herencia de grupos.** El acompañante entra en los grupos del titular.
 *    Es deliberado y es de seguridad: si no, el acompañante de alguien del grupo
 *    restringido vería las fotos de ese grupo sin estar en él —o al contrario,
 *    se quedaría fuera de lo que su pareja sí ve—.
 * 3. **El teléfono.** En los modos B y C la puerta pregunta por él, así que un
 *    acompañante sin teléfono recibiría un enlace que no puede abrir. En modo
 *    abierto no hace falta.
 */

import type { ModoAcceso } from './acceso';

/** Lo que hay que saber del titular para dejarle añadir a alguien. */
export interface Titular {
  readonly id: string;
  readonly isCompanion: boolean;
  readonly maxCompanions: number;
  readonly groupIds: readonly string[];
  readonly active: boolean;
}

export type MotivoCupo =
  'modulo-apagado' | 'sin-cupo' | 'cupo-lleno' | 'es-acompanante' | 'inactivo';

export type Permiso =
  | { readonly puede: true; readonly quedan: number }
  | { readonly puede: false; readonly motivo: MotivoCupo };

/**
 * ¿Puede este invitado añadir a alguien más?
 *
 * `yaTiene` son los acompañantes que ya ha añadido **contados en el servidor**.
 *
 * Un acompañante no puede añadir acompañantes. Sin esa regla, el cupo de uno se
 * convierte en una cadena: invito a mi pareja, mi pareja invita a su hermana, y
 * la pareja de los novios se encuentra treinta comensales que no conoce.
 */
export function puedeAnadir(modulo: boolean, titular: Titular, yaTiene: number): Permiso {
  if (!modulo) return { puede: false, motivo: 'modulo-apagado' };
  if (!titular.active) return { puede: false, motivo: 'inactivo' };
  if (titular.isCompanion) return { puede: false, motivo: 'es-acompanante' };
  if (titular.maxCompanions <= 0) return { puede: false, motivo: 'sin-cupo' };

  const quedan = titular.maxCompanions - yaTiene;
  return quedan > 0 ? { puede: true, quedan } : { puede: false, motivo: 'cupo-lleno' };
}

/** ¿Hace falta el teléfono del acompañante para que pueda entrar? */
export function exigeTelefono(modo: ModoAcceso): boolean {
  return modo !== 'open';
}

export type MotivoDatos =
  | { readonly campo: 'fullName'; readonly motivo: 'ausente' | 'demasiado-largo' }
  | { readonly campo: 'phone'; readonly motivo: 'ausente' | 'no-es-telefono' }
  | { readonly campo: 'ageGroup'; readonly motivo: 'desconocido' };

export const MAX_NOMBRE = 120;

export type Edad = 'adult' | 'child' | 'baby';
const EDADES: readonly Edad[] = ['adult', 'child', 'baby'];

export interface EntradaAcompanante {
  readonly fullName?: unknown;
  readonly phone?: unknown;
  readonly ageGroup?: unknown;
}

export interface AcompananteValidado {
  readonly fullName: string;
  readonly phone: string | null;
  readonly ageGroup: Edad;
}

export type ValidacionAcompanante =
  | { readonly ok: true; readonly datos: AcompananteValidado }
  | { readonly ok: false; readonly motivos: readonly MotivoDatos[] };

/**
 * Valida lo que el invitado escribe de su acompañante.
 *
 * El invitado está dando datos de un tercero, así que se le pide lo mínimo:
 * nombre, edad y —solo si hace falta para entrar— teléfono. Ni correo, ni
 * notas, ni nada que la pareja usaría para otra cosa (§5.5, RGPD).
 */
export function validarAcompanante(
  entrada: EntradaAcompanante,
  modo: ModoAcceso,
  normalizarTelefono: (valor: unknown) => string | null,
): ValidacionAcompanante {
  const motivos: MotivoDatos[] = [];

  const fullName = typeof entrada.fullName === 'string' ? entrada.fullName.trim() : '';
  if (fullName === '') motivos.push({ campo: 'fullName', motivo: 'ausente' });
  else if (fullName.length > MAX_NOMBRE)
    motivos.push({ campo: 'fullName', motivo: 'demasiado-largo' });

  const escrito = typeof entrada.phone === 'string' ? entrada.phone.trim() : '';
  const phone = escrito === '' ? null : normalizarTelefono(escrito);

  if (escrito !== '' && phone === null) motivos.push({ campo: 'phone', motivo: 'no-es-telefono' });
  else if (phone === null && exigeTelefono(modo))
    motivos.push({ campo: 'phone', motivo: 'ausente' });

  const edad = entrada.ageGroup;
  const ageGroup: Edad = EDADES.includes(edad as Edad) ? (edad as Edad) : 'adult';
  if (edad !== undefined && !EDADES.includes(edad as Edad))
    motivos.push({ campo: 'ageGroup', motivo: 'desconocido' });

  return motivos.length > 0
    ? { ok: false, motivos }
    : { ok: true, datos: { fullName, phone, ageGroup } };
}

/**
 * El lado y los grupos se heredan del titular, no los elige el invitado.
 *
 * El lado, porque «de quién es este invitado» es contabilidad de la pareja. Los
 * grupos, porque son los que deciden quién ve qué fotos.
 */
export function heredarDelTitular(titular: Titular): { readonly groupIds: readonly string[] } {
  return { groupIds: [...titular.groupIds] };
}

/**
 * El cupo que la pareja fija **a varios invitados a la vez** (F1.5b).
 *
 * En una boda hay doscientos invitados y el cupo se pone casi siempre por
 * tandas enteras —«los amigos, uno cada uno»—, así que ponerlo de uno en uno
 * en su ficha es una tarde perdida.
 *
 * Lo que se decide aquí, y no en la pantalla:
 *
 * - **Un acompañante no recibe cupo.** Si no, el cupo se vuelve una cadena:
 *   invito a mi pareja, mi pareja invita a su hermana (ver `puedeAnadir`).
 * - **Bajar el cupo no echa a nadie.** Quien ya añadió a dos sigue con dos;
 *   lo que no podrá es añadir a un tercero. Borrar invitados por cambiar un
 *   número sería irreversible y nadie lo espera.
 */
export const MAX_EN_UN_LOTE = 500;

export type MotivoLote = 'sin-invitados' | 'demasiados' | 'cupo-invalido';

export function validarLoteDeCupo(
  guestIds: readonly unknown[],
  maxCompanions: unknown,
  tope: number,
): MotivoLote[] {
  const motivos: MotivoLote[] = [];

  const ids = guestIds.filter((id) => typeof id === 'string' && id !== '');
  if (ids.length === 0) motivos.push('sin-invitados');
  if (guestIds.length > MAX_EN_UN_LOTE) motivos.push('demasiados');

  if (
    typeof maxCompanions !== 'number' ||
    !Number.isInteger(maxCompanions) ||
    maxCompanions < 0 ||
    maxCompanions > tope
  ) {
    motivos.push('cupo-invalido');
  }

  return motivos;
}

/** Los ids únicos y utilizables de una petición en lote. */
export function idsDelLote(guestIds: readonly unknown[]): string[] {
  return [...new Set(guestIds.filter((id): id is string => typeof id === 'string' && id !== ''))];
}
