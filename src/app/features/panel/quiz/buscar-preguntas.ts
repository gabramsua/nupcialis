import type { PreguntaDelPanel } from '../../../core/quiz/quiz-admin-gateway';

/**
 * Filtra el banco por lo que la pareja escribe en el buscador.
 *
 * Mira el enunciado, **la correcta, las falsas y la pista**: con doscientas
 * preguntas, lo que se recuerda es «la del bar de Lavapiés», que es una
 * respuesta y no el principio del enunciado. Ignora acentos y mayúsculas, y
 * exige que estén todas las palabras (no necesariamente juntas).
 */
export function buscarPreguntas(
  preguntas: readonly PreguntaDelPanel[],
  texto: string,
): readonly PreguntaDelPanel[] {
  const palabras = limpiar(texto).split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return preguntas;

  return preguntas.filter((pregunta) => {
    const pajar = limpiar(
      [pregunta.text, pregunta.correctAnswer, ...pregunta.wrongAnswers, pregunta.hint ?? ''].join(
        ' ',
      ),
    );
    return palabras.every((palabra) => pajar.includes(palabra));
  });
}

function limpiar(valor: string): string {
  return valor.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}
