import { describe, expect, it } from 'vitest';

import { MAX_LIQUIDACION, planificarLiquidacion, validarPartner } from './partners';
import { validarPago } from './superadmin';

const PARTNER = {
  name: 'Invitaciones Pepe',
  code: 'pepe-invitaciones',
  contactName: 'Pepe',
  email: 'pepe@ejemplo.com',
  phone: '600111222',
  wholesalePrice: { basic: 3000, extended: 6000 },
  active: true,
};

describe('validarPartner', () => {
  it('acepta un proveedor completo y normaliza el código', () => {
    const r = validarPartner({ ...PARTNER, code: ' Pepe-Invitaciones ' });
    expect(r).toEqual({ ok: true, partner: PARTNER });
  });

  it('los datos de contacto son opcionales', () => {
    const r = validarPartner({ ...PARTNER, contactName: undefined, email: '', phone: undefined });
    expect(r.ok).toBe(true);
  });

  it.each([
    [{ name: '' }, 'nombre'],
    [{ name: 'x'.repeat(81) }, 'nombre'],
    [{ code: 'ab' }, 'codigo'],
    [{ code: 'con espacio' }, 'codigo'],
    [{ code: 'dos--guiones' }, 'codigo'],
    [{ code: '-empieza' }, 'codigo'],
    [{ code: 'a/b/c' }, 'codigo'],
    [{ email: 'no-es-un-correo' }, 'email'],
    [{ phone: '6'.repeat(31) }, 'telefono'],
    [{ wholesalePrice: { basic: -1, extended: 100 } }, 'precio'],
    [{ wholesalePrice: { basic: 10.5, extended: 100 } }, 'precio'],
    [{ wholesalePrice: { basic: 100 } }, 'precio'],
    [{ wholesalePrice: null }, 'precio'],
    [{ wholesalePrice: { basic: 1e9, extended: 100 } }, 'precio'],
    [{ active: 'sí' }, 'activo'],
  ])('rechaza %j por %s', (cambio, motivo) => {
    expect(validarPartner({ ...PARTNER, ...cambio })).toEqual({ ok: false, motivo });
  });

  it('un precio de cero es válido (cortesía)', () => {
    expect(validarPartner({ ...PARTNER, wholesalePrice: { basic: 0, extended: 0 } }).ok).toBe(true);
  });

  it('no acepta basura', () => {
    expect(validarPartner(null).ok).toBe(false);
    expect(validarPartner('texto').ok).toBe(false);
  });
});

describe('planificarLiquidacion', () => {
  const COBROS = [
    { id: 'c1', partnerId: 'p1', status: 'pending' },
    { id: 'c2', partnerId: 'p1', status: 'pending' },
    { id: 'c3', partnerId: 'p2', status: 'pending' },
    { id: 'c4', partnerId: 'p1', status: 'paid' },
  ];
  const base = { partnerId: 'p1', fecha: '2026-11-25', cobros: COBROS };

  it('cierra los cobros pendientes de ese proveedor, sin repetidos', () => {
    expect(planificarLiquidacion({ ...base, ids: ['c1', 'c2', 'c1'] })).toEqual({
      ok: true,
      ids: ['c1', 'c2'],
    });
  });

  it('es todo o nada: un cobro de otro proveedor rechaza la liquidación entera', () => {
    expect(planificarLiquidacion({ ...base, ids: ['c1', 'c3'] })).toEqual({
      ok: false,
      motivo: 'otro-proveedor',
      id: 'c3',
    });
  });

  it('no vuelve a cobrar lo ya cobrado', () => {
    expect(planificarLiquidacion({ ...base, ids: ['c1', 'c4'] })).toEqual({
      ok: false,
      motivo: 'ya-cobrado',
      id: 'c4',
    });
  });

  it('un cobro que no existe lo dice', () => {
    expect(planificarLiquidacion({ ...base, ids: ['zz'] })).toEqual({
      ok: false,
      motivo: 'no-existe',
      id: 'zz',
    });
  });

  it.each([
    [{ partnerId: '' }, 'proveedor'],
    [{ partnerId: 'a/b' }, 'proveedor'],
    [{ fecha: '2026-02-30' }, 'fecha'],
    [{ fecha: undefined }, 'fecha'],
    [{ ids: [] }, 'seleccion'],
    [{ ids: 'c1' }, 'seleccion'],
    [{ ids: [1, 2] }, 'seleccion'],
    [{ ids: Array.from({ length: MAX_LIQUIDACION + 1 }, (_, i) => `x${i}`) }, 'demasiados'],
  ])('rechaza %j por %s', (cambio, motivo) => {
    const r = planificarLiquidacion({ ...base, ids: ['c1'], ...cambio });
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.motivo).toBe(motivo);
  });
});

describe('el cobro con proveedor', () => {
  const PAGO = {
    weddingId: 'w1',
    amountCents: 3000,
    concept: 'Plan básico',
    method: 'partner_cash',
    status: 'pending',
    paidOn: null,
    invoiceNumber: '',
    notes: '',
    partnerId: 'p1',
  };

  it('acepta efectivo de proveedor pendiente, con su proveedor', () => {
    const r = validarPago(PAGO);
    expect(r.ok && r.pago.partnerId).toBe('p1');
  });

  it('el efectivo de proveedor exige proveedor', () => {
    expect(validarPago({ ...PAGO, partnerId: '' })).toEqual({ ok: false, motivo: 'proveedor' });
    expect(validarPago({ ...PAGO, partnerId: undefined })).toEqual({
      ok: false,
      motivo: 'proveedor',
    });
  });

  it('un cobro directo no lleva proveedor', () => {
    const r = validarPago({ ...PAGO, method: 'bizum', partnerId: undefined });
    expect(r.ok && r.pago.partnerId).toBe('');
  });

  it('el id del proveedor no puede ser una ruta', () => {
    expect(validarPago({ ...PAGO, partnerId: 'a/b' })).toEqual({ ok: false, motivo: 'proveedor' });
  });
});
