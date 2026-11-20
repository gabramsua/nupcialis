import { describe, expect, it } from 'vitest';

import { TOPE_FOTOS_POR_DEFECTO, topeDeFotos } from './limites';

describe('el tope de fotos por boda', () => {
  it('sin campo, 500 (D-39)', () => {
    expect(TOPE_FOTOS_POR_DEFECTO).toBe(500);
    expect(topeDeFotos({})).toBe(500);
    expect(topeDeFotos(undefined)).toBe(500);
    expect(topeDeFotos(null)).toBe(500);
  });

  it('usa el de la boda cuando lo tiene', () => {
    expect(topeDeFotos({ limits: { maxPhotos: 1200 } })).toBe(1200);
  });

  it.each([
    ['cero', 0],
    ['negativo', -5],
    ['con decimales', 10.5],
    ['texto', '900'],
    ['nulo', null],
    ['infinito', Infinity],
  ])('un dato roto (%s) no deja la galería sin techo ni cerrada', (_nombre, valor) => {
    expect(topeDeFotos({ limits: { maxPhotos: valor } })).toBe(500);
  });
});
