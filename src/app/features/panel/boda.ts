/**
 * La boda tal como la ve su propio panel.
 *
 * Lo que decide qué hay en la navegación no es una lista fija de pantallas: son
 * los módulos que esa boda tiene activos. Una pareja con el plan básico y sin
 * mesas no debe ver «Mesas» en gris con un candado — eso es enseñarle lo que no
 * ha comprado cada vez que abre el panel—, simplemente no está.
 */

import type { NpIconName } from '../../design-system/icons/icon-name.generated';

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
export type Visibilidad = 'hidden' | 'soon' | 'visible';

export interface ConfigModulo {
  readonly enabled: boolean;
  readonly visibility: Visibilidad;
}

export interface BodaDelPanel {
  readonly weddingId: string;
  readonly slug: string;
  readonly status: 'draft' | 'active' | 'archived';
  readonly plan: 'basic' | 'extended';
  readonly templateId: string;
  readonly modulos: Readonly<Partial<Record<Modulo, ConfigModulo>>>;
}

/**
 * Icono del set curado para cada módulo (REQUISITOS §9.1).
 *
 * El tipo es `NpIconName` y no `string` a propósito: si alguien escribe aquí un
 * icono que no está en el set, no compila. Ya cazó uno.
 */
export const ICONO_MODULO: Record<Modulo, NpIconName> = {
  publicSite: 'eye',
  rsvp: 'envelope',
  guests: 'users',
  tables: 'seat',
  map: 'map-pin',
  gallery: 'images',
  quiz: 'game-controller',
  gifts: 'gift',
  playlist: 'playlist',
  guestbook: 'note-pencil',
  timeline: 'clock',
  faqs: 'question',
  accommodation: 'bed',
  dressCode: 't-shirt',
  weddingParty: 'crown-simple',
  budget: 'currency-eur',
  vendors: 'briefcase',
  checklist: 'list-checks',
};

export interface EntradaMenu {
  readonly modulo: Modulo;
  readonly icono: NpIconName;
  /** Qué ve el invitado. Se enseña en el menú para no tener que adivinarlo. */
  readonly visibilidad: Visibilidad;
}

/**
 * Los módulos que salen en el menú, en el orden del catálogo.
 *
 * El orden es el de `MODULOS`, no el alfabético ni el de las claves del
 * documento: el orden de las claves que devuelve Firestore no está garantizado,
 * y un menú que se recoloca solo entre dos cargas es un menú que no se aprende.
 */
export function menuDeModulos(boda: BodaDelPanel): readonly EntradaMenu[] {
  return MODULOS.filter((modulo) => boda.modulos[modulo]?.enabled === true).map((modulo) => ({
    modulo,
    icono: ICONO_MODULO[modulo],
    visibilidad: boda.modulos[modulo]?.visibility ?? 'hidden',
  }));
}

/**
 * Cuántos módulos activos no ve todavía el invitado.
 *
 * Es el número que explica por qué la web parece vacía: la pareja tiene ocho
 * módulos encendidos y seis ocultos, y sin este aviso se pasa una tarde
 * buscando qué ha hecho mal.
 */
export function modulosNoVisibles(boda: BodaDelPanel): number {
  return menuDeModulos(boda).filter((entrada) => entrada.visibilidad !== 'visible').length;
}
