import { describe, expect, it } from 'vitest';

import type { PreguntaDelPanel } from '../../../core/quiz/quiz-admin-gateway';
import { buscarPreguntas } from './buscar-preguntas';

function pregunta(parcial: Partial<PreguntaDelPanel>): PreguntaDelPanel {
  return {
    id: 'p1',
    text: '¿Dónde nos conocimos?',
    correctAnswer: 'En un bar de Lavapiés',
    wrongAnswers: ['En la universidad', 'En un tren', 'En una boda'],
    difficulty: 1,
    hint: null,
    enabled: true,
    order: 1,
    ...parcial,
  };
}

describe('buscarPreguntas', () => {
  const lista = [
    pregunta({ id: 'a' }),
    pregunta({
      id: 'b',
      text: '¿Quién dijo «te quiero» primero?',
      correctAnswer: 'Él',
      wrongAnswers: ['Ella', 'Los dos a la vez', 'Nadie'],
      hint: 'Fue en Cádiz',
    }),
  ];

  it('sin texto, todas', () => {
    expect(buscarPreguntas(lista, '   ')).toHaveLength(2);
  });

  it('busca en el enunciado', () => {
    expect(buscarPreguntas(lista, 'quiero').map((p) => p.id)).toEqual(['b']);
  });

  it('busca en la correcta, en las falsas y en la pista', () => {
    expect(buscarPreguntas(lista, 'lavapies').map((p) => p.id)).toEqual(['a']);
    expect(buscarPreguntas(lista, 'universidad').map((p) => p.id)).toEqual(['a']);
    expect(buscarPreguntas(lista, 'cadiz').map((p) => p.id)).toEqual(['b']);
  });

  it('ignora acentos y mayúsculas', () => {
    expect(buscarPreguntas(lista, 'CÁDIZ')).toHaveLength(1);
    expect(buscarPreguntas(lista, 'donde')).toHaveLength(1);
  });

  it('exige todas las palabras, juntas o no', () => {
    expect(buscarPreguntas(lista, 'bar conocimos')).toHaveLength(1);
    expect(buscarPreguntas(lista, 'bar cadiz')).toHaveLength(0);
  });
});
