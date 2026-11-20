/**
 * `assignGuestsToTable`: sentar invitados en una mesa, o levantarlos (§8.4).
 *
 * Tiene que ser una función y no una escritura directa por una razón sola:
 * **`guests` está cerrada a lectura y escritura desde el cliente** (regla de
 * oro 2), y la mesa de cada invitado vive en su ficha, no en la mesa. Esa
 * decisión es la correcta —un invitado está en una mesa y solo en una, y
 * guardarlo en los dos sitios es garantizarse que algún día no coincidan— y
 * el precio es esta función.
 *
 * Acepta **varios invitados de una vez** porque el reparto se hace a tandas:
 * se arrastra uno, pero también se sienta a una familia entera o se vacía una
 * mesa para empezarla de nuevo.
 *
 * Lo que **no** hace: impedir que una mesa se pase de su máximo. §8.4 dice
 * avisos y no bloqueos, y el servidor no es el sitio para cambiar eso: el día
 * de la boda se añade una silla, y una función que lo negara obligaría a la
 * pareja a subir el máximo a mentiras para poder seguir trabajando.
 */

import { FieldValue } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import { EXIGIR_APP_CHECK, REGION, db } from './firebase';
import { exigirPareja } from './infra/permisos';

interface Entrada {
  readonly guestIds?: readonly unknown[];
  /** `null` levanta de la mesa; una cadena sienta en esa. */
  readonly tableId?: unknown;
}

/** Firestore no admite lotes de más de 500 escrituras. */
const POR_LOTE = 400;

/** Una boda no tiene más invitados que esto, y el lote no es para importar. */
const MAXIMO_POR_LLAMADA = 500;

export const assignGuestsToTable = onCall<Entrada>(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK },
  async (peticion): Promise<{ sentados: number }> => {
    const { weddingId } = exigirPareja(peticion);

    const ids = Array.isArray(peticion.data?.guestIds)
      ? peticion.data.guestIds.filter((id): id is string => typeof id === 'string' && id !== '')
      : [];

    if (ids.length === 0) {
      throw new HttpsError('invalid-argument', 'Hace falta al menos un invitado.');
    }
    if (ids.length > MAXIMO_POR_LLAMADA) {
      throw new HttpsError('invalid-argument', 'Demasiados invitados de una vez.');
    }

    const tableId = peticion.data?.tableId;
    if (tableId !== null && (typeof tableId !== 'string' || tableId === '')) {
      throw new HttpsError('invalid-argument', 'La mesa no es válida.');
    }

    const base = db();

    // La mesa tiene que existir **y ser de esta boda**. Sin esto, una sesión
    // podría escribir en la ficha de sus invitados el id de una mesa de otra
    // boda: no se escaparía ningún dato, pero el reparto quedaría apuntando a
    // un sitio que su pareja no puede ver ni arreglar.
    if (tableId !== null) {
      const mesa = await base.doc(`weddings/${weddingId}/tables/${tableId}`).get();
      if (!mesa.exists) throw new HttpsError('not-found', 'Esa mesa no existe.');
    }

    const refs = ids.map((id) => base.doc(`weddings/${weddingId}/guests/${id}`));
    const documentos = await base.getAll(...refs);

    let lote = base.batch();
    let enElLote = 0;
    let sentados = 0;

    const cerrarLote = async () => {
      if (enElLote === 0) return;
      await lote.commit();
      lote = base.batch();
      enElLote = 0;
    };

    for (const documento of documentos) {
      // Un id que no existe se ignora en vez de tumbar la llamada entera: lo
      // normal es que alguien haya borrado un invitado mientras la pareja
      // tenía la pantalla abierta, y tumbar el lote dejaría sin sentar a los
      // demás sin decir por qué.
      if (!documento.exists) continue;

      lote.update(documento.ref, { tableId, updatedAt: FieldValue.serverTimestamp() });
      sentados += 1;
      enElLote += 1;
      if (enElLote >= POR_LOTE) await cerrarLote();
    }

    await cerrarLote();
    return { sentados };
  },
);
