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
