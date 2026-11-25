import { describe, expect, it } from 'vitest';

import { sanearFirmasServidas } from '../../features/public-site/libro/libro';
import { traducirLibro } from './libro-gateway.firebase';

describe('traducirLibro', () => {
  it('lee el motivo que manda el servidor', () => {
    expect(
      traducirLibro({ code: 'functions/resource-exhausted', details: { motivo: 'tope-invitado' } }),
    ).toEqual({ tipo: 'tope-invitado' });
    expect(traducirLibro({ details: { motivo: 'vacia' } })).toEqual({ tipo: 'vacia' });
    expect(traducirLibro({ details: { motivo: 'sin-verificar' } })).toEqual({
      tipo: 'sin-verificar',
    });
  });

  it('distingue la red, lo que ya no existe y el resto', () => {
    expect(traducirLibro({ code: 'functions/unavailable' })).toEqual({ tipo: 'red' });
    expect(traducirLibro({ code: 'functions/not-found' })).toEqual({ tipo: 'no-existe' });
    expect(traducirLibro({ code: 'functions/internal' })).toEqual({ tipo: 'error' });
    expect(traducirLibro(null)).toEqual({ tipo: 'error' });
  });
});

describe('sanearFirmasServidas', () => {
  it('descarta lo que no sirve y rellena lo que falta', () => {
    const r = sanearFirmasServidas([
      { id: 'a', autor: 'Ana', mensaje: 'Hola', cuando: '2026-01-01T00:00:00.000Z', mia: true },
      { id: 'b', mensaje: 'Sin autor' },
      { id: '', mensaje: 'sin id' },
      { id: 'c', autor: 'X', mensaje: '' },
      null,
      'texto',
    ]);

    expect(r).toEqual([
      { id: 'a', autor: 'Ana', mensaje: 'Hola', cuando: '2026-01-01T00:00:00.000Z', mia: true },
      { id: 'b', autor: '', mensaje: 'Sin autor', cuando: null, mia: false },
    ]);
  });

  it('lo que no es una lista es una lista vacía', () => {
    expect(sanearFirmasServidas(undefined)).toEqual([]);
    expect(sanearFirmasServidas({})).toEqual([]);
  });
});
