/**
 * Cuenta una visita a la web de la boda (D-55).
 *
 * Un contador y nada más: no se envía quién eres ni de dónde vienes, y no se
 * guarda nada en el navegador salvo una marca de pestaña para no contar cada
 * recarga. Si la llamada falla no pasa nada: contar visitas nunca puede romper
 * la web.
 */

import type { Functions } from 'firebase/functions';
import { httpsCallable } from 'firebase/functions';

const CLAVE = 'np.visita.contada';

/** ¿Ya se contó en esta pestaña? Sin almacenamiento, se cuenta una vez por carga. */
function yaContada(slug: string): boolean {
  try {
    if (sessionStorage.getItem(CLAVE) === slug) return true;
    sessionStorage.setItem(CLAVE, slug);
  } catch {
    // Modo privado o sin almacenamiento: se cuenta y ya.
  }
  return false;
}

/** `crear` solo cambia en las pruebas: así no hace falta falsear el módulo de Firebase. */
export async function registrarVisitaWeb(
  functions: Functions,
  slug: string,
  crear: (
    f: Functions,
    nombre: string,
  ) => (datos: { slug: string }) => Promise<unknown> = httpsCallable,
): Promise<void> {
  if (slug === '' || yaContada(slug)) return;
  try {
    await crear(functions, 'recordWebVisit')({ slug });
  } catch {
    // Un contador que no cuenta no es motivo para molestar a nadie.
  }
}
