/**
 * Acceso de los invitados a la web de su boda.
 *
 * Aquí vive la parte que se puede decidir sin red, y es justo la parte
 * delicada. La regla 3 dice que la verificación se resuelve en servidor, con
 * límite de intentos y **respuestas genéricas que no distinguen «no existe» de
 * «no coincide»**. Lo segundo no se consigue acordándose de escribir el mismo
 * mensaje en cada rama: se consigue haciendo que el tipo del resultado no pueda
 * llevar el motivo. Por eso `Verificacion` es, literalmente, un `guestId` o
 * nada.
 *
 * Lo que esto **no** hace es autenticar. Los modos B y C son identificación:
 * quien conozca el nombre y el teléfono de un invitado puede suplantarlo. Está
 * asumido y escrito en REQUISITOS §3.3; el límite de intentos existe para que
 * al menos no se pueda **enumerar** la lista probando.
 */

import { normalizarNombre, normalizarTelefono, ultimos4 } from './invitados';

export type ModoAcceso = 'open' | 'name_phone4' | 'phone';

export const MODOS_ACCESO: readonly ModoAcceso[] = ['open', 'name_phone4', 'phone'];

export function esModoAcceso(valor: unknown): valor is ModoAcceso {
  return MODOS_ACCESO.includes(valor as ModoAcceso);
}

/** Lo que el invitado escribe. Lo que sobre según el modo, se ignora. */
/**
 * Con qué credenciales se identifica un invitado en esta boda (D-56).
 *
 * En una boda **abierta** la web se ve sin identificarse, pero el quiz y la
 * galería necesitan saber quién es cada uno (ranking nominal, autor de cada
 * foto), así que ahí —y solo ahí— se pide **nombre y los cuatro últimos dígitos
 * del móvil**, como en el modo B. Mismo límite de intentos y misma respuesta
 * única de fallo.
 */
export function modoDeIdentificacion(modo: ModoAcceso): Exclude<ModoAcceso, 'open'> {
  return modo === 'open' ? 'name_phone4' : modo;
}

export interface Credenciales {
  readonly nombre?: unknown;
  readonly digitos?: unknown;
  readonly telefono?: unknown;
}

/** Lo que hace falta de cada invitado para identificarlo. Nada más. */
export interface InvitadoIdentificable {
  readonly id: string;
  readonly normalizedName: string;
  readonly phone: string | null;
  readonly phoneLast4: string | null;
  /** Un invitado dado de baja no entra, pero tampoco se dice que exista. */
  readonly active: boolean;
}

/**
 * El resultado de verificar: a quién hemos reconocido, o nada.
 *
 * **No hay motivo, y es a propósito.** Un `{ ok: false; motivo: 'no-existe' }`
 * acaba en un mensaje distinto en pantalla, y entonces cualquiera puede
 * averiguar quién está invitado probando nombres. Ver regla 3.
 */
export type Verificacion = { readonly ok: true; readonly guestId: string } | { readonly ok: false };

const NO: Verificacion = { ok: false };

/** Los cuatro dígitos tal como los teclea alguien: con espacios, guiones o sin nada. */
function digitosEscritos(valor: unknown): string | null {
  if (typeof valor !== 'string') return null;
  const solo = valor.replace(/\D/g, '');
  return solo.length === 4 ? solo : null;
}

/**
 * ¿Quién es este invitado?
 *
 * Devuelve a quién ha reconocido, o nada. Dos casos acaban igual que un fallo,
 * y conviene saber por qué:
 *
 * - **Un invitado inactivo** no entra. Si contestara otra cosa, dar de baja a
 *   alguien se notaría desde fuera.
 * - **Dos invitados que encajan a la vez** tampoco. Pasa con dos personas del
 *   mismo nombre y los mismos cuatro dígitos, que es raro pero existe. Dejar
 *   entrar al primero le daría a uno la identidad del otro: su mesa, su menú y
 *   su grupo de fotos. Es un problema de datos que la pareja tiene que
 *   arreglar, y hasta entonces no se adivina.
 */
export function verificar(
  modo: ModoAcceso,
  credenciales: Credenciales,
  invitados: readonly InvitadoIdentificable[],
): Verificacion {
  // En modo abierto no hay nada que verificar: no se entra, se entra y ya.
  // Que esta función diga que no evita que una boda abierta tenga, además, una
  // puerta trasera por la que probar nombres.
  if (modo === 'open') return NO;

  const activos = invitados.filter((i) => i.active);

  if (modo === 'phone') {
    const telefono = normalizarTelefono(credenciales.telefono);
    if (!telefono) return NO;
    return unico(activos.filter((i) => i.phone === telefono));
  }

  const nombre = normalizarNombre(credenciales.nombre);
  const digitos = digitosEscritos(credenciales.digitos);
  if (nombre === '' || digitos === null) return NO;

  return unico(activos.filter((i) => i.normalizedName === nombre && ultimos4(i.phone) === digitos));
}

function unico(encajan: readonly InvitadoIdentificable[]): Verificacion {
  return encajan.length === 1 ? { ok: true, guestId: encajan[0]!.id } : NO;
}

// ---------------------------------------------------------------------------
// Dos niveles de sesión (D-34)
// ---------------------------------------------------------------------------

/**
 * Hasta dónde llega la sesión de un invitado.
 *
 * - `enlace`: ha abierto el enlace que le mandó la pareja. **Puede ver la web y
 *   nada más.** El enlace se reenvía —el primo lo pasa al grupo de la familia
 *   «por si alguien no lo tiene»—, así que lo que vale la mitad de un grupo de
 *   WhatsApp no puede cambiar nada.
 * - `verificado`: ha escrito los cuatro dígitos de su móvil (o su teléfono, en
 *   modo C). Es el único nivel que confirma, elige menú, apunta acompañantes y
 *   —cuando exista la galería— ve las fotos de audiencia restringida.
 *
 * Esta es la opción 3 de D-34: la parte cómoda es cómoda y lo que tiene
 * consecuencias sigue pidiendo algo que solo tiene el invitado.
 */
export type NivelSesion = 'enlace' | 'verificado';

export const NIVELES: readonly NivelSesion[] = ['enlace', 'verificado'];

export function esNivel(valor: unknown): valor is NivelSesion {
  return NIVELES.includes(valor as NivelSesion);
}

/**
 * Lo que **no** puede hacer una sesión de enlace.
 *
 * Es una lista y no una comprobación suelta en cada función porque el fallo que
 * importa es olvidarse de comprobarlo en la siguiente que se escriba. Si añades
 * una acción del invitado con consecuencias, va aquí.
 */
export const ACCIONES_VERIFICADAS = [
  'leer-rsvp',
  'enviar-rsvp',
  'anadir-acompanante',
  'quitar-acompanante',
  'ver-fotos-restringidas',
] as const;

export type AccionVerificada = (typeof ACCIONES_VERIFICADAS)[number];

/**
 * ¿Puede esta sesión hacer esto?
 *
 * En modo abierto no hay nada que verificar —no hay identidad, y por tanto
 * tampoco dígitos que pedir—, así que la pregunta no se plantea: lo que decide
 * ahí es si el módulo existe, no el nivel. En los modos B y C hace falta estar
 * verificado.
 */
export function puedeHacer(modo: ModoAcceso, nivel: NivelSesion): boolean {
  return modo === 'open' || nivel === 'verificado';
}

/**
 * Longitud del token del enlace, en bytes de azar.
 *
 * 24 bytes son 192 bits y 32 caracteres en base64url. No es una contraseña que
 * nadie teclee: va dentro del enlace, así que puede ser tan largo como haga
 * falta. Adivinarlo no es un escenario; el escenario es que se reenvíe, y de
 * eso se encarga el nivel.
 */
export const BYTES_TOKEN = 24;

/** La forma que tiene un token nuestro. Lo que no encaje no se busca siquiera. */
export function pareceToken(valor: unknown): string | null {
  if (typeof valor !== 'string') return null;
  const limpio = valor.trim();
  return /^[A-Za-z0-9_-]{20,64}$/.test(limpio) ? limpio : null;
}

// ---------------------------------------------------------------------------
// Límite de intentos
// ---------------------------------------------------------------------------

/** Intentos permitidos antes de empezar a bloquear. REQUISITOS §3.3. */
export const MAX_INTENTOS = 10;

/** Ventana en la que se cuentan esos intentos. */
export const VENTANA_MS = 15 * 60 * 1000;

/**
 * Cuánto dura cada bloqueo, en orden.
 *
 * Creciente a propósito: quien se equivoca de verdad espera un minuto y entra;
 * quien está probando nombres en bucle se encuentra con una hora. El último
 * valor se repite indefinidamente, para que no haya forma de «agotar» la
 * escalada y volver a empezar rápido.
 */
export const BLOQUEOS_MS: readonly number[] = [
  60 * 1000,
  5 * 60 * 1000,
  15 * 60 * 1000,
  60 * 60 * 1000,
];

/**
 * Lo que se guarda de cada quien lo intenta, identificado por boda e IP.
 *
 * Milisegundos y no `Timestamp`: esto es dominio puro y no sabe que existe
 * Firestore. La traducción la hace quien llama.
 */
export interface RegistroIntentos {
  /** Intentos fallidos dentro de la ventana en curso. */
  readonly intentos: number;
  /** Cuándo empezó la ventana. */
  readonly desde: number;
  /** Cuántas veces se ha llegado a bloquear. Es lo que hace crecer la espera. */
  readonly bloqueos: number;
  /** Hasta cuándo está bloqueado. 0 si no lo está. */
  readonly bloqueadoHasta: number;
}

export const SIN_INTENTOS: RegistroIntentos = {
  intentos: 0,
  desde: 0,
  bloqueos: 0,
  bloqueadoHasta: 0,
};

export type Decision =
  { readonly permitido: true } | { readonly permitido: false; readonly esperaMs: number };

/**
 * ¿Se puede intentar ahora?
 *
 * Se consulta **antes** de mirar las credenciales. Al revés —verificar y luego
 * contar— el coste de probar un nombre sigue siendo una lectura de la lista
 * entera de invitados por intento.
 */
export function puedeIntentar(registro: RegistroIntentos, ahora: number): Decision {
  if (registro.bloqueadoHasta > ahora) {
    return { permitido: false, esperaMs: registro.bloqueadoHasta - ahora };
  }
  return { permitido: true };
}

/** Tras un fallo: cuenta, y bloquea si toca. */
export function trasFallar(registro: RegistroIntentos, ahora: number): RegistroIntentos {
  // Ventana caducada: se empieza a contar de nuevo. Los bloqueos **no** se
  // reinician aquí; solo los borra un acceso bueno.
  const vigente = ahora - registro.desde < VENTANA_MS;
  const intentos = (vigente ? registro.intentos : 0) + 1;
  const desde = vigente ? registro.desde : ahora;

  if (intentos < MAX_INTENTOS) {
    return { ...registro, intentos, desde };
  }

  const bloqueos = registro.bloqueos + 1;
  const espera = BLOQUEOS_MS[Math.min(bloqueos, BLOQUEOS_MS.length) - 1]!;

  return { intentos: 0, desde: ahora, bloqueos, bloqueadoHasta: ahora + espera };
}

/**
 * Tras entrar bien: borrón y cuenta nueva.
 *
 * Incluidos los bloqueos acumulados. Quien ha demostrado ser un invitado de la
 * boda no arrastra la escalada de castigo de la IP de su hotel.
 */
export function trasAcertar(): RegistroIntentos {
  return SIN_INTENTOS;
}
