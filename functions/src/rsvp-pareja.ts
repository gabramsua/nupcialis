/**
 * `setGuestRsvp`: la pareja contesta por un invitado.
 *
 * Gente mayor que no entra en la web, gente que no contesta aunque se le
 * insista, gente que lo dice por WhatsApp: los novios tienen que poder fijar la
 * asistencia y el resto de respuestas a mano (REQUISITOS §8.2).
 *
 * Solo la pareja, y solo de su boda: el `weddingId` sale del claim (regla 1) y el
 * invitado tiene que ser de esa boda. **No mira el plazo**: el plazo es para el
 * invitado, no para quien organiza la boda.
 *
 * Deja en el documento exactamente lo mismo que `submitRsvp` —respuestas,
 * campos mapeados y estado—, porque el contador de confirmados, las mesas y la
 * exportación al catering salen de ahí.
 */

import { FieldValue } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import { respuestasGuardadas, texto, type EstadoRsvp } from './dominio/formulario';
import { prepararRespuestaDeLaPareja } from './dominio/respuesta-pareja';
import { EXIGIR_APP_CHECK, REGION, db } from './firebase';
import { acompanantesSiguenAlTitular } from './infra/acompanantes-asistencia';
import { auditar } from './infra/auditoria';
import { leerPreguntas } from './infra/formulario';
import { grupoGeneral } from './groups';
import { exigirPareja } from './infra/permisos';

export interface EntradaSetGuestRsvp {
  readonly guestId?: unknown;
  readonly estado?: unknown;
  readonly respuestas?: unknown;
}

const ESTADOS: readonly EstadoRsvp[] = ['pending', 'confirmed', 'declined'];

function estadoDe(valor: unknown): EstadoRsvp {
  return ESTADOS.includes(valor as EstadoRsvp) ? (valor as EstadoRsvp) : 'pending';
}

export const setGuestRsvp = onCall<EntradaSetGuestRsvp>(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK },
  async (peticion) => {
    const { weddingId, uid } = exigirPareja(peticion);
    const datos = peticion.data ?? {};

    const guestId = typeof datos.guestId === 'string' ? datos.guestId : '';
    if (guestId === '') throw new HttpsError('invalid-argument', 'Falta el invitado.');

    const estado =
      datos.estado === undefined || datos.estado === null
        ? null
        : ESTADOS.includes(datos.estado as EstadoRsvp)
          ? (datos.estado as EstadoRsvp)
          : undefined;
    if (estado === undefined) throw new HttpsError('invalid-argument', 'Ese estado no existe.');

    const respuestas =
      datos.respuestas === undefined || datos.respuestas === null
        ? null
        : respuestasGuardadas(datos.respuestas);

    if (estado === null && respuestas === null) {
      throw new HttpsError('invalid-argument', 'No hay nada que guardar.');
    }

    const ref = db().doc(`weddings/${weddingId}/guests/${guestId}`);
    const [invitadoSnap, preguntas] = await Promise.all([ref.get(), leerPreguntas(weddingId)]);

    // Del invitado de otra boda no se distingue de uno que no existe.
    const invitado = invitadoSnap.data();
    if (!invitadoSnap.exists || !invitado) {
      throw new HttpsError('not-found', 'Ese invitado no existe.');
    }

    const preparado = prepararRespuestaDeLaPareja(
      preguntas,
      invitado['isCompanion'] === true,
      { estado, respuestas },
      {
        estado: estadoDe(invitado['rsvpStatus']),
        respuestas: respuestasGuardadas(invitado['rsvpAnswers']),
      },
    );

    if (!preparado.ok) {
      throw new HttpsError('invalid-argument', 'Hay respuestas que no valen.', {
        fallos: preparado.fallos,
      });
    }

    // Quien confirma está en el grupo de todos (D-47).
    const general = preparado.estado === 'confirmed' ? await grupoGeneral(db(), weddingId) : null;

    await ref.update({
      ...(general ? { groupIds: FieldValue.arrayUnion(general) } : {}),
      rsvpAnswers: preparado.respuestas,
      ...preparado.campos,
      rsvpStatus: preparado.estado,
      // Pendiente es «no ha contestado»: sin fecha, como un invitado nuevo.
      rsvpAt: preparado.estado === 'pending' ? null : FieldValue.serverTimestamp(),
      // Cambiar el estado de un acompañante a mano es decir que va por libre.
      ...(estado !== null && invitado['isCompanion'] === true ? { rsvpFollowsTitular: false } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Los acompañantes vienen como viene quien los trae (D-51).
    if (estado !== null && invitado['isCompanion'] !== true) {
      await acompanantesSiguenAlTitular(weddingId, guestId, preparado.estado);
    }

    // Sin el nombre ni lo contestado: el log lo lee el superadmin y no tiene por
    // qué llevarse los datos de cada invitado de cada boda.
    await auditar({
      actorUid: uid,
      actorRole: 'owner',
      action: 'setGuestRsvp',
      weddingId,
      payload: { guestId, estado: preparado.estado, soloEstado: respuestas === null },
    });

    return { ok: true as const, estado: preparado.estado, nombre: texto(invitado['fullName']) };
  },
);
