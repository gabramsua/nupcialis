/**
 * Qué trae cada plan.
 *
 * Hoy vive en código; en F0.7 pasa a un documento `plans/{planId}` editable
 * desde el panel de superadmin, para poder mover un módulo de un plan a otro o
 * cambiar un precio sin desplegar. Esto son los valores por defecto con los que
 * se siembra esa colección.
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
  'timeline',
  'faqs',
  'accommodation',
  'dressCode',
  'weddingParty',
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
export const SOLO_EXTENDIDO: readonly Modulo[] = ['gallery', 'quiz'];

/** El básico arranca con lo imprescindible; el resto se activa desde el panel. */
const ACTIVOS_BASICO: readonly Modulo[] = [
  'publicSite',
  'rsvp',
  'guests',
  'map',
  'timeline',
  'faqs',
];

const ACTIVOS_EXTENDIDO: readonly Modulo[] = [
  ...ACTIVOS_BASICO,
  'tables',
  'gallery',
  'quiz',
  'gifts',
  'playlist',
  'guestbook',
  'accommodation',
  'dressCode',
  'weddingParty',
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
export function modulosIniciales(plan: Plan): Record<Modulo, ConfigModulo> {
  const activos = plan === 'basic' ? ACTIVOS_BASICO : ACTIVOS_EXTENDIDO;
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
