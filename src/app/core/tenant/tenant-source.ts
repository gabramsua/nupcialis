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

/** La proyección pública: lo único legible sin autenticación. */
export interface SitioPublico {
  readonly status: 'draft' | 'active' | 'archived';
  readonly coupleNames: string;
  readonly weddingDate: Date | null;
  readonly locale: string;
}

export interface FuenteTenant {
  buscarSlug(slug: string): Promise<EntradaSlug | null>;
  leerSitio(weddingId: string): Promise<SitioPublico | null>;
}
