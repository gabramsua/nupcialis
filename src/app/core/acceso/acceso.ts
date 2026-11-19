/**
 * El modo de acceso de una boda, del lado del cliente.
 *
 * Copia del tipo que vive en `functions/src/dominio/acceso.ts`. Duplicado a
 * propósito —`functions/` es otro paquete y el cliente no importa de él— y
 * vigilado por `acceso.spec.ts`, que compara las dos listas y falla si se
 * separan.
 *
 * Aquí no hay nada de verificación, y no es un olvido: **comprobar quién es
 * cada invitado se hace íntegramente en servidor** (regla 3). Si el navegador
 * pudiera contrastar un nombre contra la lista, esa misma consulta serviría
 * para descargarla entera.
 */

export type ModoAcceso = 'open' | 'name_phone4' | 'phone';

export const MODOS_ACCESO: readonly ModoAcceso[] = ['open', 'name_phone4', 'phone'];

export function esModoAcceso(valor: unknown): valor is ModoAcceso {
  return MODOS_ACCESO.includes(valor as ModoAcceso);
}

/**
 * Hasta dónde llega la sesión del invitado (D-34).
 *
 * `enlace` es quien ha abierto el enlace que le mandó la pareja: ve la web y
 * nada más. `verificado` es quien ha escrito sus cuatro dígitos, y es el único
 * que confirma, elige menú y apunta acompañantes.
 *
 * Copia del tipo del servidor, como `ModoAcceso`, y vigilada por la misma
 * prueba. Quien decide es el claim del token; esto solo sirve para saber qué
 * pantalla enseñar.
 */
export type NivelSesion = 'enlace' | 'verificado';

export const NIVELES: readonly NivelSesion[] = ['enlace', 'verificado'];

export function esNivel(valor: unknown): valor is NivelSesion {
  return NIVELES.includes(valor as NivelSesion);
}

/** ¿Puede esta sesión hacer algo con consecuencias? */
export function puedeHacer(modo: ModoAcceso, nivel: NivelSesion): boolean {
  return modo === 'open' || nivel === 'verificado';
}

/** ¿Hay que identificarse para ver la web de esta boda? */
export function pideIdentificarse(modo: ModoAcceso): boolean {
  return modo !== 'open';
}

/** Qué escribe el invitado, según el modo. */
export interface CredencialesInvitado {
  readonly nombre?: string;
  readonly digitos?: string;
  readonly telefono?: string;
}

/**
 * Por qué no ha podido entrar.
 *
 * `no-identificado` es **uno solo a propósito**: el servidor no distingue «ese
 * invitado no está» de «los dígitos no coinciden», y la pantalla tampoco puede
 * inventarse la diferencia. Ver regla 3.
 */
export type FalloAcceso =
  | { readonly tipo: 'no-identificado' }
  /** Demasiados intentos desde esta conexión. Habla de la IP, no de la lista. */
  | { readonly tipo: 'demasiados-intentos'; readonly esperaMs: number }
  | { readonly tipo: 'sin-verificar' }
  | { readonly tipo: 'error'; readonly mensaje: string };

export type ResultadoAcceso =
  | { readonly ok: true; readonly guestId: string }
  | { readonly ok: false; readonly fallo: FalloAcceso };

/** El parámetro con el que viaja el token del enlace. */
export const PARAM_ENLACE = 'k';

/**
 * El parámetro con el que la puerta pre-rellena el nombre.
 *
 * Es de los enlaces anteriores a D-34, que siguen funcionando: una pareja pudo
 * mandar doscientos y no se le van a romper. Los nuevos llevan `?k=`, que no
 * necesita el nombre porque el servidor ya sabe quién es.
 */
export const PARAM_NOMBRE = 'n';

/**
 * El nombre que viene en el enlace, si viene.
 *
 * Vive **aquí y no en el panel** aunque sea el panel quien fabrica esos
 * enlaces: lo lee la web pública nada más abrirse, y un `import` desde ahí a
 * un fichero del panel mete el panel en el chunk que descarga el invitado
 * (ver `arranque-publico.spec.ts`).
 */
export function nombreDelEnlace(busqueda: string): string {
  return new URLSearchParams(busqueda).get(PARAM_NOMBRE)?.trim() ?? '';
}

/**
 * Cuánto queda de espera, redondeado hacia arriba en minutos.
 *
 * Hacia arriba porque decir «un minuto» y que al minuto siga bloqueado es peor
 * que decir «dos»; y nunca cero, que se leería como «ya puedes» justo cuando no.
 */
export function minutosDeEspera(esperaMs: number): number {
  return Math.max(1, Math.ceil(esperaMs / 60_000));
}
