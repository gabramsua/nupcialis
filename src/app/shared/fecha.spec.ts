import { describe, expect, it } from 'vitest';

import { fechaLarga, fechaMedia } from './fecha';

const BODA = new Date('2027-06-12T10:00:00Z');

describe('fechaLarga', () => {
  it('escribe la fecha en español', () => {
    const texto = fechaLarga(BODA, 'es');
    expect(texto).toContain('junio');
    expect(texto).toContain('2027');
    expect(texto).toContain('sábado');
  });

  it('respeta el idioma de la boda', () => {
    expect(fechaLarga(BODA, 'en-GB')).toContain('June');
  });

  /**
   * El test que justifica este fichero. `DatePipe` lanzaba `NG0701` con
   * `locale: 'es'` porque nadie había registrado los datos del idioma, y la
   * excepción cortaba la plantilla: la portada se quedaba en los nombres.
   */
  it('no lanza con ningún idioma, ni siquiera con uno inventado', () => {
    for (const locale of ['es', 'en', 'gl', 'ca', 'eu', 'pt-BR', 'xx-YY-zz', '']) {
      expect(() => fechaLarga(BODA, locale)).not.toThrow();
    }
    // Con una etiqueta que ni siquiera es válida, cae al español y sigue.
    expect(fechaLarga(BODA, 'no es un idioma')).toContain('junio');
  });

  it('devuelve vacío sin fecha, en vez de inventarse una', () => {
    expect(fechaLarga(null, 'es')).toBe('');
    expect(fechaLarga(new Date('no es una fecha'), 'es')).toBe('');
  });
});

describe('fechaMedia', () => {
  it('omite el día de la semana', () => {
    const texto = fechaMedia(BODA, 'es');
    expect(texto).toContain('junio');
    expect(texto).not.toContain('sábado');
  });
});
