/**
 * Qué trae cada plan.
 *
 * Lo que hay aquí son los **valores por defecto**. El superadmin los cambia desde
 * «Planes y módulos» y el cambio se guarda en `plans/{plan}` (D-53): ese
 * documento, si existe y es válido, manda sobre esto (`modulosDelPlan`).
 */

export type Plan = 'basic' | 'extended';

/** Maquetación de la web pública. Se deriva del plan, no se configura. */
export type Layout = 'onepage' | 'multipage';

export const MODULOS = [
  'publicSite',
  'rsvp',
  'guests',
  'tables',
  'map',
  'gallery',
  'quiz',
  'gifts',
  'playlist',
  'guestbook',
  'buses',
  'timeline',
  'faqs',
  'accommodation',
  'dressCode',
  'weddingParty',
  'story',
  'budget',
  'vendors',
  'checklist',
] as const;

export type Modulo = (typeof MODULOS)[number];

/**
 * Visibilidad de un módulo para los invitados.
 *
 * `soon` es lo que permite publicar la web meses antes de tener el menú
 * decidido: los invitados quieren la fecha y el sitio ya, y el resto puede
 * decir "muy pronto" sin que la web parezca abandonada.
 */
export type Visibilidad = 'hidden' | 'soon' | 'visible';

export interface ConfigModulo {
  readonly enabled: boolean;
  readonly visibility: Visibilidad;
}

/**
 * Módulos que **solo** existen en el plan extendido.
 *
 * No es una decisión comercial arbitraria: los dos necesitan ruta propia, y el
 * plan básico es de una sola página por definición. No se pueden apilar
 * trescientas fotos ni un juego interactivo dentro de un scroll continuo.
 */
export const SOLO_EXTENDIDO: readonly Modulo[] = ['gallery', 'quiz', 'story'];

/** El básico arranca con lo imprescindible; el resto se activa desde el panel. */
const ACTIVOS_BASICO: readonly Modulo[] = [
  'publicSite',
  'rsvp',
  'guests',
  'map',
  'timeline',
  'faqs',
  // Contenido informativo para el invitado (D-63): lo que el básico enseña en su
  // única página, sin necesitar ruta propia pesada.
  'gifts',
  'accommodation',
  'buses',
];

/**
 * Los módulos que el plan básico ganó en D-63. Las bodas básicas anteriores
 * los tienen apagados; `completeWeddings` los enciende una vez (ver
 * `completar-boda.ts`). No se añaden más a esta lista: es una migración, no un
 * catálogo.
 */
export const MODULOS_NUEVOS_EN_BASICO: readonly Modulo[] = ['gifts', 'accommodation', 'buses'];

const ACTIVOS_EXTENDIDO: readonly Modulo[] = [
  ...ACTIVOS_BASICO,
  'tables',
  'gallery',
  'quiz',
  'playlist',
  'guestbook',
  'dressCode',
  'weddingParty',
  'story',
  'budget',
  'vendors',
  'checklist',
];

export function layoutDePlan(plan: Plan): Layout {
  return plan === 'basic' ? 'onepage' : 'multipage';
}

export function moduloDisponibleEn(modulo: Modulo, plan: Plan): boolean {
  return plan === 'extended' || !SOLO_EXTENDIDO.includes(modulo);
}

/**
 * Configuración inicial de módulos de una boda recién creada.
 *
 * Todo lo no activo queda en `hidden`, no en `soon`: una boda que acaba de
 * nacer no debe anunciar seis secciones "muy pronto" que quizá nunca lleguen.
 * Es la pareja quien decide qué anuncia.
 */
export function modulosIniciales(
  plan: Plan,
  incluidos: readonly Modulo[] = modulosPorDefecto(plan),
): Record<Modulo, ConfigModulo> {
  const activos = incluidos;
  const salida = {} as Record<Modulo, ConfigModulo>;

  for (const modulo of MODULOS) {
    const disponible = moduloDisponibleEn(modulo, plan);
    const activo = disponible && activos.includes(modulo);
    salida[modulo] = {
      enabled: activo,
      visibility: activo ? 'visible' : 'hidden',
    };
  }

  return salida;
}

/** Los módulos que trae un plan si nadie lo ha cambiado. */
export function modulosPorDefecto(plan: Plan): readonly Modulo[] {
  return plan === 'basic' ? ACTIVOS_BASICO : ACTIVOS_EXTENDIDO;
}

/**
 * La lista de módulos de un plan tal como está guardada, o `null` si no vale.
 *
 * Se descartan los nombres desconocidos y los repetidos (un módulo que se quitó
 * del producto no debe romper el plan) y se exige `publicSite`: sin web pública
 * no hay boda.
 */
export function leerModulosDePlan(valor: unknown): readonly Modulo[] | null {
  if (!Array.isArray(valor)) return null;
  const pedidos = new Set(valor.filter((m): m is string => typeof m === 'string'));
  const lista = MODULOS.filter((m) => pedidos.has(m));
  return lista.includes('publicSite') ? lista : null;
}

/** Lo guardado en `plans/{plan}`, o los de por defecto si falta o está roto. */
export function modulosDelPlan(plan: Plan, guardado: unknown): readonly Modulo[] {
  const doc = guardado !== null && typeof guardado === 'object' ? guardado : {};
  return leerModulosDePlan((doc as Record<string, unknown>)['modules']) ?? modulosPorDefecto(plan);
}

export interface DiferenciaDePlan {
  readonly anadidos: readonly Modulo[];
  readonly quitados: readonly Modulo[];
}

export function diferenciaDePlan(
  antes: readonly Modulo[],
  despues: readonly Modulo[],
): DiferenciaDePlan {
  return {
    anadidos: MODULOS.filter((m) => despues.includes(m) && !antes.includes(m)),
    quitados: MODULOS.filter((m) => antes.includes(m) && !despues.includes(m)),
  };
}

/**
 * Qué escribir en una boda cuando su plan gana o pierde módulos.
 *
 * - **Añadir** es inmediato: el módulo pasa a estar activo **y visible**, igual
 *   que los que el plan trae al nacer la boda (D-65). Antes nacía oculto «para
 *   que decida la pareja», pero la pareja no tiene ningún mando para cambiar la
 *   visibilidad de un módulo: el que decide qué se ve es el interruptor de su
 *   sección en la web. Si ya tenía una visibilidad propia (`soon` o `visible`),
 *   se respeta; solo se sustituye `hidden`, que en un módulo apagado es el
 *   valor con el que nació y no una decisión.
 * - **Quitar** lo **desactiva** y nada más: la configuración y los datos
 *   (preguntas, fotos, tareas…) se quedan donde estaban, por si se vuelve a
 *   añadir. El superadmin lo confirma antes (D-53).
 */
export function cambiosDeModulosEnBoda(
  modulosActuales: unknown,
  diferencia: DiferenciaDePlan,
): Record<string, unknown> {
  const actuales =
    modulosActuales !== null && typeof modulosActuales === 'object'
      ? (modulosActuales as Record<string, unknown>)
      : {};
  const escritura: Record<string, unknown> = {};

  for (const modulo of diferencia.anadidos) {
    const config = actuales[modulo];
    if (config !== null && typeof config === 'object') {
      const c = config as Record<string, unknown>;
      if (c['enabled'] !== true) escritura[`modules.${modulo}.enabled`] = true;
      if (c['visibility'] !== 'soon' && c['visibility'] !== 'visible') {
        escritura[`modules.${modulo}.visibility`] = 'visible';
      }
    } else {
      escritura[`modules.${modulo}`] = { enabled: true, visibility: 'visible' };
    }
  }

  for (const modulo of diferencia.quitados) {
    const config = actuales[modulo];
    if (config !== null && typeof config === 'object') {
      if ((config as Record<string, unknown>)['enabled'] !== false) {
        escritura[`modules.${modulo}.enabled`] = false;
      }
    }
  }

  return escritura;
}
