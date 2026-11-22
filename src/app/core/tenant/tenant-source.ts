import type { ModoAcceso } from '../acceso/acceso';
import type { Seccion } from '../../features/public-site/secciones/secciones';
import type { FaqPublica } from '../../features/public-site/faqs/faqs';
import type { HitoPublico } from '../../features/public-site/cronologia/cronologia';
import type { AlojamientoPublico } from '../../features/public-site/alojamientos/alojamientos';
import type { UbicacionPublica } from '../../features/public-site/mapa/ubicaciones';
import type { DressCodePublico } from '../../features/public-site/dress-code/dress-code';
import type { ApartadoPublicoDeHistoria } from '../../features/public-site/historia/historia';

/**
 * Puerto de datos del tenant.
 *
 * La lógica de resolución no habla con Firestore: habla con esto. Dos motivos,
 * y el segundo importa más que el primero:
 *
 * 1. Se puede probar sin red ni navegador, con un doble de tres líneas.
 * 2. Deja explícito **qué** necesita saber la aplicación para resolver una boda.
 *    Con el SDK metido dentro, esa frontera se difumina y acaba habiendo
 *    consultas a Firestore repartidas por media aplicación.
 */

export interface EntradaSlug {
  readonly weddingId: string;
  readonly status: 'active' | 'quarantined';
}

/** Los dos nombres, por separado. */
export interface NombresPareja {
  readonly partnerA: string;
  readonly partnerB: string;
}

/**
 * Los seis colores de marca que elige la pareja.
 *
 * Mandan en la web pública y **solo ahí**: el panel usa la paleta semántica
 * fija, que no depende del gusto cromático de cada boda (REQUISITOS §9.1).
 * `null` mientras la pareja no ha elegido: cada plantilla trae los suyos.
 */
export interface PaletaMarca {
  readonly primary: string;
  readonly secondary: string;
  readonly background: string;
  readonly surface: string;
  readonly text: string;
  readonly accent: string;
}

export interface TemaPublico {
  /** Id del catálogo de plantillas. Ver `features/public-site/plantillas`. */
  readonly templateId: string;
  readonly palette: PaletaMarca | null;
  readonly heroImagePath: string | null;
  /** URL de descarga ya resuelta. Ver `core/firebase/portada.storage.ts`. */
  readonly heroImageUrl: string | null;
}

/** La proyección pública: lo único legible sin autenticación. */
export type VisibilidadModulo = 'hidden' | 'soon' | 'visible';

export interface SitioPublico {
  readonly status: 'draft' | 'active' | 'archived';
  /**
   * Los nombres llegan separados, no como "María y Gabriel" ya montado.
   *
   * La conjunción es texto visible y por tanto va en los ficheros de
   * traducción: en inglés es "and" y en catalán "i". Montar la cadena en el
   * servidor la dejaría fija en español para siempre.
   */
  readonly coupleNames: NombresPareja;
  readonly weddingDate: Date | null;
  /** Hora de reloj de la ceremonia, `'17:00'`. La fija la pareja en su panel. */
  readonly weddingTime: string | null;
  /** Zona de la boda, que es la que manda en la cuenta atrás. */
  readonly timezone: string;
  /** Si la pareja ha pedido salir en buscadores. Por defecto, no. */
  readonly indexable: boolean;
  /**
   * Cómo entra un invitado (§3.3). Viaja en la proyección pública a propósito:
   * la web tiene que saber si pedir identificación **antes** de pintar nada, y
   * preguntarlo a una función costaría una espera en cada visita.
   *
   * Que sea público no filtra nada: dice qué formulario sale, no quién está
   * invitado.
   */
  readonly guestAccessMode: ModoAcceso;
  /** Secciones de la web, tal como las publica la proyección. */
  readonly secciones: readonly Seccion[];
  /**
   * Las preguntas frecuentes publicables (§8.9).
   *
   * Vienen en la proyección y no de su colección: en una boda abierta no hay
   * sesión de invitado con la que leer nada, y una pregunta a medio escribir
   * no tiene por qué estar al alcance de una consulta directa.
   */
  readonly faqs: readonly FaqPublica[];
  /** La cronología del día, solo lo visible para invitados (§8.13). */
  readonly cronologia: readonly HitoPublico[];
  /** Los alojamientos para los invitados de fuera (§8.10). */
  readonly alojamientos: readonly AlojamientoPublico[];
  /** Los sitios del mapa (§8.6): solo los visibles y con coordenadas. */
  readonly ubicaciones: readonly UbicacionPublica[];
  /** El dress code (§8.11). Vacío si el módulo está apagado. */
  readonly dressCode: DressCodePublico;
  /** «Nuestra historia»: apartados ya saneados. Vacío si no hay nada escrito. */
  readonly historia: readonly ApartadoPublicoDeHistoria[];
  /**
   * Qué módulos están a la vista, tal y como los publica la proyección.
   *
   * Solo la **visibilidad**, nunca la configuración: ahí van datos internos —el
   * email del catering, el importe del presupuesto— y esto lo lee cualquiera
   * con el enlace. Lo que la web necesita saber es si enseñar la entrada al
   * formulario de confirmación, no cuándo termina el plazo.
   */
  readonly modulos: Readonly<Record<string, VisibilidadModulo>>;
  readonly locale: string;
  readonly theme: TemaPublico;
}

export interface FuenteTenant {
  buscarSlug(slug: string): Promise<EntradaSlug | null>;
  leerSitio(weddingId: string): Promise<SitioPublico | null>;
}
