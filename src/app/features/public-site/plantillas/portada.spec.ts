import { describe, expect, it } from 'vitest';

import { cuentaAtras } from './portada';

const AHORA = new Date('2026-09-14T12:00:00Z');

describe('cuentaAtras', () => {
  it('cuenta días, horas y minutos', () => {
    const boda = new Date('2026-09-17T15:30:00Z');
    expect(cuentaAtras(boda, AHORA)).toEqual({ dias: 3, horas: 3, minutos: 30 });
  });

  // Una portada que anuncia «faltan -12 días» es peor que una sin cuenta atrás.
  it('desaparece cuando la boda ya pasó', () => {
    expect(cuentaAtras(new Date('2026-09-13T12:00:00Z'), AHORA)).toBeNull();
  });

  it('y también justo al llegar la hora', () => {
    expect(cuentaAtras(new Date('2026-09-14T12:00:00Z'), AHORA)).toBeNull();
  });

  it('una boda sin fecha no cuenta nada', () => {
    expect(cuentaAtras(null, AHORA)).toBeNull();
  });

  it('a menos de un día quedan horas, no cero días', () => {
    const boda = new Date('2026-09-14T20:15:00Z');
    expect(cuentaAtras(boda, AHORA)).toEqual({ dias: 0, horas: 8, minutos: 15 });
  });
});
