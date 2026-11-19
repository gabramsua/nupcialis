import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';

import { provideIconSprite } from '../../../design-system/icons/icon-sprite.providers';
import { SessionStore } from '../../../core/auth/session.store';
import {
  PUERTA_PREGUNTAS_QUIZ,
  PUERTA_RANKING_QUIZ,
  type DatosPregunta,
  type JugadorDelQuiz,
  type PreguntaDelPanel,
  type PuertaPreguntasQuiz,
  type PuertaRankingQuiz,
} from '../../../core/quiz/quiz-admin-gateway';
import { abrirDialogosEnPruebas } from '../invitados/dobles.testing';
import { PanelPreguntasQuiz } from './preguntas-quiz';
import { PreguntasQuizStore } from './preguntas-quiz.store';
import { PanelRankingQuiz } from './ranking-quiz';
import { RankingQuizStore } from './ranking-quiz.store';

/**
 * El quiz en el panel de la pareja.
 *
 * Lo que se vigila, por orden de lo que costaría si se rompe:
 *
 * 1. **Que avise cuando no hay preguntas suficientes para jugar.** Es el fallo
 *    que se descubre el día de la boda: el invitado toca «Jugar» y se
 *    encuentra un mensaje. El servidor solo pregunta las que están enteras y
 *    encendidas, y eso no se ve contando fichas.
 * 2. **Que el teléfono salga aquí y solo aquí** (`D-11`). Esta pantalla es de
 *    la pareja; el ranking de la web no lo lleva ni recortado.
 * 3. **Que quien no ha jugado siga en la lista**, porque la pregunta de la
 *    pareja durante el banquete es a quién hay que ir a buscar.
 */

beforeAll(abrirDialogosEnPruebas);

const ES = JSON.parse(readFileSync('public/i18n/es.json', 'utf8')) as Record<string, unknown>;

function pregunta(parcial: Partial<PreguntaDelPanel> & { id: string }): PreguntaDelPanel {
  return {
    text: `Pregunta ${parcial.id}`,
    correctAnswer: 'La buena',
    wrongAnswers: ['Una', 'Otra', 'La tercera'],
    difficulty: 1,
    hint: null,
    enabled: true,
    order: 1,
    ...parcial,
  };
}

function montarPreguntas(preguntas: readonly PreguntaDelPanel[]) {
  const guardadas: DatosPregunta[] = [];

  const doble: PuertaPreguntasQuiz = {
    async listar() {
      return { ok: true, preguntas };
    },
    async guardar(_weddingId, datos) {
      guardadas.push(datos);
      return { ok: true };
    },
    async borrar() {
      return { ok: true };
    },
  };

  TestBed.configureTestingModule({
    imports: [
      TranslocoTestingModule.forRoot({
        langs: { es: ES },
        translocoConfig: { availableLangs: ['es'], defaultLang: 'es' },
      }),
    ],
    providers: [
      provideIconSprite('panel'),
      provideRouter([]),
      { provide: PUERTA_PREGUNTAS_QUIZ, useValue: doble },
      { provide: SessionStore, useValue: { weddingId: () => 'w1' } },
      PreguntasQuizStore,
    ],
  });

  const fixture = TestBed.createComponent(PanelPreguntasQuiz);
  fixture.detectChanges();

  return esperar(fixture, guardadas);
}

function montarRanking(jugadores: readonly JugadorDelQuiz[]) {
  const vaciados: number[] = [];

  const doble: PuertaRankingQuiz = {
    async jugadores() {
      return { ok: true, jugadores };
    },
    async vaciar() {
      vaciados.push(1);
      return { ok: true, borradas: jugadores.length };
    },
  };

  TestBed.configureTestingModule({
    imports: [
      TranslocoTestingModule.forRoot({
        langs: { es: ES },
        translocoConfig: { availableLangs: ['es'], defaultLang: 'es' },
      }),
    ],
    providers: [
      provideIconSprite('panel'),
      provideRouter([]),
      { provide: PUERTA_RANKING_QUIZ, useValue: doble },
      RankingQuizStore,
    ],
  });

  const fixture = TestBed.createComponent(PanelRankingQuiz);
  fixture.detectChanges();

  return esperar(fixture, vaciados);
}

function esperar<T>(
  fixture: { detectChanges(): void; nativeElement: HTMLElement },
  escrituras: T[],
) {
  const raiz = fixture.nativeElement;

  const asentar = async () => {
    await new Promise((listo) => setTimeout(listo, 0));
    fixture.detectChanges();
  };

  return {
    fixture,
    raiz,
    escrituras,
    asentar,
    texto: () => raiz.textContent?.replace(/\s+/g, ' ') ?? '',
    boton(texto: string) {
      return [...raiz.querySelectorAll('button')].find((b) =>
        b.textContent?.includes(texto),
      ) as HTMLButtonElement;
    },
    async pulsar(boton: HTMLButtonElement) {
      boton.click();
      await asentar();
    },
  };
}

describe('el banco de preguntas', () => {
  it('cuenta cuántas se pueden jugar, que no es cuántas hay', async () => {
    const p = montarPreguntas([
      pregunta({ id: 'a' }),
      pregunta({ id: 'b', correctAnswer: '' }),
      pregunta({ id: 'c', wrongAnswers: ['Una', '', ''] }),
    ]);
    await p.asentar();

    expect(p.texto()).toContain('1 de 3 preguntas listas para jugar');
  });

  /** El fallo que se descubre el día de la boda si no se avisa antes. */
  it('avisa cuando no llegan para una partida', async () => {
    const p = montarPreguntas([pregunta({ id: 'a' }), pregunta({ id: 'b' })]);
    await p.asentar();

    expect(p.texto()).toContain('no se puede jugar');
    expect(p.texto()).toContain('al menos 3');
  });

  it('señala las que están a medio escribir', async () => {
    const p = montarPreguntas([
      pregunta({ id: 'a' }),
      pregunta({ id: 'b' }),
      pregunta({ id: 'c' }),
      pregunta({ id: 'd', wrongAnswers: ['Una', '', ''] }),
    ]);
    await p.asentar();

    expect(p.texto()).toContain('Hay 1 a medio escribir');
    expect(p.texto()).toContain('A medio escribir');
  });

  it('con el banco bien, no saca ningún aviso', async () => {
    const p = montarPreguntas([
      pregunta({ id: 'a' }),
      pregunta({ id: 'b' }),
      pregunta({ id: 'c' }),
    ]);
    await p.asentar();

    expect(p.texto()).not.toContain('Repasad esto');
  });

  /** En esta pantalla la correcta no es un secreto: es lo que hay que revisar. */
  it('enseña la respuesta correcta junto a las falsas', async () => {
    const p = montarPreguntas([pregunta({ id: 'a', correctAnswer: 'En una boda' })]);
    await p.asentar();

    expect(p.raiz.querySelector('.qp__buena')?.textContent).toContain('En una boda');
    expect(p.texto()).toContain('La tercera');
  });

  /** Editar es lo que importa del banco, y lo que había en el prototipo. */
  it('editar una pregunta conserva su dificultad y su orden', async () => {
    const p = montarPreguntas([pregunta({ id: 'a', difficulty: 3, order: 4 })]);
    await p.asentar();
    await p.pulsar(p.boton('Editar'));
    await p.pulsar(p.boton('Guardar'));

    expect(p.escrituras).toEqual([expect.objectContaining({ id: 'a', difficulty: 3, order: 4 })]);
  });

  it('duplicar abre una nueva con lo de la otra dentro', async () => {
    const p = montarPreguntas([pregunta({ id: 'a', text: '¿Dónde nos conocimos?' })]);
    await p.asentar();
    await p.pulsar(p.boton('Duplicar'));

    const campo = p.raiz.querySelector('textarea') as HTMLTextAreaElement;
    expect(campo.value).toBe('¿Dónde nos conocimos?');

    await p.pulsar(p.boton('Guardar'));
    expect(p.escrituras[0]).toEqual(
      expect.objectContaining({ id: undefined, text: '¿Dónde nos conocimos?' }),
    );
  });
});

describe('quién ha jugado', () => {
  const jugadores: readonly JugadorDelQuiz[] = [
    {
      guestId: 'g1',
      nombre: 'Ana Ruiz',
      telefono: '+34600111222',
      partidas: 3,
      puntos: 120,
      puesto: 1,
    },
    {
      guestId: 'g2',
      nombre: 'Pepe García',
      telefono: '+34600333444',
      partidas: 1,
      puntos: 90,
      puesto: 2,
    },
  ];

  /** `D-11`: aquí sí, porque esta pantalla es de la pareja. */
  it('enseña el teléfono al lado del nombre', async () => {
    const p = montarRanking(jugadores);
    await p.asentar();

    expect(p.texto()).toContain('Ana Ruiz');
    expect(p.texto()).toContain('+34600111222');
  });

  /**
   * Lo que no entra en el ranking no se guarda (`D-11`), así que aquí no hay
   * filas con cero: una tabla llena de ceros no es información, es ruido con
   * nombres y teléfonos dentro.
   */
  it('no lista invitados que no han jugado', async () => {
    const p = montarRanking(jugadores);
    await p.asentar();

    expect(p.raiz.querySelectorAll('.qr__fila')).toHaveLength(2);
    expect(p.texto()).not.toContain('Sin jugar');
  });

  it('pone primero a quien va ganando', async () => {
    const p = montarRanking(jugadores);
    await p.asentar();

    const filas = [...p.raiz.querySelectorAll('.qr__fila')];
    expect(filas[0]?.textContent).toContain('Ana Ruiz');
  });

  it('resume cuántos están y cuánto se ha jugado', async () => {
    const p = montarRanking(jugadores);
    await p.asentar();

    expect(p.texto()).toContain('2 en el ranking, 4 partidas jugadas');
  });

  /** Vaciar no tiene vuelta: se confirma antes. */
  it('no vacía el ranking sin confirmar', async () => {
    const p = montarRanking(jugadores);
    await p.asentar();
    await p.pulsar(p.boton('Vaciar el ranking'));

    expect(p.escrituras).toEqual([]);
    expect(p.texto()).toContain('No tiene vuelta atrás');
  });
});
