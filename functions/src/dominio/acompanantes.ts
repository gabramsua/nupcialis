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
 * 1. **El tope técnico.** Ya no hay cupo por invitado (D-51): trae a quien
 *    quiera. Queda un interruptor por boda y un tope de seguridad
 *    (`MAX_ACOMPANANTES`) para que un enlace reenviado no llene la lista. Dos
 *    pestañas abiertas pueden mandar el mismo alta dos veces, así que se cuenta
 *    en el servidor con lo que hay escrito, nunca con lo que diga el cliente.
 * 2. **La herencia de grupos.** El acompañante entra en los grupos del titular.
 *    Es deliberado y es de seguridad: si no, el acompañante de alguien del grupo
 *    restringido vería las fotos de ese grupo sin estar en él —o al contrario,
 *    se quedaría fuera de lo que su pareja sí ve—.
 * 3. **El teléfono.** En los modos B y C la puerta pregunta por él, así que un
 *    acompañante sin teléfono recibiría un enlace que no puede abrir. En modo
 *    abierto no hace falta.
 */

import type { ModoAcceso } from './acceso';
import { MAX_ACOMPANANTES } from './invitados';

/** Lo que hay que saber del titular para dejarle añadir a alguien. */
export interface Titular {
  readonly id: string;
  readonly isCompanion: boolean;
  readonly groupIds: readonly string[];
  readonly active: boolean;
}

export type MotivoCupo = 'modulo-apagado' | 'cupo-lleno' | 'es-acompanante' | 'inactivo';

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

  const quedan = MAX_ACOMPANANTES - yaTiene;
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

export type MotivoVinculo = 'no-existe' | 'uno-mismo' | 'es-acompanante' | 'tiene-acompanantes';

export type Vinculo =
  | { readonly ok: true; readonly groupIds: readonly string[] }
  | { readonly ok: false; readonly motivo: MotivoVinculo };

/**
 * ¿Puede la pareja hacer que este invitado venga con ese titular?
 *
 * La pareja decide quién viene con quién: lo mismo si lo dio de alta ella como
 * acompañante que si enlaza a dos que ya estaban en la lista. Las reglas son las
 * del invitado que añade a alguien, y por la misma razón:
 *
 * - **Nadie viene consigo mismo**, ni con un titular que no existe en esta boda.
 * - **Un acompañante no puede ser titular.** Con cadenas, «quién trae a quién»
 *   deja de poderse contar y el cupo de uno acaba arrastrando a media familia.
 * - **Quien ya trae gente no pasa a ser acompañante.** Sus acompañantes se
 *   quedarían huérfanos sin que nadie lo decidiera.
 *
 * Y se hereda de él lo mismo que en el alta por el invitado: los grupos
 * (`heredarDelTitular`). Es de seguridad, no de comodidad: define quién ve las
 * fotos restringidas.
 */
export function validarVinculo(
  idDelInvitado: string | null,
  titular: Titular | null,
  acompanantesQueYaTrae: number,
): Vinculo {
  if (!titular) return { ok: false, motivo: 'no-existe' };
  if (idDelInvitado !== null && titular.id === idDelInvitado) {
    return { ok: false, motivo: 'uno-mismo' };
  }
  if (titular.isCompanion) return { ok: false, motivo: 'es-acompanante' };
  if (acompanantesQueYaTrae > 0) return { ok: false, motivo: 'tiene-acompanantes' };

  return { ok: true, ...heredarDelTitular(titular) };
}

/** Tope de invitados que se tocan en una sola llamada en lote. */
export const MAX_EN_UN_LOTE = 500;

/** Los ids únicos y utilizables de una petición en lote. */
export function idsDelLote(guestIds: readonly unknown[]): string[] {
  return [...new Set(guestIds.filter((id): id is string => typeof id === 'string' && id !== ''))];
}

/**
 * ¿Este acompañante viene como viene su titular? (D-51)
 *
 * Sí salvo que alguien lo haya cambiado a mano, que deja
 * `rsvpFollowsTitular: false`. Un documento sin la marca sigue: es el caso de
 * los acompañantes anteriores a la regla.
 */
export function sigueAlTitular(acompanante: Record<string, unknown>): boolean {
  return acompanante['rsvpFollowsTitular'] !== false;
}
