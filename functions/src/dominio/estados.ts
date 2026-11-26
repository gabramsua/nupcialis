/**
 * Los estados de una boda y los saltos permitidos entre ellos.
 *
 * `draft` → `active` → `archived` (REQUISITOS §4.3). Aquí no hay red ni
 * Firestore: son reglas puras, y por eso se pueden probar todas de un tirón.
 *
 * El salto que de verdad importa es **publicar**. Una boda publicada es una
 * dirección que la pareja reparte por WhatsApp a doscientas personas, y lo que
 * vean al abrirla ya no se puede recoger. Por eso publicar no es solo cambiar
 * un campo: hay un mínimo que comprobar antes.
 */

export type EstadoBoda = 'draft' | 'active' | 'archived';

export const ESTADOS: readonly EstadoBoda[] = ['draft', 'active', 'archived'];

export function esEstado(valor: unknown): valor is EstadoBoda {
  return valor === 'draft' || valor === 'active' || valor === 'archived';
}

/**
 * A dónde se puede ir desde cada estado.
 *
 * `archived` → `draft` no está, y es a propósito: no hay ningún caso real en
 * que una boda archivada tenga que volver a estar a medio montar. Si hiciera
 * falta, se reactiva y se despublica, que son dos pasos conscientes en vez de
 * uno que nadie sabe explicar.
 */
const SALTOS: Record<EstadoBoda, readonly EstadoBoda[]> = {
  draft: ['active', 'archived'],
  active: ['draft', 'archived'],
  archived: ['active'],
};

export function saltoPermitido(desde: EstadoBoda, hasta: EstadoBoda): boolean {
  return SALTOS[desde].includes(hasta);
}

/** Lo que hace falta mirar de la boda para decidir si se puede publicar. */
export interface BodaParaPublicar {
  readonly couple?: { readonly partnerA?: unknown; readonly partnerB?: unknown };
  readonly weddingDate?: unknown;
  readonly slug?: unknown;
}

export type MotivoNoPublicable = 'sin-nombres' | 'sin-fecha' | 'sin-slug';

function tieneTexto(valor: unknown): boolean {
  return typeof valor === 'string' && valor.trim() !== '';
}

/**
 * Por qué esta boda todavía no se puede publicar. Vacío significa que sí.
 *
 * Se devuelven **todos** los motivos, no el primero: quien está publicando
 * quiere saber de una vez todo lo que le falta, no descubrirlo de uno en uno.
 *
 * El mínimo es deliberadamente corto —nombres, fecha y dirección— porque es
 * exactamente lo que la portada necesita para no salir vacía. Publicar una boda
 * sin nombres enseña un rombo de color y una inicial suelta, que es lo que pasó
 * el 2026-09-14 y lo que esta comprobación existe para impedir.
 */
export function motivosParaNoPublicar(boda: BodaParaPublicar): readonly MotivoNoPublicable[] {
  const motivos: MotivoNoPublicable[] = [];

  if (!tieneTexto(boda.couple?.partnerA) || !tieneTexto(boda.couple?.partnerB)) {
    motivos.push('sin-nombres');
  }
  if (boda.weddingDate === null || boda.weddingDate === undefined) {
    motivos.push('sin-fecha');
  }
  if (!tieneTexto(boda.slug)) {
    motivos.push('sin-slug');
  }

  return motivos;
}
