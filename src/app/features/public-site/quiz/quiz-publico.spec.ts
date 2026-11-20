import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { provideIconSprite } from '../../../design-system/icons/icon-sprite.providers';
import {
  PUERTA_QUIZ,
  type PartidaTerminada,
  type PuertaQuiz,
  type ResultadoEntrega,
  type ResultadoPartida,
} from '../../../core/quiz/quiz-gateway';
import { NpQuizPublico } from './quiz-publico';

/**
 * El quiz, como lo juega el invitado.
 *
 * Lo que se vigila, por orden de lo que costaría si se rompe:
 *
 * 1. **Que la respuesta correcta no esté en el navegador durante la partida.**
 *    Es la regla de oro 4 vista desde el cliente: si estuviera, el juego se
 *    gana abriendo la consola y la corrección en servidor no serviría de nada.
 * 2. **Que el ranking no enseñe un teléfono**, ni entero ni recortado: en el
 *    modo B los cuatro últimos dígitos son media credencial (`D-11`).
 * 3. **Que quien no sale entre los veinte sepa cuánto le falta**, porque es el
 *    caso normal en una boda de ciento veinte invitados.
 */

const ES = JSON.parse(readFileSync('public/i18n/es.json', 'utf8')) as Record<string, unknown>;

const PARTIDA = {
  gameId: 'g1',
  preguntas: [
    {
      id: 'p1',
      text: '¿Dónde nos conocimos?',
      difficulty: 1 as const,
      puntos: 10,
      tienePista: true,
      opciones: ['En una boda', 'En el gimnasio', 'En el trabajo', 'En la playa'],
    },
    {
      id: 'p2',
      text: '¿Quién pidió matrimonio?',
      difficulty: 2 as const,
      puntos: 20,
      tienePista: false,
      opciones: ['Ella', 'Él', 'Los dos', 'El perro'],
    },
  ],
};

const FINAL: PartidaTerminada = {
  points: 30,
  total: 2,
  elapsedMs: 42_000,
  puesto: 7,
  ranking: [
    { id: 'r1', puesto: 1, displayName: 'Ana Ruiz', points: 120, esMio: false },
    { id: 'r2', puesto: 2, displayName: 'Pepe García', points: 110, esMio: false },
  ],
};

function montar(final: PartidaTerminada = FINAL, partida: ResultadoPartida | null = null) {
  const entregas: { gameId: string; respuestas: Record<string, string> }[] = [];
  const pistasPedidas: string[] = [];

  const doble: PuertaQuiz = {
    async empezar() {
      return partida ?? { ok: true, partida: PARTIDA };
    },
    async entregar(gameId, respuestas) {
      entregas.push({ gameId, respuestas: { ...respuestas } });
      return { ok: true, resultado: final } satisfies ResultadoEntrega;
    },
    async ranking() {
      return { ok: true, puestos: final.ranking, visible: true };
    },
    async pedirPista(_gameId, preguntaId) {
      pistasPedidas.push(preguntaId);
      return { ok: true, pista: 'Había arroz' };
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
      provideIconSprite('public'),
      provideRouter([]),
      { provide: PUERTA_QUIZ, useValue: doble },
    ],
  });

  const fixture = TestBed.createComponent(NpQuizPublico);
  fixture.detectChanges();

  const raiz = fixture.nativeElement as HTMLElement;

  return {
    fixture,
    raiz,
    entregas,
    pistasPedidas,
    texto: () => raiz.textContent?.replace(/\s+/g, ' ') ?? '',
    html: () => raiz.innerHTML,
    boton(texto: string) {
      return [...raiz.querySelectorAll('button')].find((b) =>
        b.textContent?.includes(texto),
      ) as HTMLButtonElement;
    },
    opciones() {
      return [...raiz.querySelectorAll<HTMLButtonElement>('.qz__opcion')];
    },
    async pulsar(boton: HTMLButtonElement) {
      boton.click();
      await new Promise((listo) => setTimeout(listo, 0));
      fixture.detectChanges();
    },
  };
}

describe('el quiz del invitado', () => {
  it('empieza por la portada, sin preguntas a la vista', async () => {
    const p = montar();

    expect(p.texto()).toContain('¿Cuánto sabéis de nosotros?');
    expect(p.texto()).not.toContain('¿Dónde nos conocimos?');
  });

  /**
   * Regla de oro 4, vista desde el navegador: durante la partida, la respuesta
   * buena **no está aquí**. Esto se mira en el HTML entero, no en el texto: una
   * clase, un atributo o un comentario con la correcta valdrían igual para
   * hacer trampa.
   */
  it('mientras se juega, la respuesta correcta no está en la página', async () => {
    const p = montar();
    await p.pulsar(p.boton('Jugar'));

    expect(p.texto()).toContain('¿Dónde nos conocimos?');
    expect(p.opciones()).toHaveLength(4);
    expect(p.html()).not.toContain('correcta');
    expect(p.html()).not.toContain('acertada');
  });

  it('al responder avanza a la siguiente, sin decir si estaba bien', async () => {
    const p = montar();
    await p.pulsar(p.boton('Jugar'));
    await p.pulsar(p.opciones()[0]!);

    expect(p.texto()).toContain('¿Quién pidió matrimonio?');
    expect(p.texto()).not.toContain('La buena era');
  });

  it('al contestar la última, entrega lo elegido y enseña los puntos', async () => {
    const p = montar();
    await p.pulsar(p.boton('Jugar'));
    await p.pulsar(p.opciones()[0]!);
    await p.pulsar(p.opciones()[1]!);

    expect(p.entregas).toEqual([{ gameId: 'g1', respuestas: { p1: 'En una boda', p2: 'Él' } }]);
    expect(p.texto()).toContain('30 puntos');
  });

  /**
   * El juego es un desafío: al terminar se enseñan los puntos y la posición,
   * y **nunca** cuál era la correcta ni cuántas se han acertado.
   */
  it('al terminar no revela ninguna respuesta correcta', async () => {
    const p = montar();
    await p.pulsar(p.boton('Jugar'));
    await p.pulsar(p.opciones()[0]!);
    await p.pulsar(p.opciones()[1]!);

    expect(p.texto()).not.toContain('La buena era');
    expect(p.texto()).not.toContain('preguntas acertadas');
    expect(p.raiz.querySelector('.qz__correcciones')).toBeNull();
    expect(p.texto()).toContain('Puesto 7 del ranking');
  });

  describe('la pista', () => {
    it('no está en la página hasta que se pide, y antes avisa de lo que cuesta', async () => {
      const p = montar();
      await p.pulsar(p.boton('Jugar'));

      expect(p.html()).not.toContain('Había arroz');
      expect(p.texto()).toContain('cuesta 5 puntos');

      await p.pulsar(p.boton('Pedir una pista'));
      expect(p.texto()).toContain('pasa a valer la mitad: 5 puntos en vez de 10');
      // Todavía no se ha pedido nada: solo se ha avisado.
      expect(p.pistasPedidas).toEqual([]);
      expect(p.html()).not.toContain('Había arroz');
    });

    it('al aceptar, se pide al servidor y se enseña', async () => {
      const p = montar();
      await p.pulsar(p.boton('Jugar'));
      await p.pulsar(p.boton('Pedir una pista'));
      await p.pulsar(p.boton('Sí, dame la pista'));

      expect(p.pistasPedidas).toEqual(['p1']);
      expect(p.texto()).toContain('Había arroz');
    });

    it('si se arrepiente, no se pide ni se cobra', async () => {
      const p = montar();
      await p.pulsar(p.boton('Jugar'));
      await p.pulsar(p.boton('Pedir una pista'));
      await p.pulsar(p.boton('No, sigo sin ella'));

      expect(p.pistasPedidas).toEqual([]);
      expect(p.html()).not.toContain('Había arroz');
    });

    it('una pregunta sin pista no ofrece nada', async () => {
      const p = montar();
      await p.pulsar(p.boton('Jugar'));
      await p.pulsar(p.opciones()[0]!);

      expect(p.texto()).toContain('¿Quién pidió matrimonio?');
      expect(p.texto()).not.toContain('Pedir una pista');
    });
  });

  describe('el ranking', () => {
    async function jugar(final: PartidaTerminada) {
      const p = montar(final);
      await p.pulsar(p.boton('Jugar'));
      await p.pulsar(p.opciones()[0]!);
      await p.pulsar(p.opciones()[0]!);
      return p;
    }

    /** `D-11`: el nombre y los puntos. Nunca un teléfono. */
    it('enseña nombre y puntos, y ningún dígito de teléfono', async () => {
      const p = await jugar(FINAL);

      expect(p.texto()).toContain('Ana Ruiz');
      expect(p.texto()).toContain('120 puntos');
      expect(p.texto()).not.toMatch(/\*{3,}/);
      expect(p.texto()).not.toContain('3663');
    });

    /**
     * El caso normal: veinte puestos y ciento veinte invitados. Y lo que no
     * entra en el ranking **no se guarda** (`D-11`), así que no hay «tu mejor
     * partida» que enseñar: se le dice que esta vez no.
     */
    it('a quien no entra se lo dice, con sus puntos', async () => {
      const p = await jugar(FINAL);

      expect(p.texto()).toContain('Esta vez no has entrado en los veinte mejores');
      expect(p.texto()).toContain('30 puntos');
    });

    /** Quien sí está en la tabla la ve destacada y no se le repite debajo. */
    it('a quien sale en la tabla le marca su fila', async () => {
      const p = await jugar({
        ...FINAL,
        puesto: 2,
        ranking: [
          { id: 'r1', puesto: 1, displayName: 'Ana Ruiz', points: 120, esMio: false },
          { id: 'r2', puesto: 2, displayName: 'Pepe García', points: 30, esMio: true },
        ],
      });

      expect(p.raiz.querySelectorAll('.qz__yo')).toHaveLength(1);
      // El color no viaja solo: al lado va la palabra.
      expect(p.raiz.querySelector('.qz__yo')?.textContent).toContain('tú');
      expect(p.texto()).not.toContain('Esta vez no has entrado');
    });
  });

  it('si no hay preguntas, lo dice en vez de quedarse en blanco', async () => {
    const p = montar(FINAL, { ok: false, fallo: { tipo: 'sin-preguntas' } });
    await p.pulsar(p.boton('Jugar'));

    expect(p.texto()).toContain('Todavía no hay preguntas');
  });

  it('si le falta verificarse, se lo explica', async () => {
    const p = montar(FINAL, { ok: false, fallo: { tipo: 'sin-verificar' } });
    await p.pulsar(p.boton('Jugar'));

    expect(p.texto()).toContain('cuatro últimos dígitos');
  });
});
