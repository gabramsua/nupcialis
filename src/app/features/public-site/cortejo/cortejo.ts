/**
 * Las personas importantes de la boda (§8.12), tal y como llegan a la web.
 *
 * **Copia literal** del fichero del cliente, de la línea marcadora de ahí abajo
 * hasta el final. No se edita solo este fichero: se editan los dos, o el test
 * de la copia falla.
 *
 * **Qué se publica y qué no.** El documento de la pareja trae el teléfono, el
 * vínculo con la lista de invitados y los datos del consentimiento. Nada de
 * eso sale: se copia campo a campo (lista blanca). Y la **foto** solo sale si
 * hay un consentimiento registrado (`photoConsent === true`): son fotos de
 * terceros publicadas en una web (PENDIENTES D-61). Una foto sin consentimiento
 * se queda en la colección de la pareja y la persona sale sin foto.
 */

// === COPIA LITERAL: de aquí al final, idéntico en cliente y funciones ===

export const MAX_PERSONAS = 30;
export const MAX_NOMBRE_PERSONA = 60;
export const MAX_PAPEL = 60;
export const MAX_BIO = 300;
const MAX_URL_FOTO = 1000;

export const LADOS = ['A', 'B', 'both'] as const;
export type LadoPersona = (typeof LADOS)[number];

export function esLado(valor: unknown): valor is LadoPersona {
  return typeof valor === 'string' && (LADOS as readonly string[]).includes(valor);
}

/** Una persona tal y como llega a la web pública. */
export interface PersonaPublica {
  readonly id: string;
  readonly name: string;
  /** «Madrina», «Portaanillos»… */
  readonly role: string;
  /** De qué lado de la pareja: `A`, `B` o los dos. */
  readonly side: LadoPersona;
  /** Una línea sobre quién es: «Amiga de María desde el colegio». */
  readonly bio: string;
  /** Solo si la pareja confirmó que la persona sabe que su foto sale en la web. */
  readonly photoUrl: string | null;
  readonly order: number;
}

function texto(valor: unknown, maximo: number): string {
  if (typeof valor !== 'string') return '';
  return valor.replace(/\r\n/g, '\n').trim().slice(0, maximo);
}

/** La URL de la foto, solo si es una URL `https`. */
function urlDeFoto(valor: unknown): string | null {
  if (typeof valor !== 'string' || valor.length > MAX_URL_FOTO) return null;
  try {
    return new URL(valor).protocol === 'https:' ? valor : null;
  } catch {
    return null;
  }
}

/**
 * Deja la lista publicable. Nunca lanza.
 *
 * Se cae quien la pareja no ha marcado como visible y quien no tiene nombre o
 * papel: una persona sin papel no es una persona importante, es un nombre
 * suelto. Se publican como mucho `MAX_PERSONAS`, en el orden de la pareja.
 */
export function sanearCortejo(valor: unknown): readonly PersonaPublica[] {
  if (!Array.isArray(valor)) return [];

  const salida: PersonaPublica[] = [];

  for (const crudo of valor) {
    if (crudo === null || typeof crudo !== 'object') continue;
    const d = crudo as Record<string, unknown>;

    if (d['visibleToGuests'] !== true) continue;

    const id = typeof d['id'] === 'string' ? d['id'] : '';
    const name = texto(d['displayName'], MAX_NOMBRE_PERSONA);
    const role = texto(d['role'], MAX_PAPEL);
    if (id === '' || name === '' || role === '') continue;

    const orden = d['order'];

    salida.push({
      id,
      name,
      role,
      side: esLado(d['side']) ? d['side'] : 'both',
      bio: texto(d['bio'], MAX_BIO),
      // Sin consentimiento, sin foto. Es lo que protege a la persona, y por eso
      // se comprueba aquí y no solo en el panel.
      photoUrl: d['photoConsent'] === true ? urlDeFoto(d['photoUrl']) : null,
      order: typeof orden === 'number' && Number.isFinite(orden) ? orden : 0,
    });
  }

  return salida
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
    .slice(0, MAX_PERSONAS);
}

/**
 * Lee la lista **ya publicada**, la que el navegador recibe de Firestore.
 *
 * No es `sanearCortejo` a propósito: aquella lee el documento de la pareja
 * (`displayName`, `visibleToGuests`, `photoConsent`) y lo publicado ya no
 * trae nada de eso —el servidor aplicó el filtro—. Pasar lo publicado otra vez
 * por ella tiraba a todas las personas importantes de la web.
 */
export function leerCortejoPublicado(valor: unknown): readonly PersonaPublica[] {
  if (!Array.isArray(valor)) return [];

  const salida: PersonaPublica[] = [];

  for (const crudo of valor) {
    if (crudo === null || typeof crudo !== 'object') continue;
    const d = crudo as Record<string, unknown>;

    const id = typeof d['id'] === 'string' ? d['id'] : '';
    const name = texto(d['name'], MAX_NOMBRE_PERSONA);
    const role = texto(d['role'], MAX_PAPEL);
    if (id === '' || name === '' || role === '') continue;

    const orden = d['order'];

    salida.push({
      id,
      name,
      role,
      side: esLado(d['side']) ? d['side'] : 'both',
      bio: texto(d['bio'], MAX_BIO),
      photoUrl: urlDeFoto(d['photoUrl']),
      order: typeof orden === 'number' && Number.isFinite(orden) ? orden : 0,
    });
  }

  return salida
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
    .slice(0, MAX_PERSONAS);
}
