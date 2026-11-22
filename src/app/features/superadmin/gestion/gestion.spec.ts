import { describe, expect, it } from 'vitest';

import {
  celdaCsv,
  centimosATexto,
  diaAFecha,
  eurosACentimos,
  leerFicha,
  leerFinanzas,
  leerPago,
  leerRecordatorios,
  pagosACsv,
  resumenDePayload,
  totalesDePagos,
  type Pago,
} from './gestion';

const PAGO: Pago = {
  id: 'p1',
  weddingId: 'w1',
  amountCents: 29900,
  concept: 'Plan básico',
  method: 'bizum',
  status: 'paid',
  paidOn: '2026-11-20',
  invoiceNumber: 'F-1',
  notes: '',
};

describe('eurosACentimos', () => {
  it.each([
    ['299', 29900],
    ['299,5', 29950],
    ['299.50', 29950],
    ['1.299,50', 129950],
    ['1.299', 129900],
    [' 12 € ', 1200],
    ['0,01', 1],
  ])('«%s» son %d céntimos', (entrada, esperado) => {
    expect(eurosACentimos(entrada)).toBe(esperado);
  });

  it.each(['', 'abc', '0', '-5', '12,345', '1,2,3', '12e3'])('rechaza «%s»', (entrada) => {
    expect(eurosACentimos(entrada)).toBeNull();
  });

  it('un valor que no es texto no lanza', () => {
    expect(eurosACentimos(299)).toBeNull();
    expect(eurosACentimos(null)).toBeNull();
  });

  it('ida y vuelta con centimosATexto', () => {
    for (const c of [100, 29900, 29950, 5, 129905]) {
      expect(eurosACentimos(centimosATexto(c))).toBe(c);
    }
  });
});

describe('totalesDePagos', () => {
  it('separa lo cobrado de lo pendiente', () => {
    const t = totalesDePagos([
      PAGO,
      { ...PAGO, id: 'p2', amountCents: 10000, status: 'pending', paidOn: null },
      { ...PAGO, id: 'p3', amountCents: 5 },
    ]);
    expect(t).toEqual({ cobrado: 29905, pendiente: 10000, cobros: 3 });
  });

  it('suma en céntimos, sin errores de coma flotante', () => {
    const t = totalesDePagos([
      { ...PAGO, amountCents: 10 },
      { ...PAGO, id: 'b', amountCents: 20 },
    ]);
    expect(t.cobrado).toBe(30);
  });
});

describe('CSV', () => {
  it('neutraliza lo que Excel abriría como fórmula', () => {
    expect(celdaCsv('=SUMA(A1)')).toBe("'=SUMA(A1)");
    expect(celdaCsv('+34600')).toBe("'+34600");
    expect(celdaCsv('@usuario')).toBe("'@usuario");
  });

  it('entrecomilla lo que lleva separador, comillas o saltos', () => {
    expect(celdaCsv('a;b')).toBe('"a;b"');
    expect(celdaCsv('dijo "hola"')).toBe('"dijo ""hola"""');
    expect(celdaCsv('a\nb')).toBe('"a\nb"');
    expect(celdaCsv('normal')).toBe('normal');
  });

  it('lleva BOM, cabecera, coma decimal y un cobro por línea', () => {
    const csv = pagosACsv([PAGO, { ...PAGO, id: 'p2', amountCents: 29950 }], () => 'María', [
      'a',
      'b',
    ]);
    expect(csv.startsWith('﻿')).toBe(true);
    const lineas = csv.replace('﻿', '').trimEnd().split('\r\n');
    expect(lineas).toHaveLength(3);
    expect(lineas[0]).toBe('a;b');
    expect(lineas[1]).toBe('María;Plan básico;299,00;bizum;paid;2026-11-20;F-1;');
    expect(lineas[2]).toContain(';299,50;');
  });
});

describe('diaAFecha', () => {
  it('es el mismo día en cualquier zona', () => {
    const d = diaAFecha('2026-11-20');
    expect(d?.getFullYear()).toBe(2026);
    expect(d?.getMonth()).toBe(10);
    expect(d?.getDate()).toBe(20);
  });

  it('lo que no es una fecha es null', () => {
    expect(diaAFecha(null)).toBeNull();
    expect(diaAFecha('20/11/2026')).toBeNull();
  });
});

describe('resumenDePayload', () => {
  it('enseña los valores simples y omite los objetos', () => {
    expect(resumenDePayload({ de: 'draft', a: 'active', dentro: { x: 1 }, n: 3 })).toBe(
      'de: draft · a: active · n: 3',
    );
  });
});

describe('lectores', () => {
  it('un cobro sin id o sin boda no se lee', () => {
    expect(leerPago({ weddingId: 'w1' })).toBeNull();
    expect(leerPago({ id: 'p' })).toBeNull();
    expect(leerPago(null)).toBeNull();
  });

  it('un método o estado desconocido cae al más prudente', () => {
    const p = leerPago({ id: 'p', weddingId: 'w', method: 'bitcoin', status: 'cobrado' });
    expect(p?.method).toBe('otro');
    // Ante la duda no se cuenta como cobrado: es lo que menos promete.
    expect(p?.status).toBe('pending');
  });

  it('una ficha mínima se lee con todo lo demás por defecto', () => {
    const f = leerFicha({ weddingId: 'w1', status: 'rara' });
    expect(f).toMatchObject({
      weddingId: 'w1',
      status: 'draft',
      authDomain: 'pending',
      contactos: [],
      historial: [],
      pagos: [],
    });
    expect(leerFicha({})).toBeNull();
  });

  it('una ficha lee contactos e historial y descarta lo roto', () => {
    const f = leerFicha({
      weddingId: 'w1',
      contactos: [
        { uid: 'u1', email: 'a@b.c', lastSignIn: '2026-11-01T10:00:00Z' },
        { email: 'x' },
      ],
      historial: [{ id: 'h1', action: 'setWeddingStatus', at: 'no es fecha', payload: { a: 1 } }],
    });
    expect(f?.contactos).toHaveLength(1);
    expect(f?.contactos[0]?.lastSignIn).toBeInstanceOf(Date);
    expect(f?.historial[0]?.at).toBeNull();
  });

  it('las finanzas sin las dos listas no son una respuesta válida', () => {
    expect(leerFinanzas({ pagos: [] })).toBeNull();
    expect(leerFinanzas({ pagos: [], bodas: [], recortado: true })?.recortado).toBe(true);
  });

  it('los recordatorios descartan claves que no existen', () => {
    const r = leerRecordatorios({
      recordatorios: [
        { weddingId: 'w', key: 'encuesta', dueOn: '2026-01-01', situacion: 'vencido' },
        { weddingId: 'w', key: 'inventado', dueOn: '2026-01-01' },
      ],
    });
    expect(r).toHaveLength(1);
    expect(leerRecordatorios({})).toBeNull();
  });
});
