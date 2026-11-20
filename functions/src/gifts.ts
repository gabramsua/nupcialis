/**
 * Regalos: lo que la pareja pide y cómo se le aporta (§8.8).
 *
 * **Nada de esto viaja en la proyección pública**, y es una decisión de
 * seguridad, no de arquitectura: `public/site` lo lee cualquiera que sepa el
 * slug, y un IBAN con su titular y un número de Bizum ahí dentro es material
 * listo para que un tercero monte la misma web y pida el dinero en nombre de
 * la pareja. Se sirve aquí, a invitados identificados, y en la web pública solo
 * hay un enlace que lleva a identificarse.
 *
 * La reserva también vive aquí por dos motivos (§8.8): es **anónima para el
 * resto de invitados**, y `reservedBy` está en el documento —una regla puede
 * negar una escritura, no esconder un campo de una lectura—; y coger un regalo
 * sin pisar el de otro es una transacción, no un `update`.
 */

import { FieldValue } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import {
  sanearAportacion,
  sanearRegalos,
  type AportacionPublica,
  type RegaloPublico,
} from './dominio/regalos';
import { EXIGIR_APP_CHECK, REGION, db } from './firebase';
import { exigirInvitado, exigirVerificado } from './infra/permisos';
import { modoDeAcceso } from './infra/boda';

interface Respuesta {
  readonly aportacion: AportacionPublica;
  readonly regalos: readonly RegaloPublico[];
}

/** La pantalla entera de regalos: lo que se pide y lo que se puede aportar. */
export const getGifts = onCall(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK },
  async (peticion): Promise<Respuesta> => {
    const invitado = exigirInvitado(peticion);
    exigirVerificado(invitado, await modoDeAcceso(invitado.weddingId));

    return leerRegalos(invitado.weddingId, invitado.guestId);
  },
);

interface EntradaRegalo {
  readonly giftId?: unknown;
}

/**
 * Coge un regalo de la lista.
 *
 * En transacción, y comprobando dentro que sigue libre: dos invitados mirando
 * la misma lista a la vez es el caso normal —la gente abre la web cuando le
 * llega el recordatorio, todos a la vez—, y lo que no puede pasar es que el
 * segundo pise la reserva del primero y los dos se queden pensando que llevan
 * la cafetera.
 */
export const reserveGift = onCall<EntradaRegalo>(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK },
  async (peticion): Promise<Respuesta> => {
    const invitado = exigirInvitado(peticion);
    exigirVerificado(invitado, await modoDeAcceso(invitado.weddingId));

    const giftId = idDe(peticion.data?.giftId);
    const ref = db().doc(`weddings/${invitado.weddingId}/gifts/${giftId}`);

    await db().runTransaction(async (transaccion) => {
      const snap = await transaccion.get(ref);
      if (!snap.exists) throw new HttpsError('not-found', 'Ese regalo ya no está.');

      const cogido = snap.data()?.['reservedBy'];
      if (typeof cogido === 'string' && cogido !== '' && cogido !== invitado.guestId) {
        throw new HttpsError('failed-precondition', 'Ese regalo ya lo ha cogido alguien.', {
          motivo: 'ya-reservado',
        });
      }

      transaccion.update(ref, {
        reservedBy: invitado.guestId,
        reservedAt: FieldValue.serverTimestamp(),
      });
    });

    return leerRegalos(invitado.weddingId, invitado.guestId);
  },
);

/**
 * Suelta un regalo que había cogido.
 *
 * Solo el suyo. Soltar lo ajeno no se permite ni «por si se ha equivocado»: la
 * reserva es anónima, así que desde fuera nadie puede saber si lleva cinco
 * minutos o cinco meses cogida.
 */
export const releaseGift = onCall<EntradaRegalo>(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK },
  async (peticion): Promise<Respuesta> => {
    const invitado = exigirInvitado(peticion);
    exigirVerificado(invitado, await modoDeAcceso(invitado.weddingId));

    const giftId = idDe(peticion.data?.giftId);
    const ref = db().doc(`weddings/${invitado.weddingId}/gifts/${giftId}`);

    await db().runTransaction(async (transaccion) => {
      const snap = await transaccion.get(ref);
      if (!snap.exists) return;

      if (snap.data()?.['reservedBy'] !== invitado.guestId) {
        throw new HttpsError('permission-denied', 'Ese regalo no lo cogiste tú.');
      }

      transaccion.update(ref, { reservedBy: null, reservedAt: null });
    });

    return leerRegalos(invitado.weddingId, invitado.guestId);
  },
);

function idDe(valor: unknown): string {
  const id = typeof valor === 'string' ? valor.trim() : '';
  if (id === '') throw new HttpsError('invalid-argument', 'Falta el regalo.');
  return id;
}

/**
 * Lo que ve un invitado concreto.
 *
 * Se devuelve la lista entera después de cada reserva en vez de un `ok`: así
 * el que acaba de coger algo ve en el mismo viaje lo que han cogido los demás
 * mientras él elegía, que es justo cuando se entera de que llega tarde.
 */
async function leerRegalos(weddingId: string, guestId: string): Promise<Respuesta> {
  const base = db();

  const [boda, lista] = await Promise.all([
    base.doc(`weddings/${weddingId}`).get(),
    base.collection(`weddings/${weddingId}/gifts`).get(),
  ]);

  const contenido = (boda.data()?.['content'] ?? {}) as Record<string, unknown>;

  return {
    aportacion: sanearAportacion(contenido['gifts']),
    regalos: sanearRegalos(
      lista.docs.map((d) => ({ id: d.id, ...d.data() })),
      guestId,
    ),
  };
}
