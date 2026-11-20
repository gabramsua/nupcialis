import { describe, expect, it } from 'vitest';

import { idDePregunta, ordenarPreguntas, traducir } from './preguntas-gateway.firestore';
import type { PreguntaDelPanel } from '../rsvp/preguntas-gateway';

/**
 * Las tres piezas de la puerta de preguntas que se pueden probar sin red.
 *
 * `idDePregunta` es la que más importa: el id de documento **es la clave de las
 * respuestas guardadas**. Reutilizar uno mezclaría las respuestas de dos
 * preguntas distintas, y eso no se nota hasta que alguien exporta la lista para
 * el catering.
 */

function pregunta(id: string, order: number): PreguntaDelPanel {
  return {
    id,
    label: id,
    helpText: '',
    type: 'text',
    options: [],
    required: false,
    target: 'both',
    mapsTo: null,
    visibleIf: null,
    order,
    enabled: true,
    isSystem: false,
  };
}

describe('idDePregunta', () => {
  it('sale de la etiqueta, en legible', () => {
    expect(idDePregunta('¿Necesitas autobús?', [])).toBe('necesitas-autobus');
  });

  it('si ya existe, añade un sufijo en vez de pisarlo', () => {
    expect(idDePregunta('Menú', ['menu'])).toBe('menu-2');
    expect(idDePregunta('Menú', ['menu', 'menu-2'])).toBe('menu-3');
  });

  it('una etiqueta sin letras ni números tiene id de todas formas', () => {
    expect(idDePregunta('¿?¡!', [])).toBe('pregunta');
  });

  it('no se va de largo: un id de doscientos caracteres no es un id', () => {
    expect(idDePregunta('a'.repeat(200), []).length).toBeLessThanOrEqual(40);
  });
});

describe('ordenarPreguntas', () => {
  it('por orden, y el id decide los empates para que no bailen', () => {
    const lista = [pregunta('b', 1), pregunta('c', 0), pregunta('a', 1)];

    expect(ordenarPreguntas(lista).map((p) => p.id)).toEqual(['c', 'a', 'b']);
  });
});

describe('traducir', () => {
  /**
   * Lo único que la pareja puede intentar y no poder: borrar una de sistema. El
   * mensaje tiene que decir eso y ofrecer la salida, no soltar un código.
   */
  it('un permiso denegado es «esa no se puede borrar»', () => {
    expect(traducir({ code: 'permission-denied' })).toEqual({ tipo: 'de-sistema' });
  });

  it('los fallos de red se cuentan como red', () => {
    expect(traducir({ code: 'unavailable' })).toEqual({ tipo: 'red' });
    expect(traducir({ code: 'deadline-exceeded' })).toEqual({ tipo: 'red' });
  });

  it('lo que no conocemos se queda con su mensaje, pero marcado como desconocido', () => {
    expect(traducir({ code: 'resource-exhausted', message: 'Quota' })).toEqual({
      tipo: 'error',
      mensaje: 'Quota',
    });
  });

  it('un error sin forma no revienta', () => {
    expect(traducir(null).tipo).toBe('error');
    expect(traducir(undefined).tipo).toBe('error');
  });
});
