/**
 * La boda tal como la ve su propio panel.
 *
 * Lo que decide qué hay en la navegación no es una lista fija de pantallas: son
 * los módulos que esa boda tiene activos. Una pareja con el plan básico y sin
 * mesas no debe ver «Mesas» en gris con un candado — eso es enseñarle lo que no
 * ha comprado cada vez que abre el panel—, simplemente no está.
 */

import type { ModoAcceso } from '../../core/acceso/acceso';
import type { NpIconName } from '../../design-system/icons/icon-name.generated';
import type { ColoresPaleta } from '../public-site/paletas/paletas';
import type { DressCodePublico } from '../public-site/dress-code/dress-code';
import type { AportacionPublica } from '../public-site/regalos/regalos';
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
  /**
   * Los nombres de la pareja. En el panel sirven para el lado de un invitado o
   * de un grupo: «De María» se entiende; «Lado A» obliga a recordar quién era A.
   */
  readonly pareja: { readonly partnerA: string; readonly partnerB: string };
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
  /**
   * Cómo entra un invitado en la web: abierta, nombre + cuatro dígitos, o
   * teléfono. Ver REQUISITOS §3.3. Es propiedad de la boda, no de un módulo:
   * decide si la web pide identificarse antes de enseñar nada.
   */
  readonly guestAccessMode: ModoAcceso;
  /**
   * La plantilla del mensaje que la pareja manda con cada enlace.
   *
   * Se guarda con sus marcadores dentro (`{nombre}`, `{enlace}`…), no el
   * mensaje ya montado: es una plantilla que sirve para doscientos invitados.
   */
  readonly inviteMessage: string;
  /**
   * Hasta cuándo se puede confirmar, o `null` si no hay plazo.
   *
   * Vive en `modules.rsvp.config.deadline`, que es el sitio que §5.1 reserva
   * para la configuración de cada módulo. El día cuenta entero: «hasta el 1 de
   * junio» incluye el 1.
   */
  readonly rsvpDeadline: Date | null;
  /**
   * Si un invitado puede apuntar a sus acompañantes (§8.3).
   *
   * Es de la boda y no de un módulo: decide si existe ese formulario para todo
   * el mundo. El cupo de cada uno lo pone la pareja invitado por invitado.
   */
  readonly allowGuestAddedCompanions: boolean;
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
  /**
   * El dress code (§8.11).
   *
   * El único módulo cuyo contenido llega aquí dentro de la boda: vive en
   * `modules.dressCode.config` porque es un contenido único y no una lista.
   */
  readonly dressCode: DressCodePublico;

  /**
   * Lo que la pareja publica para que le aporten (§8.8).
   *
   * Vive en `content.gifts` y **no sube a la proyección pública**: un IBAN con
   * su titular en un documento que lee cualquiera que sepa el slug es lo que
   * necesita un tercero para montar la misma web y cobrar él. Se lo sirve
   * `getGifts` al invitado identificado.
   */
  readonly aportacion: AportacionPublica;
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

/**
 * Dónde está la pantalla de cada módulo, si ya existe.
 *
 * El catálogo tiene dieciocho módulos y el panel todavía no tiene dieciocho
 * pantallas. El menú los listaba todos enlazando a `/panel/<modulo>`, así que
 * una boda con el mapa encendido tenía en el menú un «Mapa» que llevaba a una
 * página en blanco.
 *
 * Lo que falta no se esconde: se enseña diciendo que llega pronto, que es la
 * verdad y es lo que la pareja compró. Lo vigila `rutas-enlazadas.spec.ts`,
 * que comprueba que cada ruta de aquí existe de verdad.
 */
export const RUTA_MODULO: Partial<Record<Modulo, string>> = {
  publicSite: '/panel/web',
  guests: '/panel/guests',
  rsvp: '/panel/rsvp',
  faqs: '/panel/faqs',
  timeline: '/panel/timeline',
  accommodation: '/panel/accommodation',
  dressCode: '/panel/dress-code',
  quiz: '/panel/quiz',
  gallery: '/panel/gallery',
  gifts: '/panel/gifts',
  map: '/panel/map',
  playlist: '/panel/playlist',
  checklist: '/panel/checklist',
  tables: '/panel/tables',
};

export function rutaDeModulo(modulo: Modulo): string | null {
  return RUTA_MODULO[modulo] ?? null;
}

export interface EntradaMenu {
  readonly modulo: Modulo;
  readonly icono: NpIconName;
  /** Su pantalla, o `null` si ese módulo todavía no tiene ninguna. */
  readonly ruta: string | null;
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
    ruta: rutaDeModulo(modulo),
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
