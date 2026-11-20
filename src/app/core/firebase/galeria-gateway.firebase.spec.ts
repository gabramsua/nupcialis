import { describe, expect, it } from 'vitest';

import { traducirGaleria } from './galeria-gateway.firebase';

describe('cómo se traduce un fallo de la galería', () => {
  it('«llena» cuando el servidor dice que se alcanzó el tope (D-39)', () => {
    expect(
      traducirGaleria({
        code: 'functions/resource-exhausted',
        details: { motivo: 'galeria-llena' },
      }),
    ).toEqual({ tipo: 'llena' });
    expect(traducirGaleria({ code: 'resource-exhausted' })).toEqual({ tipo: 'llena' });
  });

  it('sigue distinguiendo lo demás', () => {
    expect(traducirGaleria({ details: { motivo: 'sin-verificar' } })).toEqual({
      tipo: 'sin-verificar',
    });
    expect(traducirGaleria({ code: 'functions/unavailable' })).toEqual({ tipo: 'red' });
    expect(
      traducirGaleria({ code: 'invalid-argument', message: 'La imagen pesa demasiado.' }),
    ).toEqual({
      tipo: 'pesa-demasiado',
    });
    expect(traducirGaleria(new Error('x'))).toEqual({ tipo: 'error' });
  });
});
