import { describe, expect, it } from 'vitest';

import { eurosACentimosOCero } from '../../../shared/dinero';
import {
  agruparPorCategoria,
  leerProveedor,
  nombreDeContrato,
  nombreSeguroDeContrato,
  pagado,
  pendiente,
  totales,
  validarPago,
  validarProveedor,
  type BorradorDeProveedor,
  type ProveedorDelPanel,
} from './proveedores';

const proveedor = (parcial: Partial<ProveedorDelPanel> & { id: string }): ProveedorDelPanel => ({
  name: 'Foto Luz',
  category: 'Fotografía',
  contactName: '',
  phone: null,
  email: null,
  website: null,
  quotedCents: 0,
  agreedCents: 0,
  status: 'candidate',
  payments: [],
  contractPaths: [],
  rating: null,
  notes: '',
  order: 1,
  ...parcial,
});

const BORRADOR: BorradorDeProveedor = {
  name: 'Foto Luz',
  category: 'Fotografía',
  contactName: 'Ana',
  phone: '600 11 22 33',
  email: 'ana@fotoluz.es',
  website: 'fotoluz.es',
  quoted: '1.500',
  agreed: '',
  status: 'candidate',
  rating: 0,
  notes: '',
};

describe('leerProveedor', () => {
  it('lee una ficha completa', () => {
    const leido = leerProveedor(
      'v1',
      {
        name: ' Foto Luz ',
        category: 'Fotografía',
        contactName: 'Ana',
        phone: '600112233',
        email: 'ana@fotoluz.es',
        website: 'fotoluz.es',
        quotedPrice: 150000,
        agreedPrice: 140000,
        status: 'contracted',
        payments: [{ amountCents: 50000, on: '2027-01-10', concept: 'Señal' }],
        contractPaths: ['weddings/w1/vendors/v1/1700000000000-contrato.pdf'],
        rating: 4,
        notes: 'Muy atenta',
        order: 3,
      },
      'w1',
    );

    expect(leido).toMatchObject({
      id: 'v1',
      name: 'Foto Luz',
      phone: '600112233',
      website: 'https://fotoluz.es/',
      quotedCents: 150000,
      agreedCents: 140000,
      status: 'contracted',
      rating: 4,
      order: 3,
    });
    expect(leido?.payments).toEqual([{ amountCents: 50000, on: '2027-01-10', concept: 'Señal' }]);
    expect(leido?.contractPaths).toHaveLength(1);
  });

  it('sin nombre no hay ficha', () => {
    expect(leerProveedor('v1', { name: '  ' }, 'w1')).toBeNull();
    expect(leerProveedor('v1', null, 'w1')).toBeNull();
    expect(leerProveedor('v1', 'texto', 'w1')).toBeNull();
  });

  it('un estado desconocido cae a candidato y lo ilegible, a su valor neutro', () => {
    const leido = leerProveedor(
      'v1',
      { name: 'X', status: 'raro', quotedPrice: -5, rating: 9, website: 'javascript:alert(1)' },
      'w1',
    );
    expect(leido).toMatchObject({
      status: 'candidate',
      quotedCents: 0,
      rating: null,
      website: null,
      category: 'Otros',
    });
  });

  it('descarta los pagos rotos y los contratos de otra ficha o de otra boda', () => {
    const leido = leerProveedor(
      'v1',
      {
        name: 'X',
        payments: [
          { amountCents: 0, on: '2027-01-10' },
          { amountCents: 100, on: 'mañana' },
          { amountCents: 100, on: '2027-02-30' },
          { amountCents: 100, on: '2027-02-10', concept: 'Bien' },
          'basura',
        ],
        contractPaths: [
          'weddings/w1/vendors/v1/a.pdf',
          'weddings/OTRA/vendors/v1/a.pdf',
          'weddings/w1/vendors/v2/a.pdf',
          42,
        ],
      },
      'w1',
    );
    expect(leido?.payments).toHaveLength(1);
    expect(leido?.contractPaths).toEqual(['weddings/w1/vendors/v1/a.pdf']);
  });
});

describe('validarProveedor', () => {
  it('acepta el borrador y normaliza teléfono y web', () => {
    const r = validarProveedor(BORRADOR, eurosACentimosOCero);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.datos).toMatchObject({
        name: 'Foto Luz',
        phone: '600112233',
        website: 'https://fotoluz.es/',
        quotedCents: 150000,
        agreedCents: 0,
        rating: null,
      });
    }
  });

  it.each([
    [{ name: '  ' }, 'nombre'],
    [{ name: 'x'.repeat(81) }, 'nombre'],
    [{ category: 'x'.repeat(41) }, 'categoria'],
    [{ phone: 'llámame' }, 'telefono'],
    [{ email: 'sin-arroba' }, 'email'],
    [{ website: 'javascript:alert(1)' }, 'web'],
    [{ quoted: 'mucho' }, 'presupuesto'],
    [{ agreed: '12,345' }, 'acordado'],
    [{ notes: 'x'.repeat(1001) }, 'notas'],
  ] as const)('rechaza %j por %s', (cambio, motivo) => {
    const r = validarProveedor({ ...BORRADOR, ...cambio }, eurosACentimosOCero);
    expect(r).toEqual({ ok: false, motivo });
  });

  it('los campos opcionales pueden ir vacíos y la valoración 0 es «sin valorar»', () => {
    const r = validarProveedor(
      { ...BORRADOR, phone: '', email: '', website: '', quoted: '', rating: 0, category: '' },
      eurosACentimosOCero,
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.datos).toMatchObject({
        phone: null,
        email: null,
        website: null,
        rating: null,
        category: 'Otros',
      });
    }
  });

  it('guarda la valoración de 1 a 5', () => {
    const r = validarProveedor({ ...BORRADOR, rating: 4 }, eurosACentimosOCero);
    expect(r.ok && r.datos.rating).toBe(4);
  });
});

describe('validarPago', () => {
  it('acepta un pago bien escrito', () => {
    expect(
      validarPago(
        { importe: '500', fecha: '2027-01-10', concepto: ' Señal ' },
        eurosACentimosOCero,
      ),
    ).toEqual({ ok: true, pago: { amountCents: 50000, on: '2027-01-10', concept: 'Señal' } });
  });

  it('rechaza importe vacío o cero, fecha inválida y concepto larguísimo', () => {
    const base = { importe: '500', fecha: '2027-01-10', concepto: '' };
    expect(validarPago({ ...base, importe: '' }, eurosACentimosOCero)).toEqual({
      ok: false,
      motivo: 'importe',
    });
    expect(validarPago({ ...base, importe: '0' }, eurosACentimosOCero)).toEqual({
      ok: false,
      motivo: 'importe',
    });
    expect(validarPago({ ...base, fecha: '' }, eurosACentimosOCero)).toEqual({
      ok: false,
      motivo: 'fecha',
    });
    expect(validarPago({ ...base, concepto: 'x'.repeat(81) }, eurosACentimosOCero)).toEqual({
      ok: false,
      motivo: 'concepto',
    });
  });
});

describe('pagado, pendiente y totales', () => {
  const contratado = proveedor({
    id: 'a',
    status: 'contracted',
    agreedCents: 100000,
    payments: [
      { amountCents: 30000, on: '2027-01-01', concept: '' },
      { amountCents: 20000, on: '2027-02-01', concept: '' },
    ],
  });

  it('lo pagado es la suma de los pagos y lo pendiente, lo acordado menos eso', () => {
    expect(pagado(contratado)).toBe(50000);
    expect(pendiente(contratado)).toBe(50000);
  });

  it('pagar de más no da un pendiente negativo', () => {
    expect(
      pendiente({
        agreedCents: 1000,
        payments: [{ amountCents: 5000, on: '2027-01-01', concept: '' }],
      }),
    ).toBe(0);
  });

  it('los totales solo cuentan contratados y pagados; los descartados no cuentan para nada', () => {
    const t = totales([
      contratado,
      proveedor({
        id: 'b',
        status: 'paid',
        agreedCents: 20000,
        payments: [{ amountCents: 20000, on: '2027-01-01', concept: '' }],
      }),
      proveedor({ id: 'c', status: 'candidate', quotedCents: 999999 }),
      proveedor({ id: 'd', status: 'discarded', agreedCents: 888888 }),
    ]);
    expect(t).toEqual({
      proveedores: 3,
      candidatos: 1,
      contratados: 2,
      acordado: 120000,
      pagado: 70000,
      pendiente: 50000,
    });
  });
});

describe('agruparPorCategoria (la comparativa)', () => {
  it('marca el candidato más barato si hay dos o más con precio', () => {
    const [g] = agruparPorCategoria([
      proveedor({ id: 'a', quotedCents: 200000 }),
      proveedor({ id: 'b', quotedCents: 150000, order: 2 }),
      proveedor({ id: 'c', quotedCents: 0, order: 3 }),
    ]);
    expect(g?.masBarato).toBe('b');
    // Los candidatos, del más barato al más caro; sin precio, al final.
    expect(g?.proveedores.map((p) => p.id)).toEqual(['b', 'a', 'c']);
  });

  it('con un solo candidato con precio no hay nada que comparar', () => {
    const [g] = agruparPorCategoria([
      proveedor({ id: 'a', quotedCents: 200000 }),
      proveedor({ id: 'b', order: 2 }),
    ]);
    expect(g?.masBarato).toBeNull();
  });

  it('con un empate en el mínimo no hay ganador', () => {
    const [g] = agruparPorCategoria([
      proveedor({ id: 'a', quotedCents: 100000 }),
      proveedor({ id: 'b', quotedCents: 100000, order: 2 }),
    ]);
    expect(g?.masBarato).toBeNull();
  });

  it('los descartados y los ya contratados no entran en la comparativa', () => {
    const [g] = agruparPorCategoria([
      proveedor({ id: 'a', quotedCents: 50000, status: 'discarded' }),
      proveedor({ id: 'b', quotedCents: 60000, status: 'contracted', order: 2 }),
      proveedor({ id: 'c', quotedCents: 200000, order: 3 }),
    ]);
    expect(g?.masBarato).toBeNull();
  });

  it('dentro de la categoría: contratados, pagados, candidatos y descartados al final', () => {
    const [g] = agruparPorCategoria([
      proveedor({ id: 'd', status: 'discarded' }),
      proveedor({ id: 'c', status: 'candidate', order: 2 }),
      proveedor({ id: 'p', status: 'paid', order: 3 }),
      proveedor({ id: 'k', status: 'contracted', order: 4 }),
    ]);
    expect(g?.proveedores.map((p) => p.id)).toEqual(['k', 'p', 'c', 'd']);
  });

  it('las categorías salen en el orden de la primera ficha de cada una', () => {
    const grupos = agruparPorCategoria([
      proveedor({ id: 'a', category: 'Flores', order: 1 }),
      proveedor({ id: 'b', category: 'Música', order: 2 }),
      proveedor({ id: 'c', category: 'Flores', order: 3 }),
    ]);
    expect(grupos.map((g) => g.category)).toEqual(['Flores', 'Música']);
    expect(grupos[0]?.proveedores).toHaveLength(2);
  });
});

describe('nombres de contrato', () => {
  it('el nombre legible quita ruta y sello de hora', () => {
    expect(nombreDeContrato('weddings/w1/vendors/v1/1700000000000-contrato-final.pdf')).toBe(
      'contrato-final.pdf',
    );
  });

  it('el nombre que se sube no lleva rutas, acentos ni caracteres raros', () => {
    expect(nombreSeguroDeContrato('../../Contrato ñandú (v2).PDF')).toBe('Contrato-nandu-v2.pdf');
    expect(nombreSeguroDeContrato('???.pdf')).toBe('contrato.pdf');
  });
});
