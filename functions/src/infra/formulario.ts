/**
 * Leer las preguntas del formulario de Firestore.
 *
 * Vive aquí porque lo necesitan dos funciones —la del invitado y la de la
 * pareja— y porque importar un fichero de función desde otro arrastra sus
 * `onCall` y los despliega juntos sin que nadie lo haya pedido.
 */

import { aPregunta, type Pregunta } from '../dominio/formulario';
import { db } from '../firebase';

export async function leerPreguntas(weddingId: string): Promise<readonly Pregunta[]> {
  const snap = await db().collection(`weddings/${weddingId}/formQuestions`).get();
  return snap.docs.map((d) => aPregunta(d.id, d.data()));
}

/** Por `order`, y el id decide los empates para que dos preguntas no bailen. */
export function ordenarPreguntas(preguntas: readonly Pregunta[]): readonly Pregunta[] {
  return preguntas.slice().sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}
