/**
 * El libro de firmas (§8.15): reglas puras, sin Firestore.
 *
 * Un invitado identificado deja un mensaje para la pareja; los demás invitados
 * lo ven firmado con su mote. La pareja lo modera **a posteriori**: se publica al
 * enviar y se oculta o se borra desde el panel (decidido con Gabriel, D-59).
 *
 * El mensaje es **texto plano**, no HTML: se pinta escapado, así que no hay nada
 * que sanear y nada que pueda colarse en la web de cientos de invitados.
 */

export const MAX_MENSAJE = 800;
export const MAX_POR_INVITADO = 3;
/** Más de esto en un libro ya no se lee; es también el tope de lo que viaja. */
export const MAX_FIRMAS = 500;

export type EstadoFirma = 'visible' | 'hidden';

export interface FirmaGuardada {
  readonly id: string;
  readonly guestId: string;
  readonly authorName: string;
  readonly message: string;
  readonly status: EstadoFirma;
  /** Marca de tiempo en milisegundos, o `null` si aún no la ha escrito el servidor. */
  readonly creada: number | null;
}

/** Lo que ve un invitado: nunca el `guestId` de nadie. */
export interface FirmaPublica {
  readonly id: string;
  readonly autor: string;
  readonly mensaje: string;
  readonly cuando: string | null;
  /** Si es suya: puede borrarla. */
  readonly mia: boolean;
}

/** Salto de línea normalizado, sin caracteres de control y recortado. */
export function limpiarMensaje(valor: unknown): string {
  if (typeof valor !== 'string') return '';
  return (
    valor
      .replace(/\r\n?/g, '\n')
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
      .slice(0, MAX_MENSAJE)
  );
}

/**
 * El nombre con el que firma: el mote si lo tiene, que es como lo llama la
 * pareja; si no, **solo el nombre de pila**, sin apellidos. El muro lo ve todo
 * el que entra y firmar «Ricardo» deja un poco de misterio (D-59).
 */
export function nombreDeFirma(invitado: Record<string, unknown>): string {
  const mote = typeof invitado['nickname'] === 'string' ? invitado['nickname'].trim() : '';
  const nombre = typeof invitado['fullName'] === 'string' ? invitado['fullName'].trim() : '';
  const pila = nombre.split(/\s+/)[0] ?? '';
  return (mote || pila).slice(0, 80);
}

function milis(valor: unknown): number | null {
  const v = valor as { toMillis?: () => number } | null;
  return v && typeof v.toMillis === 'function' ? v.toMillis() : null;
}

export function leerFirma(id: string, datos: Record<string, unknown>): FirmaGuardada | null {
  const guestId = typeof datos['guestId'] === 'string' ? datos['guestId'] : '';
  const message = typeof datos['message'] === 'string' ? datos['message'] : '';
  if (guestId === '' || message === '') return null;

  return {
    id,
    guestId,
    authorName: typeof datos['authorName'] === 'string' ? datos['authorName'] : '',
    message,
    status: datos['status'] === 'hidden' ? 'hidden' : 'visible',
    creada: milis(datos['createdAt']),
  };
}

export type DecisionFirma = 'crear' | 'vacia' | 'tope-invitado' | 'tope-libro';

export function decidirFirma(
  firmas: readonly FirmaGuardada[],
  guestId: string,
  mensaje: string,
): DecisionFirma {
  if (mensaje === '') return 'vacia';
  if (firmas.length >= MAX_FIRMAS) return 'tope-libro';
  if (firmas.filter((f) => f.guestId === guestId).length >= MAX_POR_INVITADO) {
    return 'tope-invitado';
  }
  return 'crear';
}

/** Las visibles, la más reciente primero, sin ningún `guestId`. */
export function firmasParaInvitado(
  firmas: readonly FirmaGuardada[],
  guestId: string,
): readonly FirmaPublica[] {
  return firmas
    .filter((f) => f.status === 'visible')
    .sort((a, b) => (b.creada ?? Number.MAX_SAFE_INTEGER) - (a.creada ?? Number.MAX_SAFE_INTEGER))
    .map((f) => ({
      id: f.id,
      autor: f.authorName,
      mensaje: f.message,
      cuando: f.creada === null ? null : new Date(f.creada).toISOString(),
      mia: f.guestId === guestId,
    }));
}
