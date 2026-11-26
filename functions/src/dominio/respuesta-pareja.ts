/**
 * Lo que la pareja contesta **por** un invitado.
 *
 * Hay gente mayor que no se mete en la web, gente que no contesta aunque se le
 * insista, gente que lo dice por WhatsApp o por teléfono. Los novios tienen que
 * poder fijar su asistencia y lo demás a mano, y que eso quede igual de bien
 * guardado que si lo hubiera contestado el invitado: el contador de confirmados,
 * las mesas y el catering salen de ahí.
 *
 * Dos usos, distintos a propósito:
 *
 * - **Solo el estado** («viene», «no viene», «vuelve a pendiente»). Es lo del
 *   teléfono. No toca el resto de respuestas: quien dice que no viene no pierde
 *   por eso el mensaje que dejó para los novios.
 * - **Las respuestas** del formulario. Se validan como las del invitado, con una
 *   diferencia: no hace falta rellenar las obligatorias, porque la pareja pone lo
 *   que sabe. El resto —tipos, opciones, largos, visibilidad condicional— es
 *   idéntico, y quien manda sigue siendo el servidor.
 */

import {
  camposDelInvitado,
  preguntasPara,
  validarRespuestas,
  type CamposDelInvitado,
  type EstadoRsvp,
  type FalloRespuesta,
  type Pregunta,
  type Respuestas,
} from './formulario';

export interface EntradaDeLaPareja {
  /** `null`: no se toca el estado salvo que lo diga una respuesta. */
  readonly estado: EstadoRsvp | null;
  /** `null`: no se tocan las respuestas, solo el estado. */
  readonly respuestas: Respuestas | null;
}

export interface LoActual {
  readonly estado: EstadoRsvp;
  readonly respuestas: Respuestas;
}

export type Preparado =
  | {
      readonly ok: true;
      readonly respuestas: Respuestas;
      readonly campos: CamposDelInvitado;
      readonly estado: EstadoRsvp;
    }
  | { readonly ok: false; readonly fallos: readonly FalloRespuesta[] };

/** La pregunta de «¿vendrás?»: la que alimenta `rsvpStatus`. */
function preguntaDeAsistencia(suyas: readonly Pregunta[]): Pregunta | undefined {
  return suyas.find((p) => p.mapsTo === 'rsvpStatus' && p.type === 'boolean');
}

export function prepararRespuestaDeLaPareja(
  preguntas: readonly Pregunta[],
  esAcompanante: boolean,
  entrada: EntradaDeLaPareja,
  actual: LoActual,
): Preparado {
  const suyas = preguntasPara(preguntas, esAcompanante);
  const asistencia = preguntaDeAsistencia(suyas);

  /** La respuesta a «¿vendrás?» que corresponde al estado elegido. */
  const conAsistencia = (base: Respuestas): Respuestas => {
    if (entrada.estado === null || !asistencia) return base;

    const resto = Object.fromEntries(Object.entries(base).filter(([id]) => id !== asistencia.id));
    return entrada.estado === 'pending'
      ? resto
      : { ...resto, [asistencia.id]: entrada.estado === 'confirmed' };
  };

  // Solo el estado: se cambia eso y nada más. Validar aquí de nuevo las
  // respuestas de antes borraría lo que contestó a preguntas que la pareja ha
  // apagado después, y no es lo que se le ha pedido.
  if (entrada.respuestas === null) {
    return {
      ok: true,
      respuestas: conAsistencia(actual.respuestas),
      campos: {},
      estado: entrada.estado ?? actual.estado,
    };
  }

  const validacion = validarRespuestas(
    preguntas,
    conAsistencia(entrada.respuestas),
    esAcompanante,
    false,
  );
  if (!validacion.ok) return { ok: false, fallos: validacion.fallos };

  const campos = camposDelInvitado(suyas, validacion.respuestas);

  return {
    ok: true,
    respuestas: validacion.respuestas,
    campos,
    // Lo que elige la pareja manda; si no elige, lo que diga la respuesta de
    // asistencia; y si tampoco hay, se queda como estaba.
    estado: entrada.estado ?? campos.rsvpStatus ?? actual.estado,
  };
}
