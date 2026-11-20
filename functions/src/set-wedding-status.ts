/**
 * Publicar, despublicar y archivar una boda.
 *
 * `status` es un campo de sistema: las reglas de Firestore no dejan que lo
 * escriba ni la propia pareja (regla 6). Tiene que pasar por aquí, y está bien
 * que así sea, porque publicar no es un cambio de campo: es poner una dirección
 * en manos de doscientos invitados.
 *
 * No hay que tocar la proyección pública: `syncPublicProjection` se dispara con
 * la escritura y la republica sola. Duplicar eso aquí sería la segunda copia de
 * la verdad, que es como se acaba publicando una boda a medias.
 */

import { FieldValue } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import {
  esEstado,
  motivosParaNoPublicar,
  saltoPermitido,
  type EstadoBoda,
} from './dominio/estados';
import { EXIGIR_APP_CHECK, REGION, db } from './firebase';
import { auditar } from './infra/auditoria';
import { exigirSuperadmin } from './infra/permisos';

export interface EntradaEstado {
  readonly weddingId: string;
  readonly status: EstadoBoda;
}

export const setWeddingStatus = onCall<Partial<EntradaEstado>>(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK },
  async (peticion) => {
    const superadmin = exigirSuperadmin(peticion);

    const weddingId = peticion.data?.weddingId;
    if (typeof weddingId !== 'string' || weddingId.trim() === '') {
      throw new HttpsError('invalid-argument', 'Falta la boda.');
    }

    const destino = peticion.data?.status;
    if (!esEstado(destino)) {
      throw new HttpsError('invalid-argument', 'Ese estado no existe.');
    }

    const ref = db().doc(`weddings/${weddingId}`);
    const boda = await ref.get();
    if (!boda.exists) throw new HttpsError('not-found', 'Esa boda no existe.');

    const datos = boda.data() ?? {};
    const actual: EstadoBoda = esEstado(datos['status']) ? datos['status'] : 'draft';

    if (actual === destino) {
      // No es un error: dos pestañas abiertas, o un doble clic. Se responde que
      // ya está como se pedía y no se escribe nada.
      return { weddingId, status: actual, cambiado: false, motivos: [] };
    }

    if (!saltoPermitido(actual, destino)) {
      throw new HttpsError('failed-precondition', `No se puede pasar de ${actual} a ${destino}.`);
    }

    // El mínimo solo se exige al publicar. Despublicar y archivar tienen que
    // funcionar siempre: son las dos salidas de emergencia cuando algo va mal, y
    // una salida de emergencia con condiciones no es una salida.
    if (destino === 'active') {
      const motivos = motivosParaNoPublicar(datos);
      if (motivos.length > 0) {
        throw new HttpsError('failed-precondition', 'Le faltan datos a la boda.', { motivos });
      }
    }

    await ref.update({ status: destino, updatedAt: FieldValue.serverTimestamp() });

    await auditar({
      actorUid: superadmin.uid,
      actorRole: 'superadmin',
      action: 'setWeddingStatus',
      weddingId,
      payload: { de: actual, a: destino },
    });

    return { weddingId, status: destino, cambiado: true, motivos: [] };
  },
);
