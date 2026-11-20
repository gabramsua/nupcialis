import type { Pregunta } from '../../../core/rsvp/rsvp-gateway';
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

export type ResumenDePregunta =
  | {
      readonly pregunta: Pregunta;
      readonly forma: 'recuento';
      readonly total: number;
      readonly opciones: readonly Recuento[];
    }
  | {
      readonly pregunta: Pregunta;
      readonly forma: 'escritas';
      readonly total: number;
      readonly escritas: readonly Escrito[];
    };

const DE_OPCIONES = ['boolean', 'select', 'radio', 'checkbox'] as const;

function esDeOpciones(pregunta: Pregunta): boolean {
  return DE_OPCIONES.includes(pregunta.type as (typeof DE_OPCIONES)[number]);
}

function comoNombre(invitado: RespuestasDeInvitado): string {
  return invitado.mote || invitado.nombre;
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
): ResumenDePregunta {
  const contestadas = invitados.filter((i) => {
    const valor = i.respuestas[pregunta.id];
    return (
      valor !== undefined &&
      valor !== null &&
      valor !== '' &&
      !(Array.isArray(valor) && valor.length === 0)
    );
  });

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
      pregunta,
      forma: 'recuento',
      total: contestadas.length,
      opciones: [...conocidas, ...sueltas],
    };
  }

  return {
    pregunta,
    forma: 'escritas',
    total: contestadas.length,
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
  return preguntas.map((pregunta) => resumirPregunta(pregunta, invitados));
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
