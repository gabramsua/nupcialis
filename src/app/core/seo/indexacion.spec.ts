import { describe, expect, it } from 'vitest';

import { debeIndexarse } from './indexacion';

describe('debeIndexarse', () => {
  it('solo indexa una boda publicada que lo haya pedido', () => {
    expect(debeIndexarse('active', true)).toBe(true);
  });

  it('no indexa una boda que no lo ha pedido', () => {
    expect(debeIndexarse('active', false)).toBe(false);
  });

  it('no indexa una boda sin publicar, aunque el interruptor esté puesto', () => {
    // El interruptor se puede haber dejado encendido antes de despublicar.
    expect(debeIndexarse('draft', true)).toBe(false);
  });

  it('no indexa una boda archivada', () => {
    // Lo último que quiere una pareja es que su boda del año pasado siga
    // saliendo la primera al buscar sus nombres.
    expect(debeIndexarse('archived', true)).toBe(false);
  });

  it('ante cualquier cosa rara, no se indexa', () => {
    for (const basura of [undefined, null, 'true', 1, {}, []]) {
      expect(debeIndexarse('active', basura), String(basura)).toBe(false);
    }
    for (const estado of ['', 'publicada', 'ACTIVE']) {
      expect(debeIndexarse(estado, true), estado).toBe(false);
    }
  });
});
