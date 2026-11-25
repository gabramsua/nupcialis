import { describe, expect, it } from 'vitest';

import { eurosACentimosOCero } from '../../../shared/dinero';
import {
  agruparPorCategoria,
  leerPartida,
  presupuestoACsv,
  totales,
  validarBorrador,
  type BorradorDePartida,
  type PartidaDelPanel,
} from './presupuesto';

const partida = (parcial: Partial<PartidaDelPanel> & { id: string }): PartidaDelPanel => ({
  category: 'Lugar',
  concept: 'Finca',
  estimatedCents: 0,
  actualCents: 0,
  paid: false,
  dueOn: null,
  notes: '',
  vendorId: null,
  order: 1,
  ...parcial,
});

const BORRADOR: BorradorDePartida = {
  category: 'Lugar',
  concept: 'Finca',
  estimado: '5.000',
  real: '',
  paid: false,
  dueOn: '',
  vendorId: '',
  notes: '',
};

describe('dinero opcional', () => {
  it('vacío y cero valen cero; lo ilegible, null', () => {
    expect(eurosACentimosOCero('')).toBe(0);
    expect(eurosACentimosOCero('0')).toBe(0);
    expect(eurosACentimosOCero('0,00')).toBe(0);
    expect(eurosACentimosOCero('1.200,50')).toBe(120050);
    expect(eurosACentimosOCero('mucho')).toBeNull();
    expect(eurosACentimosOCero('12,345')).toBeNull();
    expect(eurosACentimosOCero(undefined)).toBeNull();
  });
});

describe('leerPartida', () => {
  it('lee el proveedor enlazado, y lo vacío o raro es «sin proveedor»', () => {
    const lee = (vendorId: unknown) => leerPartida('p', { concept: 'X', vendorId }, null)?.vendorId;
    expect(lee('v1')).toBe('v1');
    expect(lee('')).toBeNull();
    expect(lee(7)).toBeNull();
    expect(lee(undefined)).toBeNull();
  });

  it('lee lo que siembra el servidor', () => {
    expect(
      leerPartida(
        'p1',
        {
          category: 'Lugar',
          concept: 'Finca o salón',
          estimatedCents: 0,
          actualCents: 0,
          paid: false,
          notes: '',
          order: 1,
        },
        null,
      ),
    ).toMatchObject({ id: 'p1', category: 'Lugar', concept: 'Finca o salón', paid: false });
  });

  it('descarta lo que no tiene concepto y sanea los importes', () => {
    expect(leerPartida('p', { category: 'A' }, null)).toBeNull();
    expect(leerPartida('p', null, null)).toBeNull();
    const p = leerPartida('p', { concept: 'X', estimatedCents: -5, actualCents: 1.5 }, null);
    expect(p).toMatchObject({ estimatedCents: 0, actualCents: 0, category: 'Otros' });
  });
});

describe('validarBorrador', () => {
  it('convierte los importes a céntimos y limpia los textos', () => {
    const r = validarBorrador(
      { ...BORRADOR, concept: '  Finca   Los Olivos ', real: '4.800,50', paid: true },
      eurosACentimosOCero,
    );
    expect(r).toEqual({
      ok: true,
      datos: {
        category: 'Lugar',
        concept: 'Finca Los Olivos',
        estimatedCents: 500000,
        actualCents: 480050,
        paid: true,
        dueOn: null,
        notes: '',
        vendorId: null,
      },
    });
  });

  it('el proveedor se limpia: vacío es null y el id se recorta', () => {
    const con = validarBorrador({ ...BORRADOR, vendorId: ' v1 ' }, eurosACentimosOCero);
    expect(con.ok && con.datos.vendorId).toBe('v1');
    const sin = validarBorrador({ ...BORRADOR, vendorId: '' }, eurosACentimosOCero);
    expect(sin.ok && sin.datos.vendorId).toBeNull();
  });

  it('sin categoría cae en «Otros»', () => {
    const r = validarBorrador({ ...BORRADOR, category: ' ' }, eurosACentimosOCero);
    expect(r.ok && r.datos.category).toBe('Otros');
  });

  it('dice qué campo falla', () => {
    const v = (b: Partial<BorradorDePartida>) =>
      validarBorrador({ ...BORRADOR, ...b }, eurosACentimosOCero);
    expect(v({ concept: ' ' })).toEqual({ ok: false, motivo: 'concepto' });
    expect(v({ estimado: 'abc' })).toEqual({ ok: false, motivo: 'estimado' });
    expect(v({ real: '1,2,3' })).toEqual({ ok: false, motivo: 'real' });
    expect(v({ estimado: '99999999' })).toEqual({ ok: false, motivo: 'estimado' });
    expect(v({ dueOn: '2027-02-30' })).toEqual({ ok: false, motivo: 'fecha' });
    expect(v({ category: 'x'.repeat(41) })).toEqual({ ok: false, motivo: 'categoria' });
    expect(v({ notes: 'x'.repeat(501) })).toEqual({ ok: false, motivo: 'notas' });
  });

  it('acepta una fecha límite válida', () => {
    const r = validarBorrador({ ...BORRADOR, dueOn: '2027-05-01' }, eurosACentimosOCero);
    expect(r.ok && r.datos.dueOn).toBe('2027-05-01');
  });
});

describe('totales', () => {
  it('suma estimado, real, pagado y por pagar', () => {
    const t = totales([
      partida({ id: 'a', estimatedCents: 100000, actualCents: 120000, paid: true }),
      partida({ id: 'b', estimatedCents: 50000, actualCents: 40000 }),
      partida({ id: 'c', estimatedCents: 20000 }),
    ]);
    expect(t).toEqual({
      estimado: 170000,
      real: 160000,
      pagado: 120000,
      pendiente: 40000,
      desviacion: 10000,
      partidas: 3,
    });
  });

  it('la desviación solo cuenta partidas con las dos cifras', () => {
    expect(
      totales([
        partida({ id: 'a', estimatedCents: 100000 }),
        partida({ id: 'b', actualCents: 5000 }),
      ]).desviacion,
    ).toBe(0);
  });

  it('un presupuesto vacío son ceros', () => {
    expect(totales([])).toMatchObject({ estimado: 0, real: 0, pagado: 0, pendiente: 0 });
  });
});

describe('agruparPorCategoria', () => {
  it('agrupa respetando la primera aparición de cada categoría', () => {
    const grupos = agruparPorCategoria([
      partida({ id: 'a', category: 'Lugar', order: 1, estimatedCents: 10 }),
      partida({ id: 'b', category: 'Comida', order: 2 }),
      partida({ id: 'c', category: 'Lugar', order: 3, estimatedCents: 5 }),
    ]);
    expect(grupos.map((g) => g.category)).toEqual(['Lugar', 'Comida']);
    expect(grupos[0]?.partidas.map((p) => p.id)).toEqual(['a', 'c']);
    expect(grupos[0]?.totales.estimado).toBe(15);
  });
});

describe('presupuestoACsv', () => {
  it('usa punto y coma, coma decimal y neutraliza las fórmulas', () => {
    const csv = presupuestoACsv(
      [
        partida({
          id: 'a',
          concept: '=HYPERLINK("x")',
          estimatedCents: 120050,
          paid: true,
          notes: 'con; punto y coma',
        }),
      ],
      ['Categoría', 'Concepto', 'Estimado', 'Real', 'Pagada', 'Vence', 'Notas'],
      'Sí',
      'No',
    );
    const [cabecera, fila] = csv.split('\r\n');
    expect(cabecera).toBe('Categoría;Concepto;Estimado;Real;Pagada;Vence;Notas');
    expect(fila).toContain('"\'=HYPERLINK(""x"")"');
    expect(fila).toContain('1200,50');
    expect(fila).toContain('"con; punto y coma"');
    expect(fila).toContain(';Sí;');
  });
});
