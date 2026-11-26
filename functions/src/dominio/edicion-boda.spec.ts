import { describe, expect, it } from 'vitest';

import { validarEdicion } from './edicion-boda';

describe('validarEdicion', () => {
  it('acepta solo los campos que vienen y los limpia', () => {
    const r = validarEdicion({ partnerA: '  Ana  ', weddingDate: '2027-06-12', plan: 'extended' });
    expect(r).toMatchObject({ ok: true });
    if (r.ok) {
      expect(r.cambios.partnerA).toBe('Ana');
      expect(r.cambios.weddingDate?.toISOString()).toBe('2027-06-12T00:00:00.000Z');
      expect(r.cambios.plan).toBe('extended');
      expect(r.cambios.partnerB).toBeUndefined();
    }
  });

  it('permite una fecha pasada: corregir una boda ya celebrada es normal', () => {
    expect(validarEdicion({ weddingDate: '2020-01-01' }).ok).toBe(true);
  });

  it.each([
    [{ partnerA: '   ' }, 'vacio'],
    [{ partnerB: 'x'.repeat(61) }, 'nombres'],
    [{ weddingDate: '2027-02-31' }, 'fecha'],
    [{ weddingDate: '12/06/2027' }, 'fecha'],
    [{ ceremonyType: 'otra' }, 'ceremonia'],
    [{ plan: 'premium' }, 'plan'],
    [{}, 'nada'],
    [null, 'nada'],
  ])('rechaza %j', (entrada, motivo) => {
    expect(validarEdicion(entrada)).toEqual({ ok: false, motivo });
  });

  it('ignora lo que no se puede editar (campos desconocidos)', () => {
    expect(validarEdicion({ status: 'active' })).toEqual({ ok: false, motivo: 'nada' });
  });

  it('la dirección se normaliza y se valida (D-55)', () => {
    const r = validarEdicion({ slug: '  Ana y Leo 2027 ' });
    expect(r.ok && r.cambios.slug).toBe('ana-y-leo-2027');
    expect(validarEdicion({ slug: 'a' })).toEqual({ ok: false, motivo: 'slug' });
    expect(validarEdicion({ slug: 'admin' })).toEqual({ ok: false, motivo: 'slug' });
  });
});

describe('teléfono de contacto (D-55)', () => {
  it('se normaliza, y vacío lo borra', () => {
    const r = validarEdicion({ contactPhone: '600 11 22 33' });
    expect(r.ok && r.cambios.contactPhone).toBe('+34600112233');

    const borrar = validarEdicion({ contactPhone: '  ' });
    expect(borrar.ok && borrar.cambios.contactPhone).toBeNull();
  });

  it('uno que no vale se rechaza', () => {
    expect(validarEdicion({ contactPhone: 'abc' })).toEqual({ ok: false, motivo: 'telefono' });
  });
});

describe('precio acordado (D-56)', () => {
  it('se guarda en céntimos enteros', () => {
    const r = validarEdicion({ agreedPriceCents: 9900 });
    expect(r.ok && r.cambios.agreedPriceCents).toBe(9900);
  });

  it('cero es un precio válido: se regala', () => {
    const r = validarEdicion({ agreedPriceCents: 0 });
    expect(r.ok && r.cambios.agreedPriceCents).toBe(0);
  });

  it('null lo quita', () => {
    const r = validarEdicion({ agreedPriceCents: null });
    expect(r.ok && r.cambios.agreedPriceCents).toBeNull();
  });

  it('lo que no es un importe razonable se rechaza', () => {
    for (const malo of [-1, 12.5, '99', Number.NaN, 10_000_001]) {
      expect(validarEdicion({ agreedPriceCents: malo })).toEqual({ ok: false, motivo: 'precio' });
    }
  });
});
