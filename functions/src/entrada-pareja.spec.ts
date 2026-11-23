import { Timestamp } from 'firebase-admin/firestore';
import { describe, expect, it } from 'vitest';

import { cuentaComoEntrada } from './entrada-pareja';

describe('cuentaComoEntrada', () => {
  const ahora = new Date('2027-01-01T12:00:00Z');

  it('la primera vez cuenta', () => {
    expect(cuentaComoEntrada(undefined, ahora)).toBe(true);
  });

  it('una recarga a los cinco minutos no cuenta', () => {
    expect(cuentaComoEntrada(Timestamp.fromDate(new Date('2027-01-01T11:55:00Z')), ahora)).toBe(
      false,
    );
  });

  it('pasada media hora, sí', () => {
    expect(cuentaComoEntrada(Timestamp.fromDate(new Date('2027-01-01T11:20:00Z')), ahora)).toBe(
      true,
    );
  });
});
