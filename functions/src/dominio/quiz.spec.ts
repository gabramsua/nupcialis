import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  MAX_PREGUNTAS_BANCO,
  OPCIONES_POR_PREGUNTA,
  PREGUNTAS_POR_PARTIDA,
  PUNTOS,
  TOPE_RANKING,
  barajar,
  elegirPreguntas,
  nombreEnRanking,
  MAX_NOMBRE_RANKING,
  paraJugar,
  preguntasPorPartida,
  puntuar,
  ranking,
  sanearPreguntas,
  type PreguntaDelPanel,
  type ResultadoQuiz,
} from './quiz';

const MARCA = '// === COPIA LITERAL';

function cuerpo(ruta: string): string {
  const texto = readFileSync(new URL(ruta, import.meta.url), 'utf8');
  const inicio = texto.indexOf(MARCA);
  expect(inicio, `no se encontró "${MARCA}" en ${ruta}`).toBeGreaterThanOrEqual(0);
  return texto.slice(inicio);
}

describe('copia del quiz', () => {
  it('es idéntica a la del cliente', () => {
    expect(cuerpo('./quiz.ts')).toBe(cuerpo('../../../src/app/features/public-site/quiz/quiz.ts'));
  });
});

function pregunta(parcial: Partial<PreguntaDelPanel> & { id: string }): PreguntaDelPanel {
  return {
    text: `¿Pregunta ${parcial.id}?`,
    correctAnswer: 'La buena',
    wrongAnswers: ['Mala 1', 'Mala 2', 'Mala 3'],
    difficulty: 1,
    hint: null,
    enabled: true,
    order: 1,
    ...parcial,
  };
}

/** Un azar fijo: siempre el primero. Deja `barajar` en identidad al revés. */
const SIN_AZAR = () => 0;

describe('sanearPreguntas', () => {
  it('deja pasar una pregunta entera', () => {
    const banco = sanearPreguntas([pregunta({ id: 'a' })]);
    expect(banco).toHaveLength(1);
    expect(banco[0]?.correctAnswer).toBe('La buena');
  });

  /**
   * Media pregunta no se juega: saldría con dos opciones, o con la correcta
   * repetida como señuelo, y el invitado se quedaría mirándola.
   */
  it.each([
    ['sin enunciado', { text: '' }],
    ['sin respuesta correcta', { correctAnswer: '' }],
    ['con dos señuelos en vez de tres', { wrongAnswers: ['Mala 1', 'Mala 2'] }],
    ['con cuatro señuelos', { wrongAnswers: ['M1', 'M2', 'M3', 'M4'] }],
    ['con un señuelo vacío', { wrongAnswers: ['Mala 1', '', 'Mala 3'] }],
    ['con la correcta repetida como señuelo', { wrongAnswers: ['La buena', 'Mala 2', 'Mala 3'] }],
    ['con dos señuelos iguales', { wrongAnswers: ['Mala 1', 'Mala 1', 'Mala 3'] }],
  ])('se cae una pregunta %s', (_que, parcial) => {
    expect(sanearPreguntas([pregunta({ id: 'a', ...parcial })])).toEqual([]);
  });

  it('se cae la apagada y la repetida', () => {
    const banco = sanearPreguntas([
      pregunta({ id: 'a' }),
      pregunta({ id: 'a' }),
      pregunta({ id: 'b', enabled: false }),
    ]);

    expect(banco.map((p) => p.id)).toEqual(['a']);
  });

  it('ordena por el orden de la pareja', () => {
    const banco = sanearPreguntas([
      pregunta({ id: 'tercera', order: 3 }),
      pregunta({ id: 'primera', order: 1 }),
      pregunta({ id: 'segunda', order: 2 }),
    ]);

    expect(banco.map((p) => p.id)).toEqual(['primera', 'segunda', 'tercera']);
  });

  it('corta por el tope del banco', () => {
    const muchas = Array.from({ length: MAX_PREGUNTAS_BANCO + 20 }, (_, n) =>
      pregunta({ id: `p${n}` }),
    );
    expect(sanearPreguntas(muchas)).toHaveLength(MAX_PREGUNTAS_BANCO);
  });

  it('sobrevive a cualquier cosa', () => {
    for (const valor of [undefined, null, 'texto', 42, {}]) {
      expect(sanearPreguntas(valor)).toEqual([]);
    }
    expect(sanearPreguntas([null, 42, 'x', {}])).toEqual([]);
  });
});

describe('la partida', () => {
  it('coge las que pide la configuración', () => {
    const banco = Array.from({ length: 30 }, (_, n) => pregunta({ id: `p${n}` }));
    expect(elegirPreguntas(banco, 10, SIN_AZAR)).toHaveLength(10);
  });

  /** Mejor una partida corta que un error en mitad del banquete. */
  it('con un banco más pequeño que la partida, juega las que haya', () => {
    const banco = [pregunta({ id: 'a' }), pregunta({ id: 'b' })];
    expect(elegirPreguntas(banco, 10, SIN_AZAR)).toHaveLength(2);
  });

  it('el número por partida se queda entre lo razonable', () => {
    expect(preguntasPorPartida(undefined)).toBe(PREGUNTAS_POR_PARTIDA);
    expect(preguntasPorPartida('diez')).toBe(PREGUNTAS_POR_PARTIDA);
    expect(preguntasPorPartida(0)).toBe(3);
    expect(preguntasPorPartida(1000)).toBe(30);
    expect(preguntasPorPartida(12)).toBe(12);
  });

  /** La regla de oro 4, escrita como test. */
  it('lo que viaja al invitado no lleva la respuesta correcta', () => {
    const deJuego = paraJugar(pregunta({ id: 'a', difficulty: 3, hint: 'Una pista' }), SIN_AZAR);

    expect(Object.keys(deJuego)).not.toContain('correctAnswer');
    expect(JSON.stringify(deJuego)).not.toContain('correctAnswer');
    expect(deJuego.opciones).toHaveLength(OPCIONES_POR_PREGUNTA);
    expect(deJuego.opciones).toContain('La buena');
    expect(deJuego.puntos).toBe(PUNTOS[3]);
    expect(deJuego.hint).toBe('Una pista');
  });

  it('baraja sin perder ni repetir nada', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    let n = 0;
    const barajado = barajar(items, () => (n += 0.37) % 1);

    expect([...barajado].sort((a, b) => a - b)).toEqual(items);
    expect(items).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});

describe('puntuar', () => {
  const banco = [
    pregunta({ id: 'facil', difficulty: 1 }),
    pregunta({ id: 'media', difficulty: 2 }),
    pregunta({ id: 'dificil', difficulty: 3 }),
  ];

  it('suma lo que vale cada dificultad', () => {
    const puntos = puntuar(banco, { facil: 'La buena', media: 'La buena', dificil: 'La buena' });
    expect(puntos).toEqual({ points: 60, aciertos: 3, answeredCount: 3 });
  });

  it('lo fallado cuenta como contestado y no suma', () => {
    const puntos = puntuar(banco, { facil: 'La buena', media: 'Mala 1' });
    expect(puntos).toEqual({ points: 10, aciertos: 1, answeredCount: 2 });
  });

  /** No restar es lo que hace que se arriesgue, y arriesgar es el juego. */
  it('lo que no se contesta no resta', () => {
    expect(puntuar(banco, {}).points).toBe(0);
    expect(puntuar(banco, {}).answeredCount).toBe(0);
  });

  it('no se cuela una respuesta que no es una opción', () => {
    const puntos = puntuar(banco, { facil: { trampa: true }, media: 42, dificil: null });
    expect(puntos).toEqual({ points: 0, aciertos: 0, answeredCount: 0 });
  });

  it('una respuesta a una pregunta que no se jugó no cuenta', () => {
    expect(puntuar(banco, { deOtraPartida: 'La buena' }).points).toBe(0);
  });
});

function resultado(parcial: Partial<ResultadoQuiz> & { id: string }): ResultadoQuiz {
  return {
    guestId: parcial.id,
    displayName: 'Alguien',
    points: 100,
    elapsedMs: 60_000,
    ...parcial,
  };
}

describe('ranking', () => {
  it('ordena por puntos y desempata por tiempo', () => {
    const puestos = ranking([
      resultado({ id: 'lento', points: 100, elapsedMs: 90_000 }),
      resultado({ id: 'rapido', points: 100, elapsedMs: 40_000 }),
      resultado({ id: 'mejor', points: 120, elapsedMs: 120_000 }),
    ]);

    expect(puestos.map((p) => p.id)).toEqual(['mejor', 'rapido', 'lento']);
    expect(puestos.map((p) => p.puesto)).toEqual([1, 2, 3]);
  });

  /**
   * Se puede repetir sin límite (`D-11`), así que sin esto el ranking lo
   * llenaría quien más veces juega, que no es quien mejor lo hace.
   */
  it('solo la mejor partida de cada invitado', () => {
    const puestos = ranking([
      resultado({ id: 'a1', guestId: 'pepe', points: 60 }),
      resultado({ id: 'a2', guestId: 'pepe', points: 120 }),
      resultado({ id: 'a3', guestId: 'pepe', points: 90 }),
      resultado({ id: 'b1', guestId: 'ana', points: 100 }),
    ]);

    expect(puestos).toHaveLength(2);
    expect(puestos[0]?.guestId).toBe('pepe');
    expect(puestos[0]?.points).toBe(120);
  });

  it('a igualdad de puntos, la partida más rápida es la que queda', () => {
    const puestos = ranking([
      resultado({ id: 'a1', guestId: 'pepe', points: 100, elapsedMs: 90_000 }),
      resultado({ id: 'a2', guestId: 'pepe', points: 100, elapsedMs: 30_000 }),
    ]);

    expect(puestos[0]?.elapsedMs).toBe(30_000);
  });

  it('dos empatados de verdad comparten puesto', () => {
    const puestos = ranking([
      resultado({ id: 'a', guestId: 'a', points: 100, elapsedMs: 50_000 }),
      resultado({ id: 'b', guestId: 'b', points: 100, elapsedMs: 50_000 }),
      resultado({ id: 'c', guestId: 'c', points: 80, elapsedMs: 10_000 }),
    ]);

    expect(puestos.map((p) => p.puesto)).toEqual([1, 1, 3]);
  });

  it('corta por el tope, que son veinte', () => {
    const muchos = Array.from({ length: 50 }, (_, n) =>
      resultado({ id: `r${n}`, guestId: `g${n}`, points: n }),
    );

    expect(ranking(muchos)).toHaveLength(TOPE_RANKING);
    expect(TOPE_RANKING).toBe(20);
  });

  it('sin partidas, ranking vacío', () => {
    expect(ranking([])).toEqual([]);
  });
});

/**
 * `D-11`: el nombre completo, nunca los cuatro dígitos del teléfono.
 *
 * Esos cuatro dígitos son la mitad de la credencial del modo B (regla de oro
 * 3), y el ranking lo ve toda la boda. El nombre entero desambigua igual de
 * bien y no es ningún secreto para los invitados de esa boda.
 */
describe('el nombre del ranking', () => {
  it('es el nombre completo, tal como lo escribió la pareja', () => {
    expect(nombreEnRanking('Pepe García')).toBe('Pepe García');
    expect(nombreEnRanking('María José Ruiz Pérez')).toBe('María José Ruiz Pérez');
  });

  it('limpia los espacios de más', () => {
    expect(nombreEnRanking('  Pepe   García  ')).toBe('Pepe García');
  });

  it('sin nombre, no deja el hueco en blanco', () => {
    expect(nombreEnRanking('')).toBe('Invitado');
    expect(nombreEnRanking('   ')).toBe('Invitado');
  });

  /** Lo que de verdad no puede pasar nunca. */
  it('nunca saca dígitos del teléfono', () => {
    expect(nombreEnRanking('Pepe García')).not.toMatch(/\d/);
    expect(nombreEnRanking('Pepe García *****3663')).not.toMatch(/3663/);
  });

  it('corta un nombre larguísimo para que no rompa la fila', () => {
    const largo = nombreEnRanking('A'.repeat(200));
    expect(largo.length).toBe(MAX_NOMBRE_RANKING);
  });
});
