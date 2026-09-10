import { Sesion } from './session';

/**
 * Decide si una sesión puede entrar a una superficie.
 *
 * Esto NO es la seguridad: la seguridad son las reglas de Firestore, que se
 * aplican aunque alguien manipule el navegador. Esto es para que la interfaz no
 * enseñe un panel que luego no va a poder cargar nada, y para llevar a cada uno
 * a la pantalla que le corresponde.
 *
 * Por eso los motivos son concretos y no un "acceso denegado": cada uno lleva a
 * una pantalla distinta.
 */
export type ResultadoAcceso =
  | 'ok'
  /** No ha entrado todavía: hay que mandarle al acceso. */
  | 'sin-sesion'
  /** Ha entrado, pero con la cuenta de otra boda. Pasa de verdad: dos bodas, un navegador. */
  | 'otra-boda'
  /** Ha entrado, pero su rol no llega aquí. */
  | 'sin-permiso';

/** Panel de la pareja, en el subdominio de su boda. */
export function accesoAlPanel(
  sesion: Sesion | null,
  weddingIdDelHost: string | null,
): ResultadoAcceso {
  if (!sesion || sesion.rol === 'anonimo') return 'sin-sesion';
  if (!weddingIdDelHost) return 'sin-permiso';

  // El superadmin entra a cualquier panel: es soporte, y queda registrado.
  if (sesion.rol === 'superadmin') return 'ok';

  if (sesion.rol !== 'owner') return 'sin-permiso';
  if (sesion.weddingId !== weddingIdDelHost) return 'otra-boda';

  return 'ok';
}

/** Panel de superadmin, en su propio subdominio. */
export function accesoAlSuperadmin(sesion: Sesion | null): ResultadoAcceso {
  if (!sesion || sesion.rol === 'anonimo') return 'sin-sesion';
  return sesion.rol === 'superadmin' ? 'ok' : 'sin-permiso';
}

/** Módulos de la web pública que exigen invitado identificado. */
export function accesoDeInvitado(
  sesion: Sesion | null,
  weddingIdDelHost: string | null,
): ResultadoAcceso {
  if (!sesion || sesion.rol === 'anonimo') return 'sin-sesion';
  if (!weddingIdDelHost) return 'sin-permiso';
  if (sesion.weddingId !== weddingIdDelHost) return 'otra-boda';
  // La pareja también es invitada en su propia boda: sube fotos y juega al quiz.
  return sesion.rol === 'guest' || sesion.rol === 'owner' ? 'ok' : 'sin-permiso';
}
