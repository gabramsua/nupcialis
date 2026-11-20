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
import { CAMPOS_POR_TIPO, esCampoRico, sanearSecciones, type Seccion } from './secciones';
import { sanearHtml } from './html';
import { MAX_RESPUESTA, sanearFaqs, type FaqPublica } from './faqs';
import { sanearCronologia, type HitoPublico } from './cronologia';
import { sanearAlojamientos, type AlojamientoPublico } from './alojamientos';
import { sanearUbicaciones, type UbicacionPublica } from './ubicaciones';
import {
  DRESS_CODE_VACIO,
  MAX_DESCRIPCION_DRESS,
  sanearDressCode,
  type DressCodePublico,
} from './dress-code';

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
  readonly heroImageUrl?: unknown;
}

/** Lo que esta función necesita del documento de la boda. Nada más. */
export interface BodaParaProyectar {
  readonly slug?: unknown;
  readonly status?: unknown;
  readonly layout?: unknown;
  readonly locale?: unknown;
  readonly timezone?: unknown;
  readonly weddingDate?: unknown;
  readonly weddingTime?: unknown;
  readonly couple?: { readonly partnerA?: unknown; readonly partnerB?: unknown };
  readonly guestAccessMode?: unknown;
  readonly theme?: TemaBoda;
  readonly modules?: Partial<
    Record<
      Modulo,
      { readonly enabled?: unknown; readonly visibility?: unknown; readonly config?: unknown }
    >
  >;
  readonly content?: unknown;
  readonly indexable?: unknown;
}

export interface ProyeccionPublica {
  readonly slug: string;
  readonly status: EstadoBoda;
  readonly layout: Layout;
  readonly locale: string;
  readonly timezone: string;
  readonly weddingDate: unknown;
  readonly weddingTime: string | null;
  readonly coupleNames: { readonly partnerA: string; readonly partnerB: string };
  readonly guestAccessMode: ModoAcceso;
  readonly theme: {
    readonly templateId: string;
    readonly palette: unknown;
    readonly fonts: unknown;
    readonly heroImagePath: string | null;
    readonly heroImageUrl: string | null;
  };
  readonly publicModules: Record<string, Visibilidad>;
  readonly content: {
    readonly sections: readonly Seccion[];
    /**
     * Las preguntas frecuentes publicables (§8.9).
     *
     * Viajan **aquí y no en su colección** aunque las reglas dejaran leerlas:
     * en una boda abierta no hay sesión de invitado con la que leer nada, y
     * las preguntas internas de la pareja no tienen por qué estar al alcance
     * de una consulta directa.
     */
    readonly faqs: readonly FaqPublica[];
    /**
     * La cronología del día, solo lo visible para invitados (§8.13).
     *
     * Lo interno —la hora a la que llega el fotógrafo, la del montaje— se queda
     * fuera **aquí**, que es lo único que de verdad lo protege: el documento
     * público es lo que lee el invitado.
     */
    readonly cronologia: readonly HitoPublico[];
    /** Los alojamientos para los invitados de fuera (§8.10). */
    readonly alojamientos: readonly AlojamientoPublico[];
    /**
     * Los sitios del mapa (§8.6), solo los visibles para invitados y con
     * coordenadas de verdad. Lo apuntado como interno —dónde aparcan los
     * proveedores— se queda fuera **aquí**.
     */
    readonly ubicaciones: readonly UbicacionPublica[];
    /**
     * El dress code (§8.11).
     *
     * El único módulo cuyo contenido vive en `modules.dressCode.config` y no
     * en una subcolección, porque es un contenido único y no una lista. Eso
     * obliga a tener cuidado: la configuración de un módulo **nunca** se copia
     * a la proyección —suele traer datos internos, el IBAN de los regalos por
     * ejemplo—, así que esto no se copia, se **construye** campo a campo con
     * lista blanca, como todo lo demás de aquí.
     */
    readonly dressCode: DressCodePublico;
  };
  /** Si la pareja quiere salir en buscadores. Por defecto, no. Ver §8.1. */
  readonly indexable: boolean;
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

/** El array de secciones de dentro de `content`, sin suponer que exista. */
/**
 * Pasa por el saneador los campos que llevan HTML.
 *
 * El tope en caracteres es el mismo que ya aplica `sanearSecciones`: lo que se
 * publica no puede crecer por llevar etiquetas dentro.
 */
function conHtmlSaneado(seccion: Seccion): Seccion {
  const fields: Record<string, string> = { ...seccion.fields };

  for (const [campo, valor] of Object.entries(seccion.fields)) {
    if (esCampoRico(seccion.type, campo)) {
      fields[campo] = sanearHtml(valor, CAMPOS_POR_TIPO[seccion.type][campo] ?? 0);
    }
  }

  return { ...seccion, fields };
}

function secciones(content: unknown): unknown {
  if (content === null || typeof content !== 'object') return null;
  return (content as Record<string, unknown>)['sections'];
}

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

/**
 * El dress code, construido campo a campo.
 *
 * Vive en `modules.dressCode.config` y no en una subcolección, y aquí hay un
 * cuidado que no hace falta en los otros módulos: **ninguna `config` se
 * copia**, porque suelen traer datos internos —el IBAN de los regalos, el
 * email del catering—. Así que esto no copia nada: lee cuatro campos conocidos
 * y descarta el resto, igual que la proyección entera.
 *
 * **No se mira `enabled`**, por lo mismo que no se mira para las preguntas o
 * los alojamientos: lo que decide si el invitado ve esto es el interruptor de
 * **su sección** en `content.sections`, que es el que tiene la pareja a mano.
 * Atarlo además al del módulo daría un contenido escrito que no sale en la web
 * y nadie entendería por qué.
 *
 * La descripción pasa por el saneador como los demás textos con formato
 * (regla de oro 5).
 */
function dressCodePublico(modules: BodaParaProyectar['modules']): DressCodePublico {
  const config = modules?.['dressCode']?.config;
  if (config === undefined || config === null) return DRESS_CODE_VACIO;

  const dress = sanearDressCode(config);
  return { ...dress, descripcion: sanearHtml(dress.descripcion, MAX_DESCRIPCION_DRESS) };
}

/**
 * Lo que se publica de una boda.
 *
 * `faqs` llega aparte porque vive en una subcolección y esta función es pura:
 * quien la llama es el trigger, que sí sabe leer de Firestore.
 */
export function proyeccionPublica(
  boda: BodaParaProyectar,
  faqs: unknown = [],
  cronologia: unknown = [],
  alojamientos: unknown = [],
  ubicaciones: unknown = [],
): ProyeccionPublica {
  const tema = boda.theme ?? {};
  return {
    slug: cadena(boda.slug, ''),
    status: estado(boda.status),
    layout: boda.layout === 'multipage' ? 'multipage' : 'onepage',
    locale: cadena(boda.locale, 'es'),
    timezone: cadena(boda.timezone, 'Europe/Madrid'),
    weddingDate: boda.weddingDate ?? null,
    // La hora de reloj de la ceremonia. Va a la proyección porque es lo que
    // hace que la cuenta atrás cuente hasta la boda y no hasta la medianoche.
    // Se publica tal cual: validarla es cosa del cliente, y una hora corrupta
    // se comporta como «sin hora», no rompe la portada.
    weddingTime: typeof boda.weddingTime === 'string' ? boda.weddingTime : null,
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
      // La URL viaja resuelta para que la web pública no cargue el SDK de
      // Storage solo para averiguarla.
      heroImageUrl: typeof tema.heroImageUrl === 'string' ? tema.heroImageUrl : null,
    },
    publicModules: modulosPublicos(boda.modules),
    // **No se copia `content` tal cual.** Lo escribe la pareja desde su panel
    // —no es campo de sistema— y esto acaba en el único documento que puede
    // leer un anónimo. Se reconstruye con lista blanca, igual que el resto.
    // El texto enriquecido se sanea **aquí**, justo antes de publicarse, y no
    // en el panel: lo que decida el navegador de la pareja no protege a quien
    // abre la web (regla de oro 5).
    content: {
      sections: sanearSecciones(secciones(boda.content)).map(conHtmlSaneado),
      // La respuesta de una pregunta la escribe la pareja con el editor, así
      // que pasa por el mismo saneador que las secciones (regla de oro 5).
      faqs: sanearFaqs(faqs).map((faq) => ({
        ...faq,
        answer: sanearHtml(faq.answer, MAX_RESPUESTA),
      })),
      // La descripción de un hito es texto plano, no HTML: en una línea de
      // tiempo que se lee de un vistazo no hay sitio para párrafos con formato.
      cronologia: sanearCronologia(cronologia),
      alojamientos: sanearAlojamientos(alojamientos),
      ubicaciones: sanearUbicaciones(ubicaciones),
      dressCode: dressCodePublico(boda.modules),
    },
    // Solo `true` cuenta como sí. Cualquier otra cosa —ausente, corrupta, una
    // cadena 'true'— deja la boda fuera de Google, que es el fallo seguro.
    indexable: boda.indexable === true,
  };
}
