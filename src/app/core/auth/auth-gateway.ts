import { InjectionToken } from '@angular/core';
import { Sesion } from './session';

/**
 * Puerto de autenticación.
 *
 * Mismo patrón que con el tenant: la aplicación habla con esto, no con el SDK.
 * Aquí importa más que allí, porque los claims son la base de todos los
 * permisos y conviene poder probar el comportamiento sin levantar Auth.
 */
export interface PuertaAuth {
  /** Notifica la sesión actual y cada vez que cambia. Devuelve cómo dejar de escuchar. */
  observar(alCambiar: (sesion: Sesion) => void): () => void;
  entrarConEmail(email: string, password: string): Promise<void>;
  entrarConGoogle(): Promise<void>;
  enviarRecuperacion(email: string): Promise<void>;
  salir(): Promise<void>;
  /**
   * Fuerza la relectura de los claims.
   *
   * Hace falta después del alta: `provisionWedding` asigna los claims con el
   * Admin SDK, pero el token que el navegador ya tiene en la mano sigue siendo
   * el viejo hasta que se refresca. Sin esto, la pareja entra la primera vez y
   * se encuentra sin permisos sobre su propia boda.
   */
  refrescarClaims(): Promise<void>;
}

export const PUERTA_AUTH = new InjectionToken<PuertaAuth>('PUERTA_AUTH');

/** Motivos de fallo que la interfaz sabe explicar. */
export type ErrorAuth =
  | 'credenciales-invalidas'
  | 'usuario-desactivado'
  | 'demasiados-intentos'
  | 'ventana-cerrada'
  | 'sin-conexion'
  | 'desconocido';

export const MENSAJES_AUTH: Record<ErrorAuth, string> = {
  // A propósito no distingue "no existe" de "contraseña incorrecta": decirlo
  // permitiría averiguar qué correos están dados de alta.
  'credenciales-invalidas': 'El correo o la contraseña no son correctos.',
  'usuario-desactivado': 'Esta cuenta está desactivada. Escríbenos y lo miramos.',
  'demasiados-intentos': 'Demasiados intentos. Espera unos minutos y vuelve a probar.',
  'ventana-cerrada': 'Se cerró la ventana de Google antes de terminar.',
  'sin-conexion': 'No hay conexión. Inténtalo de nuevo en un momento.',
  desconocido: 'No hemos podido entrar. Inténtalo de nuevo.',
};
