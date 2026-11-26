/**
 * Los acompañantes vienen, por defecto, como viene quien los trae (D-51).
 *
 * Si el titular confirma, sus acompañantes cuentan como confirmados; si dice
 * que no viene, tampoco ellos. Se puede cambiar a mano para uno concreto: eso
 * lo marca con `rsvpFollowsTitular: false` y deja de seguir al titular hasta
 * que la pareja lo vuelva a enlazar. Un documento sin la marca sigue (es el
 * caso de los acompañantes anteriores a esta regla).
 *
 * Solo se mueve el **estado**. Su menú o sus alergias son suyos.
 */

import { FieldValue } from 'firebase-admin/firestore';

import type { EstadoRsvp } from './../dominio/formulario';
import { sigueAlTitular } from '../dominio/acompanantes';
import { db } from '../firebase';
import { grupoGeneral } from '../groups';

const POR_LOTE = 400;

/**
 * Pone a los acompañantes que siguen al titular en su mismo estado.
 * Devuelve cuántos ha cambiado.
 */
export async function acompanantesSiguenAlTitular(
  weddingId: string,
  titularId: string,
  estado: EstadoRsvp,
): Promise<number> {
  const base = db();
  const snap = await base
    .collection(`weddings/${weddingId}/guests`)
    .where('invitedById', '==', titularId)
    .get();

  const cambiar = snap.docs.filter((d) => {
    const g = d.data();
    return g['isCompanion'] === true && sigueAlTitular(g) && g['rsvpStatus'] !== estado;
  });
  if (cambiar.length === 0) return 0;

  // Quien confirma está en el grupo de todos (D-47).
  const general = estado === 'confirmed' ? await grupoGeneral(base, weddingId) : null;

  for (let desde = 0; desde < cambiar.length; desde += POR_LOTE) {
    const lote = base.batch();
    for (const doc of cambiar.slice(desde, desde + POR_LOTE)) {
      lote.update(doc.ref, {
        ...(general ? { groupIds: FieldValue.arrayUnion(general) } : {}),
        rsvpStatus: estado,
        rsvpAt: estado === 'pending' ? null : FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    await lote.commit();
  }
  return cambiar.length;
}
