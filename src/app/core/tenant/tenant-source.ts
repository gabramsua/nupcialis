import type { Seccion } from '../../features/public-site/secciones/secciones';

/**
 * Puerto de datos del tenant.
 *
 * La lógica de resolución no habla con Firestore: habla con esto. Dos motivos,
 * y el segundo importa más que el primero:
 *
 * 1. Se puede probar sin emulador ni navegador, con un doble de tres líneas.
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
  /** Secciones de la web, tal como las publica la proyección. */
  readonly secciones: readonly Seccion[];
  readonly locale: string;
  readonly theme: TemaPublico;
}

export interface FuenteTenant {
  buscarSlug(slug: string): Promise<EntradaSlug | null>;
  leerSitio(weddingId: string): Promise<SitioPublico | null>;
}
