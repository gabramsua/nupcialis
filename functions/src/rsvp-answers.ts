/**
 * `listRsvpAnswers`: lo que han contestado los invitados, para la pareja.
 *
 * Existe porque `listGuests` **recorta** `rsvpAnswers` a propósito: con
 * trescientos invitados y ocho preguntas, mandarlo para pintar la lista
 * multiplica por cinco lo que viaja. Pero la pareja necesita leerlo: ahí están
 * las canciones que ha pedido la gente y los mensajes que les han escrito, y
 * hasta ahora **no se veían en ninguna parte** —ni en la lista, ni en la ficha
 * del invitado, ni en la exportación—.
 *
 * Solo la pareja, y solo de su boda: el `weddingId` sale del claim (regla 1).
 */

import { Timestamp } from 'firebase-admin/firestore';
import { onCall } from 'firebase-functions/v2/https';

import { respuestasGuardadas, texto, type Respuestas } from './dominio/formulario';
import { EXIGIR_APP_CHECK, REGION, db } from './firebase';
import { leerPreguntas, ordenarPreguntas } from './infra/formulario';
import { exigirPareja } from './infra/permisos';

export interface RespuestasDeInvitado {
  readonly guestId: string;
  readonly nombre: string;
  /** El mote, si lo tiene: es como la pareja lo llama. */
  readonly mote: string;
  readonly estado: string;
  /** Si lo trajo otro invitado (D-51): sus respuestas cuentan igual que las del titular. */
  readonly esAcompanante: boolean;
  /** Nombre de quien lo trajo, o vacío si no es acompañante o no se encuentra. */
  readonly traidoPor: string;
  /** Cuándo contestó, en ISO, o `null` si no ha contestado. */
  readonly cuando: string | null;
  readonly respuestas: Respuestas;
}

/**
 * `listRsvpAnswers`: lo que han contestado los invitados, pregunta a pregunta.
 *
 * Existe porque `listGuests` **recorta** `rsvpAnswers` a propósito: con
 * trescientos invitados y ocho preguntas, mandarlo para pintar la lista
 * multiplica por cinco lo que viaja. Pero la pareja necesita leerlo: ahí están
 * las canciones que ha pedido la gente y los mensajes que les han escrito, y
 * hasta ahora **no se veían en ninguna parte** —ni en la lista, ni en la ficha,
 * ni en la exportación—.
 *
 * Solo la pareja, y solo de su boda: el `weddingId` sale del claim (regla 1).
 */
export const listRsvpAnswers = onCall(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK },
  async (peticion) => {
    const { weddingId } = exigirPareja(peticion);

    const [preguntas, invitados] = await Promise.all([
      leerPreguntas(weddingId),
      db().collection(`weddings/${weddingId}/guests`).get(),
    ]);

    const nombres = new Map(invitados.docs.map((d) => [d.id, texto(d.data()['fullName'])]));

    const respuestas: RespuestasDeInvitado[] = invitados.docs.map((d) => {
      const g = d.data();
      const trajo = texto(g['invitedById']);
      const cuando = g['rsvpAt'];

      return {
        guestId: d.id,
        nombre: texto(g['fullName']),
        mote: texto(g['nickname']),
        estado: texto(g['rsvpStatus']) || 'pending',
        esAcompanante: g['isCompanion'] === true,
        traidoPor: g['isCompanion'] === true ? (nombres.get(trajo) ?? '') : '',
        cuando: cuando instanceof Timestamp ? cuando.toDate().toISOString() : null,
        respuestas: respuestasGuardadas(g['rsvpAnswers']),
      };
    });

    return {
      // Las preguntas van **todas**, también las apagadas: si la pareja
      // desactiva una después de recibir cien respuestas, esas cien siguen
      // ahí y tienen que poder leerse.
      preguntas: ordenarPreguntas(preguntas),
      invitados: respuestas.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    };
  },
);
