/**
 * La proyección pública de una boda: `weddings/{id}/public/site`.
 *
 * Es el **único** documento de una boda que puede leer un anónimo, y por tanto
 * el único punto por el que se puede escapar un dato interno. Las reglas de
 * seguridad no ayudan aquí: dicen "lee este documento entero" o "no lo leas".
 * Lo que decide qué sale es esta función.
 *
 * Por eso se construye por **lista blanca**, campo a campo, y no copiando la
 * boda y borrando lo sensible: si mañana se añade `stripeCustomerId` al
 * documento de la boda, un enfoque de lista negra lo publicaría al mundo el día
 * del despliegue y nadie se enteraría.
 */

import { MODULOS, type Modulo, type Visibilidad } from './planes';

/** Módulos que tienen presencia en la web pública. */
export const MODULOS_PUBLICOS: readonly Modulo[] = [
  'rsvp',
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
];

export type EstadoBoda = 'draft' | 'active' | 'archived';
export type ModoAcceso = 'open' | 'name_phone4' | 'phone';
export type Layout = 'onepage' | 'multipage';

export interface TemaBoda {
  readonly templateId?: unknown;
  readonly palette?: unknown;
  readonly fonts?: unknown;
  readonly heroImagePath?: unknown;
}

/** Lo que esta función necesita del documento de la boda. Nada más. */
export interface BodaParaProyectar {
  readonly slug?: unknown;
  readonly status?: unknown;
  readonly layout?: unknown;
  readonly locale?: unknown;
  readonly timezone?: unknown;
  readonly weddingDate?: unknown;
  readonly couple?: { readonly partnerA?: unknown; readonly partnerB?: unknown };
  readonly guestAccessMode?: unknown;
  readonly theme?: TemaBoda;
  readonly modules?: Partial<
    Record<Modulo, { readonly enabled?: unknown; readonly visibility?: unknown }>
  >;
  readonly content?: unknown;
}

export interface ProyeccionPublica {
  readonly slug: string;
  readonly status: EstadoBoda;
  readonly layout: Layout;
  readonly locale: string;
  readonly timezone: string;
  readonly weddingDate: unknown;
  readonly coupleNames: { readonly partnerA: string; readonly partnerB: string };
  readonly guestAccessMode: ModoAcceso;
  readonly theme: {
    readonly templateId: string;
    readonly palette: unknown;
    readonly fonts: unknown;
    readonly heroImagePath: string | null;
  };
  readonly publicModules: Record<string, Visibilidad>;
  readonly content: unknown;
}

/** Campos del documento de la boda que jamás pueden aparecer en la proyección. */
export const PROHIBIDOS_EN_PUBLICO: readonly string[] = [
  'counters',
  'plan',
  'ownerUids',
  'notes',
  'billing',
  'stripeCustomerId',
  'modules',
];

function cadena(valor: unknown, porDefecto: string): string {
  return typeof valor === 'string' && valor.trim() !== '' ? valor : porDefecto;
}

function estado(valor: unknown): EstadoBoda {
  // Ante la duda, `draft`: una boda con el estado corrupto se comporta como no
  // publicada, que es el fallo seguro. Al revés publicaría al mundo una boda que
  // la pareja todavía está montando.
  return valor === 'active' || valor === 'archived' ? valor : 'draft';
}

function modoAcceso(valor: unknown): ModoAcceso {
  return valor === 'name_phone4' || valor === 'phone' ? valor : 'open';
}

function visibilidad(valor: unknown): Visibilidad {
  return valor === 'visible' || valor === 'soon' ? valor : 'hidden';
}

/**
 * Visibilidad pública de cada módulo.
 *
 * Un módulo desactivado es `hidden` aunque su `visibility` diga otra cosa: el
 * interruptor manda sobre la etiqueta. Y solo se publica la **visibilidad**,
 * nunca la configuración del módulo, que suele traer datos internos (el email
 * del catering, el importe del presupuesto).
 */
export function modulosPublicos(
  modules: BodaParaProyectar['modules'],
): Record<string, Visibilidad> {
  const salida: Record<string, Visibilidad> = {};
  for (const modulo of MODULOS) {
    if (!MODULOS_PUBLICOS.includes(modulo)) continue;
    const config = modules?.[modulo];
    salida[modulo] = config?.enabled === true ? visibilidad(config.visibility) : 'hidden';
  }
  return salida;
}

export function proyeccionPublica(boda: BodaParaProyectar): ProyeccionPublica {
  const tema = boda.theme ?? {};
  return {
    slug: cadena(boda.slug, ''),
    status: estado(boda.status),
    layout: boda.layout === 'multipage' ? 'multipage' : 'onepage',
    locale: cadena(boda.locale, 'es'),
    timezone: cadena(boda.timezone, 'Europe/Madrid'),
    weddingDate: boda.weddingDate ?? null,
    coupleNames: {
      partnerA: cadena(boda.couple?.partnerA, ''),
      partnerB: cadena(boda.couple?.partnerB, ''),
    },
    guestAccessMode: modoAcceso(boda.guestAccessMode),
    theme: {
      templateId: cadena(tema.templateId, 'clasica'),
      palette: tema.palette ?? null,
      fonts: tema.fonts ?? null,
      heroImagePath: typeof tema.heroImagePath === 'string' ? tema.heroImagePath : null,
    },
    publicModules: modulosPublicos(boda.modules),
    content: boda.content ?? { sections: [] },
  };
}
