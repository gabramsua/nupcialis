import { describe, expect, it } from 'vitest';

import {
  CONSEJOS_DE_FABRICA,
  MAX_CONSEJO,
  MODULOS_CON_CONSEJO,
  consejoEfectivo,
  esModuloConConsejo,
  limpiarConsejo,
} from './consejos';

describe('consejos de fábrica', () => {
  it('todos los módulos con pantalla traen consejo', () => {
    for (const m of MODULOS_CON_CONSEJO) expect(CONSEJOS_DE_FABRICA[m], m).toBeTruthy();
  });

  it('ninguno pasa del tope', () => {
    for (const t of Object.values(CONSEJOS_DE_FABRICA)) {
      expect(t.length).toBeLessThanOrEqual(MAX_CONSEJO);
    }
  });
});

describe('limpiarConsejo', () => {
  it('recorta, une saltos de línea y no deja más de un párrafo en blanco', () => {
    expect(limpiarConsejo('  hola  \r\n\r\n\r\n\r\n  adiós ')).toBe('hola\n\nadiós');
  });

  it('vacío es válido: «sin consejo»', () => {
    expect(limpiarConsejo('   ')).toBe('');
  });

  it('rechaza lo que no es texto o es demasiado largo', () => {
    expect(limpiarConsejo(3)).toBeNull();
    expect(limpiarConsejo('a'.repeat(MAX_CONSEJO + 1))).toBeNull();
  });
});

describe('consejoEfectivo', () => {
  it('sin documento, el de fábrica', () => {
    expect(consejoEfectivo('rsvp', undefined)).toBe(CONSEJOS_DE_FABRICA['rsvp']);
  });

  it('con documento manda el guardado, también si está vacío', () => {
    expect(consejoEfectivo('rsvp', { text: 'Otro' })).toBe('Otro');
    expect(consejoEfectivo('rsvp', { text: '' })).toBe('');
  });

  it('un documento roto cae al de fábrica', () => {
    expect(consejoEfectivo('rsvp', { text: 4 })).toBe(CONSEJOS_DE_FABRICA['rsvp']);
  });
});

describe('esModuloConConsejo', () => {
  it('solo los módulos con pantalla', () => {
    expect(esModuloConConsejo('quiz')).toBe(true);
    expect(esModuloConConsejo('vendors')).toBe(false);
    expect(esModuloConConsejo('../x')).toBe(false);
  });
});
