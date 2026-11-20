import { describe, expect, it } from 'vitest';

import { componentes, contraste, luminancia } from './contraste';
import { PALETAS, paletaDe } from './paletas';

describe('contraste', () => {
  it('da 21 entre negro y blanco', () => {
    expect(contraste('#000000', '#ffffff')).toBeCloseTo(21, 1);
  });

  it('da 1 entre un color y sí mismo', () => {
    expect(contraste('#7a5438', '#7a5438')).toBeCloseTo(1, 5);
  });

  it('entiende la forma corta y con o sin almohadilla', () => {
    expect(componentes('#fff')).toEqual([255, 255, 255]);
    expect(componentes('000')).toEqual([0, 0, 0]);
  });

  it('devuelve 0 con lo que no es un color, en vez de colarlo por bueno', () => {
    for (const basura of ['', 'rojo', '#12345', '#gggggg', 'rgb(0,0,0)']) {
      expect(luminancia(basura), basura).toBeNull();
      expect(contraste(basura, '#ffffff'), basura).toBe(0);
    }
  });
});

/**
 * La barrera de entrada al catálogo. Una paleta que no pase esto no se mergea.
 *
 * Los mínimos son los de WCAG AA (REQUISITOS §9.3): 4.5 para texto normal, 3
 * para lo que es grande o es un elemento de interfaz. La web la abren de pie en
 * la calle y a pleno sol; no es un requisito de formulario, es que se lea.
 */
describe('cada paleta del catálogo', () => {
  it.each(PALETAS.map((p) => [p.nombre, p] as const))('%s se lee', (_nombre, paleta) => {
    const c = paleta.colores;

    expect(contraste(c.text, c.background), 'texto sobre fondo').toBeGreaterThanOrEqual(4.5);
    expect(contraste(c.text, c.surface), 'texto sobre tarjeta').toBeGreaterThanOrEqual(4.5);
    expect(contraste(c.primary, c.background), 'primario sobre fondo').toBeGreaterThanOrEqual(3);
    expect(contraste(c.accent, c.background), 'acento sobre fondo').toBeGreaterThanOrEqual(3);
    expect(contraste(c.secondary, c.background), 'secundario sobre fondo').toBeGreaterThanOrEqual(
      3,
    );
  });

  it('tiene ids únicos', () => {
    const ids = PALETAS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('distingue el fondo de la superficie', () => {
    // Si son el mismo color, las tarjetas desaparecen y la portada se aplana.
    for (const paleta of PALETAS) {
      expect(paleta.colores.surface, paleta.nombre).not.toBe(paleta.colores.background);
    }
  });
});

describe('paletaDe', () => {
  it('encuentra las que existen', () => {
    expect(paletaDe('arena')?.nombre).toBe('Arena');
  });

  it('devuelve null con lo que no existe, sin inventarse una', () => {
    // A diferencia de las plantillas, aquí no hay reserva: sin paleta elegida
    // manda la de la plantilla, que está pensada para verse bien sola.
    for (const nada of ['retirada', '', null, undefined, 7]) {
      expect(paletaDe(nada)).toBeNull();
    }
  });
});
