import { describe, expect, it } from 'vitest';

import { esVisible as esVisibleServidor } from '../../../../functions/src/dominio/formulario';
import type { Pregunta } from './rsvp-gateway';
import { esVisible } from './visibilidad';

/**
 * La misma regla en los dos lados.
 *
 * La visibilidad condicional está escrita dos veces —aquí y en
 * `functions/src/dominio/formulario.ts`— porque el navegador tiene que esconder
 * el menú en el mismo instante en que alguien marca que no va, y el servidor
 * tiene que decidirlo sin creerse nada de lo que llega. Esta prueba ejecuta las
 * **dos implementaciones** sobre la misma tabla y falla en cuanto se separan.
 *
 * Si falla, lo que hay que mirar es si la regla cambió en un lado solo. No vale
 * ajustar la tabla.
 */

function pregunta(parcial: Partial<Pregunta> & { id: string }): Pregunta {
  return {
    label: 'Pregunta',
    helpText: '',
    type: 'text',
    options: [],
    required: false,
    visibleIf: null,
    order: 1,
    ...parcial,
  };
}

const PADRE = pregunta({ id: 'asistencia', type: 'boolean' });

const CASOS: readonly {
  nombre: string;
  preguntas: readonly Pregunta[];
  respuestas: Record<string, unknown>;
  mira: string;
  esperado: boolean;
}[] = [
  {
    nombre: 'sin condición, siempre',
    preguntas: [PADRE],
    respuestas: {},
    mira: 'asistencia',
    esperado: true,
  },
  {
    nombre: 'con el padre contestado como toca',
    preguntas: [
      PADRE,
      pregunta({ id: 'menu', visibleIf: { questionId: 'asistencia', equals: true } }),
    ],
    respuestas: { asistencia: true },
    mira: 'menu',
    esperado: true,
  },
  {
    nombre: 'con el padre contestado al revés',
    preguntas: [
      PADRE,
      pregunta({ id: 'menu', visibleIf: { questionId: 'asistencia', equals: true } }),
    ],
    respuestas: { asistencia: false },
    mira: 'menu',
    esperado: false,
  },
  {
    nombre: 'con el padre sin contestar',
    preguntas: [
      PADRE,
      pregunta({ id: 'menu', visibleIf: { questionId: 'asistencia', equals: true } }),
    ],
    respuestas: {},
    mira: 'menu',
    esperado: false,
  },
  {
    nombre: "el 'true' de un desplegable cuenta como true",
    preguntas: [
      PADRE,
      pregunta({ id: 'menu', visibleIf: { questionId: 'asistencia', equals: true } }),
    ],
    respuestas: { asistencia: 'true' },
    mira: 'menu',
    esperado: true,
  },
  {
    nombre: "el 'no' cuenta como false",
    preguntas: [
      PADRE,
      pregunta({ id: 'menu', visibleIf: { questionId: 'asistencia', equals: true } }),
    ],
    respuestas: { asistencia: 'no' },
    mira: 'menu',
    esperado: false,
  },
  {
    nombre: 'un número que llega como texto casa',
    preguntas: [
      pregunta({ id: 'cuantos', type: 'number' }),
      pregunta({ id: 'sillas', visibleIf: { questionId: 'cuantos', equals: 2 } }),
    ],
    respuestas: { cuantos: '2' },
    mira: 'sillas',
    esperado: true,
  },
  {
    nombre: 'en una selección múltiple basta con que esté marcada',
    preguntas: [
      pregunta({ id: 'como', type: 'checkbox' }),
      pregunta({ id: 'parada', visibleIf: { questionId: 'como', equals: 'bus' } }),
    ],
    respuestas: { como: ['taxi', 'bus'] },
    mira: 'parada',
    esperado: true,
  },
  {
    nombre: 'en una selección múltiple sin esa opción, no',
    preguntas: [
      pregunta({ id: 'como', type: 'checkbox' }),
      pregunta({ id: 'parada', visibleIf: { questionId: 'como', equals: 'bus' } }),
    ],
    respuestas: { como: ['taxi'] },
    mira: 'parada',
    esperado: false,
  },
  {
    nombre: 'la cadena entera: si el abuelo está oculto, el nieto también',
    preguntas: [
      pregunta({ id: 'abuelo', visibleIf: { questionId: 'nada', equals: 1 } }),
      pregunta({ id: 'padre', visibleIf: { questionId: 'abuelo', equals: 'si' } }),
      pregunta({ id: 'nieto', visibleIf: { questionId: 'padre', equals: 'si' } }),
    ],
    respuestas: { abuelo: 'si', padre: 'si' },
    mira: 'nieto',
    esperado: false,
  },
  {
    nombre: 'una condición huérfana oculta',
    preguntas: [pregunta({ id: 'x', visibleIf: { questionId: 'borrada', equals: true } })],
    respuestas: { borrada: true },
    mira: 'x',
    esperado: false,
  },
  {
    nombre: 'un ciclo no cuelga y no se enseña',
    preguntas: [
      pregunta({ id: 'a', visibleIf: { questionId: 'b', equals: true } }),
      pregunta({ id: 'b', visibleIf: { questionId: 'a', equals: true } }),
    ],
    respuestas: { a: true, b: true },
    mira: 'a',
    esperado: false,
  },
  {
    nombre: 'equals null con respuesta null',
    preguntas: [
      pregunta({ id: 'p' }),
      pregunta({ id: 'h', visibleIf: { questionId: 'p', equals: null } }),
    ],
    respuestas: { p: null },
    mira: 'h',
    esperado: true,
  },
];

describe.each(CASOS)('$nombre', ({ preguntas, respuestas, mira, esperado }) => {
  const objetivo = preguntas.find((p) => p.id === mira)!;

  it(`el navegador dice ${esperado}`, () => {
    expect(esVisible(objetivo, preguntas, respuestas)).toBe(esperado);
  });

  it('y el servidor dice lo mismo', () => {
    // Las preguntas del servidor llevan tres campos más que no tocan la
    // visibilidad; se rellenan para poder pasar la misma tabla.
    const comoAlla = preguntas.map((p) => ({
      ...p,
      target: 'both' as const,
      mapsTo: null,
      enabled: true,
      isSystem: false,
    }));
    const suyo = comoAlla.find((p) => p.id === mira)!;

    expect(esVisibleServidor(suyo, comoAlla, respuestas)).toBe(esperado);
  });
});
