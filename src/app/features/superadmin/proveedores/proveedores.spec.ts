import { describe, expect, it } from 'vitest';

import { pago } from '../gestion/gestion.testing';
import {
  leerLiquidacion,
  leerProveedores,
  saldosPorProveedor,
  tarifaDe,
  type Proveedor,
} from './proveedores';

const PEPE: Proveedor = {
  id: 'p1',
  name: 'Invitaciones Pepe',
  code: 'pepe',
  contactName: '',
  email: '',
  phone: '',
  wholesalePrice: { basic: 3000, extended: 6000 },
  active: true,
};
const ANA: Proveedor = { ...PEPE, id: 'p2', name: 'Fotos Ana', code: 'ana' };

describe('leerProveedores', () => {
  it('lee la lista y descarta lo que no tiene id', () => {
    const r = leerProveedores({
      proveedores: [{ id: 'p1', name: 'Pepe', code: 'pepe', active: true }, { name: 'sin id' }, 7],
    });
    expect(r).toHaveLength(1);
    expect(r?.[0]).toMatchObject({ id: 'p1', active: true, wholesalePrice: { basic: 0 } });
  });

  it('sin lista no hay lectura', () => {
    expect(leerProveedores({})).toBeNull();
    expect(leerProveedores(null)).toBeNull();
  });

  it('un proveedor sin el booleano `active` cuenta como apagado', () => {
    expect(leerProveedores({ proveedores: [{ id: 'p1', active: 'sí' }] })?.[0]?.active).toBe(false);
  });
});

describe('leerLiquidacion', () => {
  it('lee el resultado de liquidar', () => {
    expect(leerLiquidacion({ liquidados: 2, totalCents: 6000 })).toEqual({
      liquidados: 2,
      totalCents: 6000,
    });
    expect(leerLiquidacion({})).toBeNull();
  });
});

describe('saldosPorProveedor', () => {
  const PAGOS = [
    pago({ id: 'a', weddingId: 'w1', partnerId: 'p1', status: 'pending', amountCents: 3000 }),
    pago({ id: 'b', weddingId: 'w2', partnerId: 'p1', status: 'pending', amountCents: 6000 }),
    pago({ id: 'c', weddingId: 'w3', partnerId: 'p1', status: 'paid', amountCents: 3000 }),
    pago({ id: 'd', weddingId: 'w4', partnerId: 'p2', status: 'paid', amountCents: 3000 }),
    pago({ id: 'e', weddingId: 'w5', partnerId: '', status: 'pending', amountCents: 9900 }),
  ];

  it('suma lo pendiente y lo liquidado de cada proveedor, y cuenta sus bodas', () => {
    const [pepe, ana] = saldosPorProveedor([ANA, PEPE], PAGOS);
    expect(pepe).toMatchObject({ bodas: 3, pendienteCents: 9000, liquidadoCents: 3000 });
    expect(pepe?.pendientes.map((p) => p.id).sort()).toEqual(['a', 'b']);
    expect(ana).toMatchObject({ bodas: 1, pendienteCents: 0, liquidadoCents: 3000 });
  });

  it('los cobros directos no cuentan para ningún proveedor', () => {
    const total = saldosPorProveedor([PEPE, ANA], PAGOS).reduce((t, s) => t + s.pendienteCents, 0);
    expect(total).toBe(9000);
  });

  it('ordena por lo que deben: a quien hay que llamar, arriba', () => {
    expect(saldosPorProveedor([ANA, PEPE], PAGOS).map((s) => s.proveedor.id)).toEqual(['p1', 'p2']);
  });

  it('una boda con dos cobros del mismo proveedor cuenta una vez', () => {
    const dos = [
      pago({ id: 'x', weddingId: 'w1', partnerId: 'p1', status: 'pending' }),
      pago({ id: 'y', weddingId: 'w1', partnerId: 'p1', status: 'paid' }),
    ];
    expect(saldosPorProveedor([PEPE], dos)[0]?.bodas).toBe(1);
  });
});

describe('tarifaDe', () => {
  it('da la tarifa mayorista del plan', () => {
    expect(tarifaDe(PEPE, 'basic')).toBe(3000);
    expect(tarifaDe(PEPE, 'extended')).toBe(6000);
    expect(tarifaDe(undefined, 'basic')).toBeNull();
  });
});
