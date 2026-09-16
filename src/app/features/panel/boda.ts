/**
 * La boda tal como la ve su propio panel.
 *
 * Lo que decide qué hay en la navegación no es una lista fija de pantallas: son
 * los módulos que esa boda tiene activos. Una pareja con el plan básico y sin
 * mesas no debe ver «Mesas» en gris con un candado — eso es enseñarle lo que no
 * ha comprado cada vez que abre el panel—, simplemente no está.
 */

import type { NpIconName } from '../../design-system/icons/icon-name.generated';
import type { ColoresPaleta } from '../public-site/paletas/paletas';
import type { Seccion } from '../public-site/secciones/secciones';

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
  /** Medianoche UTC del día. Ver el invariante en `shared/zona-horaria.ts`. */
  readonly weddingDate: Date | null;
  /**
   * Hora de la ceremonia, `'17:00'`, o `null` si aún no la han decidido.
   *
   * La fija **la pareja**, no el superadmin: quien vende el servicio no tiene
   * por qué saber a qué hora es la ceremonia, y cuando se contrata la web lo
   * normal es que ni siquiera esté cerrada.
   */
  readonly weddingTime: string | null;
  readonly timezone: string;
  readonly templateId: string;
  /**
   * Los seis colores de la pareja, o `null` si aún no ha elegido paleta.
   *
   * No se guarda el id del catálogo: se guardan los colores, y cuál está
   * elegida se deduce comparando. Guardar las dos cosas las deja divergir el
   * día que se retoque una paleta, y entonces el panel diría «Arena» mientras
   * la web se ve con los colores de la Arena vieja.
   */
  readonly palette: ColoresPaleta | null;
  readonly indexable: boolean;
  readonly heroImagePath: string | null;
  readonly heroImageUrl: string | null;
  /** Secciones de la web pública, ya saneadas y en orden. */
  readonly secciones: readonly Seccion[];
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
