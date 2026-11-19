import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  COLORES_DRESS,
  MAX_AVISO,
  MAX_AVISOS,
  MAX_COLORES,
  MAX_DESCRIPCION_DRESS,
  colorDress,
  colorEnLasDos,
  dressCodePublicado,
  sanearDressCode,
  tieneDressCode,
} from './dress-code';

const MARCA = '// === COPIA LITERAL';

function cuerpo(ruta: string): string {
  const texto = readFileSync(new URL(ruta, import.meta.url), 'utf8');
  const inicio = texto.indexOf(MARCA);
  expect(inicio, `no se encontró "${MARCA}" en ${ruta}`).toBeGreaterThanOrEqual(0);
  return texto.slice(inicio);
}

describe('copia del dress code', () => {
  it('es idéntica a la del cliente', () => {
    expect(cuerpo('./dress-code.ts')).toBe(
      cuerpo('../../../src/app/features/public-site/dress-code/dress-code.ts'),
    );
  });
});

describe('la lista cerrada de colores', () => {
  /**
   * Es lo que sostiene todo el módulo: si un id pudiera traer su propio
   * hexadecimal, la web pública acabaría pintando un `style` que viene del
   * cliente, y una muestra podría salir sin nombre.
   */
  it('no tiene ids repetidos y todos traen nombre y hexadecimal', () => {
    const ids = COLORES_DRESS.map((color) => color.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const color of COLORES_DRESS) {
      expect(color.nombre.trim(), color.id).not.toBe('');
      expect(color.hex, color.id).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('resuelve un id y rechaza cualquier otra cosa', () => {
    expect(colorDress('verde-oliva')).toEqual({
      id: 'verde-oliva',
      nombre: 'Verde oliva',
      hex: '#6b7045',
    });
    expect(colorDress('#ff0000')).toBeNull();
    expect(colorDress('fucsia')).toBeNull();
    expect(colorDress(42)).toBeNull();
    expect(colorDress(null)).toBeNull();
  });
});

describe('sanearDressCode', () => {
  it('resuelve los colores de las dos listas, con su nombre', () => {
    const dress = sanearDressCode({
      description: '<p>Elegante pero cómodo.</p>',
      suggestedColors: ['verde-salvia', 'beige'],
      avoidColors: ['blanco'],
      tips: ['La ceremonia es sobre hierba.'],
    });

    expect(dress.descripcion).toBe('<p>Elegante pero cómodo.</p>');
    expect(dress.sugeridos.map((c) => c.nombre)).toEqual(['Verde salvia', 'Beige']);
    expect(dress.evitar.map((c) => c.nombre)).toEqual(['Blanco']);
    expect(dress.avisos).toEqual(['La ceremonia es sobre hierba.']);
  });

  /** Un color inventado no tiene nombre que escribir al lado de la muestra. */
  it('se come los colores que no están en la lista', () => {
    const dress = sanearDressCode({
      suggestedColors: ['verde-salvia', '#ff00ff', 'fucsia', null, 42, { id: 'beige' }],
    });

    expect(dress.sugeridos.map((c) => c.id)).toEqual(['verde-salvia']);
  });

  it('no repite un color aunque venga dos veces', () => {
    const dress = sanearDressCode({ suggestedColors: ['beige', 'beige', 'arena'] });
    expect(dress.sugeridos.map((c) => c.id)).toEqual(['beige', 'arena']);
  });

  it('corta por el tope cada lista', () => {
    const todos = COLORES_DRESS.map((color) => color.id);
    const dress = sanearDressCode({ suggestedColors: todos, avoidColors: todos });

    expect(dress.sugeridos).toHaveLength(MAX_COLORES);
    expect(dress.evitar).toHaveLength(MAX_COLORES);
  });

  it('limpia y acota los avisos', () => {
    const dress = sanearDressCode({
      tips: [
        '  Hay   hierba  ',
        '',
        '   ',
        7,
        'x'.repeat(MAX_AVISO + 50),
        ...Array(10).fill('más'),
      ],
    });

    expect(dress.avisos[0]).toBe('Hay hierba');
    expect(dress.avisos[1]).toHaveLength(MAX_AVISO);
    expect(dress.avisos).toHaveLength(MAX_AVISOS);
  });

  it('recorta la descripción sin tocar el HTML, que sanea la proyección', () => {
    const largo = `<p>${'a'.repeat(MAX_DESCRIPCION_DRESS * 2)}</p>`;
    expect(sanearDressCode({ description: largo }).descripcion).toHaveLength(MAX_DESCRIPCION_DRESS);
  });

  it('sobrevive a una configuración que no existe', () => {
    for (const valor of [undefined, null, 'texto', 42, []]) {
      const dress = sanearDressCode(valor);
      expect(dress.descripcion).toBe('');
      expect(dress.sugeridos).toEqual([]);
      expect(dress.evitar).toEqual([]);
      expect(dress.avisos).toEqual([]);
    }
  });
});

describe('tieneDressCode', () => {
  it('con cualquiera de las cuatro cosas, hay algo que enseñar', () => {
    expect(tieneDressCode(sanearDressCode({}))).toBe(false);
    expect(tieneDressCode(sanearDressCode({ description: '  ' }))).toBe(false);
    expect(tieneDressCode(sanearDressCode({ description: '<p>Hola</p>' }))).toBe(true);
    expect(tieneDressCode(sanearDressCode({ suggestedColors: ['beige'] }))).toBe(true);
    expect(tieneDressCode(sanearDressCode({ avoidColors: ['blanco'] }))).toBe(true);
    expect(tieneDressCode(sanearDressCode({ tips: ['Hay hierba'] }))).toBe(true);
  });
});

/** «Poneos verde oliva» y «evitad el verde oliva» en la misma pantalla. */
describe('colorEnLasDos', () => {
  it('encuentra el color que se contradice', () => {
    const dress = sanearDressCode({
      suggestedColors: ['verde-oliva', 'beige'],
      avoidColors: ['verde-oliva', 'blanco'],
    });

    expect(colorEnLasDos(dress).map((c) => c.nombre)).toEqual(['Verde oliva']);
  });

  it('con dos listas que no se pisan, no dice nada', () => {
    const dress = sanearDressCode({ suggestedColors: ['beige'], avoidColors: ['blanco'] });
    expect(colorEnLasDos(dress)).toEqual([]);
  });
});

/** La frontera de confianza del color (D-19). */
describe('dressCodePublicado', () => {
  it('vuelve a resolver cada color por su id contra la lista cerrada', () => {
    const dress = dressCodePublicado({
      descripcion: '<p>Elegante</p>',
      // Un hexadecimal y un nombre falsos en el documento público: se ignoran.
      sugeridos: [{ id: 'beige', nombre: 'Rojo chillón', hex: '#ff0000' }],
      evitar: [{ id: 'blanco' }, 'negro'],
      avisos: ['Hay hierba'],
    });

    expect(dress.sugeridos).toEqual([{ id: 'beige', nombre: 'Beige', hex: '#e2d3bb' }]);
    expect(dress.evitar.map((c) => c.id)).toEqual(['blanco', 'negro']);
    expect(dress.descripcion).toBe('<p>Elegante</p>');
    expect(dress.avisos).toEqual(['Hay hierba']);
  });

  it('se come un id que no existe, con cualquier disfraz', () => {
    const dress = dressCodePublicado({
      sugeridos: [{ id: 'fucsia', nombre: 'Fucsia', hex: '#ff00ff' }, { hex: '#ff00ff' }, null],
    });

    expect(dress.sugeridos).toEqual([]);
  });

  it('sobrevive a un documento público a medio escribir', () => {
    for (const valor of [undefined, null, 'texto', 42, []]) {
      expect(dressCodePublicado(valor).sugeridos).toEqual([]);
    }
  });
});
