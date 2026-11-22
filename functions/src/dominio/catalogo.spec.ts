import { describe, expect, it } from 'vitest';

import {
  PARTIDAS_DE_FABRICA,
  PREGUNTAS_DE_FABRICA,
  TAREAS_DE_FABRICA,
  deFabrica,
  esTipoCatalogo,
  partidasVolcables,
  tareasVolcables,
  validarElemento,
  validarPartida,
  validarPreguntaSugerida,
  validarTarea,
} from './catalogo';

const TAREA = {
  title: 'Reservar la finca',
  category: 'Lugar',
  mesesAntes: 12,
  icon: 'tent',
  priority: 'high',
  order: 1,
};

describe('catálogo de tareas', () => {
  it('acepta una tarea y la normaliza', () => {
    const r = validarTarea({ ...TAREA, title: '  Reservar   la finca ' });
    expect(r).toEqual({ ok: true, datos: { ...TAREA, title: 'Reservar la finca', enabled: true } });
  });

  it('admite medios meses y nada más fino', () => {
    expect(validarTarea({ ...TAREA, mesesAntes: 0.5 }).ok).toBe(true);
    expect(validarTarea({ ...TAREA, mesesAntes: 0 }).ok).toBe(true);
    expect(validarTarea({ ...TAREA, mesesAntes: 0.3 })).toEqual({ ok: false, motivo: 'meses' });
    expect(validarTarea({ ...TAREA, mesesAntes: -1 })).toEqual({ ok: false, motivo: 'meses' });
    expect(validarTarea({ ...TAREA, mesesAntes: 99 })).toEqual({ ok: false, motivo: 'meses' });
    expect(validarTarea({ ...TAREA, mesesAntes: '12' })).toEqual({ ok: false, motivo: 'meses' });
  });

  it('exige título y categoría, y una prioridad que exista', () => {
    expect(validarTarea({ ...TAREA, title: ' ' })).toEqual({ ok: false, motivo: 'titulo' });
    expect(validarTarea({ ...TAREA, category: '' })).toEqual({ ok: false, motivo: 'categoria' });
    expect(validarTarea({ ...TAREA, priority: 'urgente' })).toEqual({
      ok: false,
      motivo: 'prioridad',
    });
    expect(validarTarea({ ...TAREA, icon: 'Mal Icono!' })).toEqual({ ok: false, motivo: 'icono' });
    expect(validarTarea(null)).toEqual({ ok: false, motivo: 'formato' });
  });

  it('solo se vuelcan las encendidas, en orden, y lo roto se descarta', () => {
    const lista = tareasVolcables([
      { ...TAREA, title: 'B', order: 2 },
      { ...TAREA, title: 'A', order: 1 },
      { ...TAREA, title: 'Apagada', enabled: false },
      { title: 'Rota' },
      'basura',
    ]);
    expect(lista.map((t) => t.title)).toEqual(['A', 'B']);
  });

  it('los de fábrica son válidos y son los de siempre', () => {
    expect(TAREAS_DE_FABRICA.length).toBeGreaterThan(5);
    expect(TAREAS_DE_FABRICA.every((t) => validarTarea(t).ok)).toBe(true);
    expect(TAREAS_DE_FABRICA[0]?.title).toBe('Reservar la finca');
  });
});

describe('catálogo de presupuesto', () => {
  const PARTIDA = { category: 'Lugar', concept: 'Finca', estimatedCents: 500000, order: 1 };

  it('acepta una partida y el importe va en céntimos enteros', () => {
    expect(validarPartida(PARTIDA).ok).toBe(true);
    expect(validarPartida({ ...PARTIDA, estimatedCents: 12.5 })).toEqual({
      ok: false,
      motivo: 'importe',
    });
    expect(validarPartida({ ...PARTIDA, estimatedCents: -1 })).toEqual({
      ok: false,
      motivo: 'importe',
    });
    expect(validarPartida({ ...PARTIDA, estimatedCents: 10 ** 9 })).toEqual({
      ok: false,
      motivo: 'importe',
    });
  });

  it('sin importe es «sin estimar» (0)', () => {
    const r = validarPartida({ category: 'Otros', concept: 'Imprevistos' });
    expect(r.ok && r.datos.estimatedCents).toBe(0);
  });

  it('exige categoría y concepto', () => {
    expect(validarPartida({ ...PARTIDA, concept: '' })).toEqual({ ok: false, motivo: 'concepto' });
    expect(validarPartida({ ...PARTIDA, category: '' })).toEqual({
      ok: false,
      motivo: 'categoria',
    });
  });

  it('solo vuelca las encendidas, en orden', () => {
    const lista = partidasVolcables([
      { ...PARTIDA, concept: 'B', order: 2 },
      { ...PARTIDA, concept: 'A', order: 1 },
      { ...PARTIDA, concept: 'Apagada', enabled: false },
    ]);
    expect(lista.map((p) => p.concept)).toEqual(['A', 'B']);
  });

  it('los de fábrica son válidos', () => {
    expect(PARTIDAS_DE_FABRICA.every((p) => validarPartida(p).ok)).toBe(true);
  });
});

describe('catálogo de preguntas del quiz', () => {
  const PREGUNTA = {
    text: '¿Dónde nos conocimos?',
    correctAnswer: 'Madrid',
    wrongAnswers: ['Sevilla', 'Bilbao', 'Cádiz'],
    difficulty: 2,
  };

  it('acepta una pregunta entera', () => {
    const r = validarPreguntaSugerida(PREGUNTA);
    expect(r.ok && r.datos.difficulty).toBe(2);
  });

  it('una sugerencia a medias no vale', () => {
    expect(validarPreguntaSugerida({ ...PREGUNTA, wrongAnswers: ['a', 'b'] })).toEqual({
      ok: false,
      motivo: 'pregunta',
    });
    expect(validarPreguntaSugerida({ ...PREGUNTA, correctAnswer: 'Sevilla' }).ok).toBe(false);
    expect(validarPreguntaSugerida({ ...PREGUNTA, text: '' }).ok).toBe(false);
    expect(validarPreguntaSugerida({ ...PREGUNTA, difficulty: 7 }).ok).toBe(false);
  });

  it('las de fábrica son válidas y completas', () => {
    expect(PREGUNTAS_DE_FABRICA.length).toBeGreaterThanOrEqual(5);
    expect(PREGUNTAS_DE_FABRICA.every((q) => validarPreguntaSugerida(q).ok)).toBe(true);
  });
});

describe('tipos de catálogo', () => {
  it('reconoce solo los tres', () => {
    expect(esTipoCatalogo('tasks')).toBe(true);
    expect(esTipoCatalogo('budget')).toBe(true);
    expect(esTipoCatalogo('quiz')).toBe(true);
    expect(esTipoCatalogo('weddings')).toBe(false);
    expect(esTipoCatalogo(undefined)).toBe(false);
  });

  it('validarElemento despacha por tipo y deFabrica devuelve algo para cada uno', () => {
    expect(validarElemento('tasks', TAREA).ok).toBe(true);
    expect(validarElemento('budget', TAREA).ok).toBe(false);
    for (const tipo of ['tasks', 'budget', 'quiz'] as const) {
      expect(deFabrica(tipo).length).toBeGreaterThan(0);
      expect(deFabrica(tipo).every((e) => validarElemento(tipo, e).ok)).toBe(true);
    }
  });
});
