import { describe, expect, it } from 'vitest';

import { regalosAbiertosPermitidos } from './regalos-abiertos';

const OK = {
  plan: 'basic',
  status: 'active',
  modules: { gifts: { enabled: true, visibility: 'visible' } },
};

describe('regalosAbiertosPermitidos (D-66)', () => {
  it('solo una boda básica, publicada y con el módulo de regalos encendido', () => {
    expect(regalosAbiertosPermitidos(OK)).toBe(true);
  });

  it('el plan extendido sigue pidiendo identificarse', () => {
    expect(regalosAbiertosPermitidos({ ...OK, plan: 'extended' })).toBe(false);
  });

  it('una boda en borrador, archivada o en cuarentena no los sirve', () => {
    for (const status of ['draft', 'archived', 'quarantined', undefined]) {
      expect(regalosAbiertosPermitidos({ ...OK, status }), String(status)).toBe(false);
    }
  });

  it('sin el módulo, o apagado, no hay regalos', () => {
    expect(regalosAbiertosPermitidos({ ...OK, modules: {} })).toBe(false);
    expect(regalosAbiertosPermitidos({ ...OK, modules: { gifts: { enabled: false } } })).toBe(
      false,
    );
    expect(regalosAbiertosPermitidos({ plan: 'basic', status: 'active' })).toBe(false);
  });

  it('una boda que no existe tampoco', () => {
    expect(regalosAbiertosPermitidos(undefined)).toBe(false);
  });
});
