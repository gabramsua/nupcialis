import type { Pregunta, Respuestas } from '../../../core/rsvp/rsvp-gateway';
import { esVisible } from '../../../core/rsvp/visibilidad';
import type { RespuestasDeInvitado } from '../../../core/rsvp/respuestas-gateway';

/**
 * Lo que han contestado, puesto en forma de leerse.
 *
 * Dos formas, porque son dos preguntas distintas:
 *
 * - **Las de opciones** (sí/no, listas, casillas) se cuentan: «vegano, 23» es
 *   lo primero que pregunta el catering, y nadie quiere leer doscientas filas
 *   que dicen «normal».
 * - **Las de texto** se leen una a una, con quién la escribió. Son peticiones
 *   de gente —una canción, una alergia que no cabía en su casilla, un mensaje
 *   para los novios— y alguna importa. Hasta ahora no se veían en ninguna
 *   parte.
 *
 * Solo se cuenta a **quien ha contestado**: incluir a los doscientos pendientes
 * en cada recuento haría que todo pareciera minoritario.
 */

export interface Recuento {
  readonly value: string;
  readonly label: string;
  readonly cuantos: number;
  /**
   * Quiénes han elegido esta opción, por nombre y en orden alfabético.
   *
   * Un número suelto no sirve para hacer nada: «vegano, 23» se convierte en
   * trabajo —avisar al catering, cambiar una mesa— cuando se sabe **quiénes**
   * son esos 23. Viajan los nombres, no los identificadores: esto se pinta,
   * no se enlaza.
   */
  readonly quienes: readonly string[];
}

export interface Escrito {
  readonly guestId: string;
  /** El mote si lo tiene: es como la pareja lo llama. */
  readonly quien: string;
  readonly texto: string;
}

/**
 * Quién tendría que haber contestado esta pregunta y todavía no lo ha hecho.
 *
 * Es lo que evita el fallo gordo: «autobús, 40» parece el total, pero si hay
 * veinte acompañantes que nadie ha apuntado el total real es otro. Entran los
 * titulares y los acompañantes a quienes se les pregunta y que no han dicho que
 * no vienen; quedan fuera los que no ven la pregunta por lo que contestaron
 * antes (el menú de quien no viene).
 */
export interface FaltanPorContestar {
  readonly total: number;
  readonly acompanantes: number;
  /** Nombres, con «(con Fulano)» en los acompañantes. */
  readonly nombres: readonly string[];
}

interface Comun {
  readonly pregunta: Pregunta;
  readonly total: number;
  /** Cuántos de los que contestaron son acompañantes. */
  readonly deAcompanantes: number;
  readonly faltan: FaltanPorContestar;
}

export type ResumenDePregunta =
  | (Comun & { readonly forma: 'recuento'; readonly opciones: readonly Recuento[] })
  | (Comun & { readonly forma: 'escritas'; readonly escritas: readonly Escrito[] });

const DE_OPCIONES = ['boolean', 'select', 'radio', 'checkbox'] as const;

function esDeOpciones(pregunta: Pregunta): boolean {
  return DE_OPCIONES.includes(pregunta.type as (typeof DE_OPCIONES)[number]);
}

function comoNombre(invitado: RespuestasDeInvitado): string {
  const nombre = invitado.mote || invitado.nombre;
  // Un acompañante se distingue de un titular con su mismo nombre.
  return invitado.esAcompanante
    ? invitado.traidoPor
      ? `${nombre} (con ${invitado.traidoPor})`
      : `${nombre} (acompañante)`
    : nombre;
}

function seLePregunta(pregunta: Pregunta, invitado: RespuestasDeInvitado): boolean {
  const target = pregunta.target ?? 'both';
  if (target === 'both') return true;
  return target === (invitado.esAcompanante ? 'companion' : 'guest');
}

/** Las respuestas con la asistencia que marca el estado, como las ve el formulario. */
function conAsistencia(preguntas: readonly Pregunta[], invitado: RespuestasDeInvitado): Respuestas {
  const asistencia = preguntas.find((p) => p.mapsTo === 'rsvpStatus');
  if (!asistencia || invitado.estado === 'pending') return invitado.respuestas;
  return { ...invitado.respuestas, [asistencia.id]: invitado.estado === 'confirmed' };
}

function faltanDe(
  pregunta: Pregunta,
  preguntas: readonly Pregunta[],
  invitados: readonly RespuestasDeInvitado[],
  contesto: (i: RespuestasDeInvitado) => boolean,
): FaltanPorContestar {
  const faltan = invitados.filter(
    (i) =>
      pregunta.enabled !== false &&
      i.estado !== 'declined' &&
      pregunta.mapsTo !== 'rsvpStatus' &&
      seLePregunta(pregunta, i) &&
      !contesto(i) &&
      esVisible(pregunta, preguntas, conAsistencia(preguntas, i)),
  );
  return {
    total: faltan.length,
    acompanantes: faltan.filter((i) => i.esAcompanante).length,
    nombres: faltan.map(comoNombre).sort((a, b) => a.localeCompare(b, 'es')),
  };
}

/** Las opciones de una pregunta, en el orden en que se le enseñan al invitado. */
function opcionesDe(pregunta: Pregunta): readonly { value: string; label: string }[] {
  if (pregunta.type !== 'boolean') return pregunta.options;

  // El sí y el no no son opciones guardadas: son el tipo de la pregunta.
  return [
    { value: 'true', label: 'Sí' },
    { value: 'false', label: 'No' },
  ];
}

function marcadas(valor: unknown): readonly string[] {
  if (Array.isArray(valor)) return valor.map((v) => String(v));
  if (valor === undefined || valor === null || valor === '') return [];
  return [String(valor)];
}

export function resumirPregunta(
  pregunta: Pregunta,
  invitados: readonly RespuestasDeInvitado[],
  preguntas: readonly Pregunta[] = [pregunta],
): ResumenDePregunta {
  const haContestado = (i: RespuestasDeInvitado): boolean => {
    const valor = i.respuestas[pregunta.id];
    return (
      valor !== undefined &&
      valor !== null &&
      valor !== '' &&
      !(Array.isArray(valor) && valor.length === 0)
    );
  };
  const contestadas = invitados.filter(haContestado);
  const comun = {
    pregunta,
    total: contestadas.length,
    deAcompanantes: contestadas.filter((i) => i.esAcompanante).length,
    faltan: faltanDe(pregunta, preguntas, invitados, haContestado),
  };

  if (esDeOpciones(pregunta)) {
    const cuenta = new Map<string, string[]>();
    for (const invitado of contestadas) {
      for (const marca of marcadas(invitado.respuestas[pregunta.id])) {
        const suyos = cuenta.get(marca) ?? [];
        suyos.push(comoNombre(invitado));
        cuenta.set(marca, suyos);
      }
    }

    const quienesDe = (value: string): readonly string[] =>
      [...(cuenta.get(value) ?? [])].sort((a, b) => a.localeCompare(b, 'es'));

    const conocidas = opcionesDe(pregunta).map((o) => ({
      value: o.value,
      label: o.label,
      cuantos: cuenta.get(o.value)?.length ?? 0,
      quienes: quienesDe(o.value),
    }));

    // Lo que no está en la lista de opciones también se enseña: la pareja pudo
    // reetiquetar o quitar una opción después de recibir respuestas, y esas
    // respuestas siguen ahí. Esconderlas descuadraría el total.
    const sueltas = [...cuenta.entries()]
      .filter(([value]) => !conocidas.some((o) => o.value === value))
      .map(([value, quienes]) => ({
        value,
        label: value,
        cuantos: quienes.length,
        quienes: quienesDe(value),
      }));

    return {
      ...comun,
      forma: 'recuento',
      opciones: [...conocidas, ...sueltas],
    };
  }

  return {
    ...comun,
    forma: 'escritas',
    escritas: contestadas.map((invitado) => ({
      guestId: invitado.guestId,
      quien: comoNombre(invitado),
      texto: String(invitado.respuestas[pregunta.id]),
    })),
  };
}

export function resumir(
  preguntas: readonly Pregunta[],
  invitados: readonly RespuestasDeInvitado[],
): readonly ResumenDePregunta[] {
  return preguntas.map((pregunta) => resumirPregunta(pregunta, invitados, preguntas));
}

/**
 * De cuántos invitados hay algo que leer.
 *
 * Es el número que de verdad contesta «¿ha contestado la gente?»: los
 * contadores de la lista dicen cuántos vienen, no cuántos han rellenado el
 * formulario.
 */
export function cuantosHanContestado(invitados: readonly RespuestasDeInvitado[]): number {
  return invitados.filter((i) => i.cuando !== null).length;
}
