import { telefonoVisible } from './telefono';

describe('telefonoVisible', () => {
  it('quita el +34 de un número español', () => {
    expect(telefonoVisible('+34677000111')).toBe('677000111');
    expect(telefonoVisible('+34 677 000 111')).toBe('677000111');
  });

  it('respeta el prefijo de otro país', () => {
    expect(telefonoVisible('+447700900123')).toBe('+447700900123');
    expect(telefonoVisible('+33612345678')).toBe('+33612345678');
  });

  it('deja tal cual lo que no es un móvil o fijo español', () => {
    expect(telefonoVisible('677000111')).toBe('677000111');
    expect(telefonoVisible('+34123')).toBe('+34123');
  });

  it('vacío si no hay nada', () => {
    expect(telefonoVisible(null)).toBe('');
    expect(telefonoVisible(undefined)).toBe('');
  });
});
