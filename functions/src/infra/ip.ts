/**
 * De quién viene una petición: la IP y la clave con la que se cuentan sus intentos.
 *
 * Lo usan los endpoints públicos que necesitan frenar a un cliente concreto: el
 * acceso del invitado y el formulario de la HOME.
 */

import { createHash } from 'node:crypto';

import type { CallableRequest } from 'firebase-functions/v2/https';

/**
 * De quién viene la petición.
 *
 * Detrás del balanceador de Google, `req.ip` es el del balanceador; el de
 * verdad va el primero en `x-forwarded-for`. Sin IP se usa una clave fija: así
 * el límite sigue contando —de forma más brusca, todos juntos— en vez de
 * quedarse abierto de par en par.
 */
export function ipDe(peticion: CallableRequest<unknown>): string {
  const cabecera = peticion.rawRequest?.headers?.['x-forwarded-for'];
  const crudo = Array.isArray(cabecera) ? cabecera[0] : cabecera;
  const primera = typeof crudo === 'string' ? crudo.split(',')[0]?.trim() : '';
  return primera || peticion.rawRequest?.ip || 'desconocida';
}

/**
 * La clave del contador de intentos.
 *
 * Es un hash y no la IP tal cual por dos motivos: una IPv6 lleva caracteres que
 * en un id de documento se leen fatal, y un listado de documentos no tiene por
 * qué ser un listado de direcciones de los invitados. La IP sin disfrazar sí
 * queda en `guestAccessLog`, que solo ve la pareja.
 */
export function claveIntentos(ip: string): string {
  return createHash('sha256').update(ip).digest('hex').slice(0, 32);
}
