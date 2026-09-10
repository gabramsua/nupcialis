/**
 * Sesión: quién está usando la aplicación y sobre qué boda.
 *
 * Todo sale de los custom claims del token, que los pone el servidor con el
 * Admin SDK. El cliente no puede fabricarlos ni modificarlos: es la primera de
 * las reglas de oro y la razón de que este fichero exista.
 */

export type Rol = 'owner' | 'guest' | 'superadmin' | 'anonimo';

export interface Sesion {
  readonly uid: string;
  readonly email: string | null;
  readonly rol: Rol;
  /** La boda a la que pertenece. `null` en superadmin y anónimo. */
  readonly weddingId: string | null;
  /** Solo en invitados. */
  readonly guestId: string | null;
}

export const SESION_ANONIMA: Sesion = {
  uid: '',
  email: null,
  rol: 'anonimo',
  weddingId: null,
  guestId: null,
};

/**
 * Construye la sesión a partir de los claims.
 *
 * Deliberadamente desconfiada: cualquier forma que no reconozca acaba en
 * `anonimo`. Un token con claims a medias es más probable que sea un despiste
 * del provisioning que un ataque, pero el resultado seguro es el mismo en los
 * dos casos: no dar permisos que no constan.
 */
export function sesionDesdeClaims(
  uid: string,
  email: string | null,
  claims: Record<string, unknown>,
): Sesion {
  if (!uid) return SESION_ANONIMA;

  const base = { uid, email: email ?? null };

  // El superadmin manda sobre cualquier otro claim.
  if (claims['superadmin'] === true) {
    return { ...base, rol: 'superadmin', weddingId: null, guestId: null };
  }

  const weddingId = typeof claims['weddingId'] === 'string' ? claims['weddingId'] : null;
  const rol = claims['role'];

  // Sin boda no hay rol posible: ni owner ni guest significan nada sueltos.
  if (!weddingId) {
    return { ...base, rol: 'anonimo', weddingId: null, guestId: null };
  }

  if (rol === 'owner') {
    return { ...base, rol: 'owner', weddingId, guestId: null };
  }

  if (rol === 'guest') {
    const guestId = typeof claims['guestId'] === 'string' ? claims['guestId'] : null;
    // Un invitado sin guestId no puede hacer nada: ni ver su documento ni
    // responder al formulario. Es un token roto, no un invitado.
    if (!guestId) return { ...base, rol: 'anonimo', weddingId: null, guestId: null };
    return { ...base, rol: 'guest', weddingId, guestId };
  }

  return { ...base, rol: 'anonimo', weddingId: null, guestId: null };
}
