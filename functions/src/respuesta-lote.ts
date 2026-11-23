/**
 * `setGuestsRsvp`: la pareja marca «viene», «no viene» o «sin contestar» a
 * varios invitados de una vez.
 *
 * Es lo del teléfono, multiplicado: una familia de seis que confirma en una
 * llamada, o todo un grupo que ha dicho que no puede venir. Apuntarlos de uno en
 * uno abriendo seis fichas es lo único que había.
 *
 * Solo toca el **estado**, nunca las respuestas del formulario: quien dice que no
 * viene no pierde por eso el menú o el mensaje que dejó. Por debajo pasa por
 * `prepararRespuestaDeLaPareja`, la misma pieza que `setGuestRsvp`, así que lo
 * que queda en cada documento es idéntico al caso de uno en uno.
 *
 * - El `weddingId` sale del claim (regla 1): los ids de otra boda no existen
 *   bajo `weddings/{suyo}/guests`, y se cuentan como omitidos.
 * - Quien confirma entra en el grupo de todos (D-47).
 * - No mira el plazo: el plazo es para el invitado.
 */

import { FieldValue } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import { MAX_EN_UN_LOTE, idsDelLote } from './dominio/acompanantes';
import { respuestasGuardadas, type EstadoRsvp } from './dominio/formulario';
import { prepararRespuestaDeLaPareja } from './dominio/respuesta-pareja';
import { EXIGIR_APP_CHECK, REGION, db } from './firebase';
import { grupoGeneral } from './groups';
import { acompanantesSiguenAlTitular } from './infra/acompanantes-asistencia';
import { auditar } from './infra/auditoria';
import { leerPreguntas } from './infra/formulario';
import { exigirPareja } from './infra/permisos';

export interface EntradaSetGuestsRsvp {
  readonly guestIds?: readonly unknown[];
  readonly estado?: unknown;
}

const ESTADOS: readonly EstadoRsvp[] = ['pending', 'confirmed', 'declined'];

/** Firestore no admite lotes de más de 500 escrituras. */
const POR_LOTE = 400;

export const setGuestsRsvp = onCall<EntradaSetGuestsRsvp>(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK },
  async (peticion) => {
    const { weddingId, uid } = exigirPareja(peticion);

    const estado = peticion.data?.estado;
    if (!ESTADOS.includes(estado as EstadoRsvp)) {
      throw new HttpsError('invalid-argument', 'Ese estado no existe.');
    }
    const nuevo = estado as EstadoRsvp;

    const crudos = Array.isArray(peticion.data?.guestIds) ? peticion.data.guestIds : [];
    const ids = idsDelLote(crudos);
    if (ids.length === 0) throw new HttpsError('invalid-argument', 'No hay invitados.');
    if (crudos.length > MAX_EN_UN_LOTE) {
      throw new HttpsError('invalid-argument', 'Son demasiados de una vez.');
    }

    const base = db();
    const refs = ids.map((id) => base.doc(`weddings/${weddingId}/guests/${id}`));
    const [documentos, preguntas, general] = await Promise.all([
      base.getAll(...refs),
      leerPreguntas(weddingId),
      nuevo === 'confirmed' ? grupoGeneral(base, weddingId) : Promise.resolve(null),
    ]);

    // Un id que no existe se omite: `update` fallaría y `set` crearía un
    // invitado fantasma.
    const existentes = documentos.filter((d) => d.exists);
    const omitidos = ids.length - existentes.length;

    let cambiados = 0;
    for (let desde = 0; desde < existentes.length; desde += POR_LOTE) {
      const lote = base.batch();

      for (const documento of existentes.slice(desde, desde + POR_LOTE)) {
        const invitado = documento.data() ?? {};
        const preparado = prepararRespuestaDeLaPareja(
          preguntas,
          invitado['isCompanion'] === true,
          { estado: nuevo, respuestas: null },
          {
            estado: ESTADOS.includes(invitado['rsvpStatus'] as EstadoRsvp)
              ? (invitado['rsvpStatus'] as EstadoRsvp)
              : 'pending',
            respuestas: respuestasGuardadas(invitado['rsvpAnswers']),
          },
        );

        // Con `respuestas: null` no hay nada que validar y siempre es `ok`; si
        // algún día deja de serlo, se omite en vez de escribir a medias.
        if (!preparado.ok) continue;

        lote.update(documento.ref, {
          ...(general ? { groupIds: FieldValue.arrayUnion(general) } : {}),
          rsvpAnswers: preparado.respuestas,
          rsvpStatus: preparado.estado,
          rsvpAt: preparado.estado === 'pending' ? null : FieldValue.serverTimestamp(),
          // Un acompañante marcado sin su titular va por libre; con él, sigue.
          ...(invitado['isCompanion'] === true &&
          !(typeof invitado['invitedById'] === 'string' && ids.includes(invitado['invitedById']))
            ? { rsvpFollowsTitular: false }
            : {}),
          updatedAt: FieldValue.serverTimestamp(),
        });
        cambiados += 1;
      }

      await lote.commit();
    }

    // Los titulares marcados arrastran a sus acompañantes que no estaban en el lote.
    for (const documento of existentes) {
      if (documento.data()?.['isCompanion'] !== true) {
        await acompanantesSiguenAlTitular(weddingId, documento.id, nuevo);
      }
    }

    await auditar({
      actorUid: uid,
      actorRole: 'owner',
      action: 'setGuestsRsvp',
      weddingId,
      payload: { estado: nuevo, cuantos: cambiados, omitidos },
    });

    return { ok: true as const, cambiados, omitidos: ids.length - cambiados };
  },
);
