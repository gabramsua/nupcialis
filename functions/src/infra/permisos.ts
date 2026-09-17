/**
 * Quién puede llamar a qué.
 *
 * Una función invocable es un endpoint público: cualquiera con la URL del
 * proyecto y un token de Firebase puede intentar llamarla. Comprobar el claim
 * aquí, en una función que se lee de un vistazo, evita la tentación de
 * comprobarlo "más adelante, dentro de la lógica".
 */

import { HttpsError, type CallableRequest } from 'firebase-functions/v2/https';

export interface Llamante {
  readonly uid: string;
  readonly email: string | null;
}

/**
 * Exige `superadmin: true` en el token.
 *
 * El claim se asigna fuera de banda a una lista blanca de UIDs; no hay ninguna
 * ruta del producto que lo conceda. Ver REQUISITOS §3.2.
 */
export function exigirSuperadmin(peticion: CallableRequest<unknown>): Llamante {
  const auth = peticion.auth;
  if (!auth) throw new HttpsError('unauthenticated', 'Hay que iniciar sesión.');

  if (auth.token['superadmin'] !== true) {
    // Mismo mensaje que si no existiera: quien no es superadmin no necesita
    // saber que esta función existe.
    throw new HttpsError('permission-denied', 'No tienes permiso para esta operación.');
  }

  return { uid: auth.uid, email: typeof auth.token.email === 'string' ? auth.token.email : null };
}

export interface Pareja extends Llamante {
  readonly weddingId: string;
}

/**
 * Exige ser owner de una boda, y devuelve **cuál**.
 *
 * El `weddingId` sale del claim del token y de ningún otro sitio (regla 1). Por
 * eso esta función lo *devuelve* en vez de recibirlo: si lo aceptara como
 * parámetro, más pronto que tarde alguien le pasaría el que venga en el cuerpo
 * de la petición, y eso es exactamente la fuga que la regla impide —cualquiera
 * con una sesión de una boda leyendo los invitados de otra—.
 *
 * El superadmin **no** entra por aquí. Su acceso de soporte es otra cosa, tiene
 * que quedar auditado y todavía no existe (ver D-27); colarlo aquí lo haría
 * indistinguible de la pareja en los logs.
 */
export function exigirPareja(peticion: CallableRequest<unknown>): Pareja {
  const auth = peticion.auth;
  if (!auth) throw new HttpsError('unauthenticated', 'Hay que iniciar sesión.');

  const weddingId = auth.token['weddingId'];
  if (auth.token['role'] !== 'owner' || typeof weddingId !== 'string' || weddingId === '') {
    throw new HttpsError('permission-denied', 'No tienes permiso para esta operación.');
  }

  return {
    uid: auth.uid,
    email: typeof auth.token.email === 'string' ? auth.token.email : null,
    weddingId,
  };
}
