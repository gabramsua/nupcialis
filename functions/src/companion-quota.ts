/**
 * `setCompanionQuota`: el cupo de acompañantes, a varios invitados de una vez.
 *
 * En una boda hay doscientos invitados y el cupo se decide por tandas —«los
 * amigos, uno cada uno; la familia, ninguno»—. Ponerlo de uno en uno abriendo
 * doscientas fichas es una tarde perdida, y es lo único que había.
 *
 * Dos reglas que no se pueden dejar a la pantalla:
 *
 * - **Un acompañante no recibe cupo.** Si no, el cupo se vuelve una cadena
 *   (ver `dominio/acompanantes.ts`). Los que vengan en la lista se omiten y se
 *   dice cuántos.
 * - **Bajar el cupo no echa a nadie.** Quien ya añadió a dos sigue con dos; lo
 *   que no podrá es añadir a un tercero.
 *
 * El `weddingId` sale del claim (regla 1), así que los documentos se escriben
 * bajo `weddings/{suyo}/guests` y una sesión de una boda no puede tocar otra
 * ni mandando ids de allí.
 */

import { FieldValue } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import { idsDelLote, validarLoteDeCupo } from './dominio/acompanantes';
import { MAX_ACOMPANANTES } from './dominio/invitados';
import { EXIGIR_APP_CHECK, REGION, db } from './firebase';
import { auditar } from './infra/auditoria';
import { exigirPareja } from './infra/permisos';

interface Entrada {
  readonly guestIds?: readonly unknown[];
  readonly maxCompanions?: unknown;
}

/** Firestore no admite lotes de más de 500 escrituras. */
const POR_LOTE = 400;

export const setCompanionQuota = onCall<Entrada>(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK },
  async (peticion) => {
    const { weddingId, uid } = exigirPareja(peticion);

    const guestIds = Array.isArray(peticion.data?.guestIds) ? peticion.data.guestIds : [];
    const maxCompanions = peticion.data?.maxCompanions;

    const motivos = validarLoteDeCupo(guestIds, maxCompanions, MAX_ACOMPANANTES);
    if (motivos.length > 0) {
      throw new HttpsError('invalid-argument', 'El cupo o la lista no valen.', { motivos });
    }

    const cupo = maxCompanions as number;
    const ids = idsDelLote(guestIds);
    const base = db();
    const refs = ids.map((id) => base.doc(`weddings/${weddingId}/guests/${id}`));
    const documentos = await base.getAll(...refs);

    // Se mira **antes** de escribir: un acompañante con cupo rompe la regla de
    // la cadena, y un id que no existe crearía un invitado fantasma, porque
    // `update` falla pero `set` no.
    const destinatarios = documentos.filter((d) => d.exists && d.data()?.['isCompanion'] !== true);
    const omitidos = ids.length - destinatarios.length;

    for (let desde = 0; desde < destinatarios.length; desde += POR_LOTE) {
      const lote = base.batch();
      for (const documento of destinatarios.slice(desde, desde + POR_LOTE)) {
        lote.update(documento.ref, {
          maxCompanions: cupo,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
      await lote.commit();
    }

    await auditar({
      actorUid: uid,
      actorRole: 'owner',
      action: 'setCompanionQuota',
      weddingId,
      payload: { cuantos: destinatarios.length, cupo, omitidos },
    });

    return { cambiados: destinatarios.length, omitidos };
  },
);
