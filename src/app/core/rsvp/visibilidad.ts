import type { Pregunta, Respuestas } from './rsvp-gateway';

/**
 * Qué preguntas se enseñan ahora mismo, en el navegador.
 *
 * **Esto es una copia de la regla del servidor** (`functions/src/dominio/formulario.ts`).
 * La copia es deliberada: el formulario tiene que esconder el menú en el mismo
 * instante en que alguien marca que no va, sin un viaje a Europa de por medio, y
 * el servidor tiene que decidir lo mismo sin creerse nada de lo que llega del
 * navegador. No hay forma de compartir el código: son dos paquetes distintos y
 * el cliente no puede importar de `functions/`.
 *
 * Lo que sí hay es una prueba que ejecuta las dos implementaciones sobre la
 * misma tabla de casos (`visibilidad.spec.ts`), y que falla si se separan. Si
 * cambias una regla aquí, cambia la otra.
 *
 * Quien manda sigue siendo el servidor: si llegaran a divergir, lo que el
 * navegador enseñe de más se rechaza al enviar, con el fallo señalado en su
 * pregunta.
 */
export function esVisible(
  pregunta: Pregunta,
  preguntas: readonly Pregunta[],
  respuestas: Respuestas,
): boolean {
  const porId = new Map(preguntas.map((p) => [p.id, p]));
  const vistas = new Set<string>();
  let actual: Pregunta | undefined = pregunta;

  while (actual) {
    if (vistas.has(actual.id)) return false;
    vistas.add(actual.id);

    const condicion = actual.visibleIf;
    if (!condicion) return true;

    const padre = porId.get(condicion.questionId);
    if (!padre) return false;
    if (!iguales(respuestas[condicion.questionId], condicion.equals)) return false;

    actual = padre;
  }

  return true;
}

export function visibles(
  preguntas: readonly Pregunta[],
  respuestas: Respuestas,
): readonly Pregunta[] {
  return preguntas.filter((p) => esVisible(p, preguntas, respuestas));
}

function iguales(respuesta: unknown, esperado: unknown): boolean {
  if (respuesta === esperado) return true;
  if (typeof esperado === 'boolean') return booleano(respuesta) === esperado;
  if (Array.isArray(respuesta)) return respuesta.some((v) => iguales(v, esperado));
  if (respuesta === null || respuesta === undefined || esperado === null) return false;
  return String(respuesta) === String(esperado);
}

export function booleano(valor: unknown): boolean | null {
  if (typeof valor === 'boolean') return valor;
  if (valor === 'true' || valor === 'si' || valor === 'sí') return true;
  if (valor === 'false' || valor === 'no') return false;
  return null;
}
