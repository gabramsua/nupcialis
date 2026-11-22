import { describe, expect, it } from 'vitest';

import {
  DIAS_DE_AVISO,
  DIAS_HASTA_RECORDATORIO,
  calcularRecordatorios,
  claveDeMarca,
  esFechaISO,
  sumarDias,
  validarPago,
} from './superadmin';

const BASE = {
  weddingId: 'w1',
  amountCents: 29900,
  concept: 'Plan básico',
  method: 'bizum',
  status: 'paid',
  paidOn: '2026-11-20',
  invoiceNumber: 'F-2026-001',
  notes: '',
};

describe('validarPago', () => {
  it('acepta un cobro completo', () => {
    const r = validarPago(BASE);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.pago.amountCents).toBe(29900);
  });

  it.each([
    ['importe en euros con decimales', { amountCents: 299.5 }, 'importe'],
    ['importe cero', { amountCents: 0 }, 'importe'],
    ['importe negativo', { amountCents: -100 }, 'importe'],
    ['importe de texto', { amountCents: '299' }, 'importe'],
    ['importe desorbitado', { amountCents: 10_000_001 }, 'importe'],
    ['sin boda', { weddingId: '' }, 'boda'],
    ['boda con barra', { weddingId: 'a/b' }, 'boda'],
    ['sin concepto', { concept: '  ' }, 'concepto'],
    ['concepto largo', { concept: 'x'.repeat(121) }, 'concepto'],
    ['método inventado', { method: 'bitcoin' }, 'metodo'],
    ['estado inventado', { status: 'cobrado' }, 'estado'],
    ['cobrado sin fecha', { paidOn: null }, 'fecha'],
    ['fecha imposible', { paidOn: '2026-02-30' }, 'fecha'],
    ['pendiente con fecha', { status: 'pending' }, 'fecha'],
    ['factura larga', { invoiceNumber: 'F'.repeat(41) }, 'factura'],
    ['notas largas', { notes: 'n'.repeat(501) }, 'notas'],
  ])('rechaza %s', (_nombre, cambio, motivo) => {
    expect(validarPago({ ...BASE, ...cambio })).toEqual({ ok: false, motivo });
  });

  it('un cobro pendiente guarda la fecha como null', () => {
    const r = validarPago({ ...BASE, status: 'pending', paidOn: null });
    expect(r.ok && r.pago.paidOn).toBe(null);
  });

  it('ignora campos que no son suyos', () => {
    const r = validarPago({ ...BASE, createdAt: 'x', extra: 1 });
    expect(r.ok && Object.keys(r.pago).sort()).toEqual(
      [
        'amountCents',
        'concept',
        'invoiceNumber',
        'method',
        'notes',
        'paidOn',
        'status',
        'weddingId',
      ].sort(),
    );
  });

  it('un valor que no es objeto no lanza', () => {
    expect(validarPago(null).ok).toBe(false);
    expect(validarPago('x').ok).toBe(false);
  });
});

describe('esFechaISO / sumarDias', () => {
  it('distingue fechas reales', () => {
    expect(esFechaISO('2028-02-29')).toBe(true);
    expect(esFechaISO('2026-02-29')).toBe(false);
    expect(esFechaISO('20/11/2026')).toBe(false);
  });

  it('suma días cruzando mes y año', () => {
    expect(sumarDias('2026-12-20', 60)).toBe('2027-02-18');
  });
});

describe('calcularRecordatorios', () => {
  const boda = (weddingId: string, weddingDay: string | null, status = 'active') => ({
    weddingId,
    status,
    weddingDay,
  });

  it('una boda de hace 60 días tiene los cuatro vencidos hoy', () => {
    const r = calcularRecordatorios([boda('w1', '2026-09-21')], new Set(), '2026-11-20');
    expect(sumarDias('2026-09-21', DIAS_HASTA_RECORDATORIO)).toBe('2026-11-20');
    expect(r.map((x) => [x.key, x.situacion])).toEqual([
      ['agradecimiento', 'vencido'],
      ['encuesta', 'vencido'],
      ['cierre-pareja', 'vencido'],
      ['cierre-superadmin', 'vencido'],
    ]);
  });

  it('distingue a quién va cada aviso', () => {
    const r = calcularRecordatorios([boda('w1', '2026-09-21')], new Set(), '2026-11-20');
    expect(r.filter((x) => x.destino === 'superadmin').map((x) => x.key)).toEqual([
      'cierre-superadmin',
    ]);
  });

  it('lo que falta poco sale como próximo, lo lejano no sale', () => {
    const proximo = calcularRecordatorios([boda('w1', '2026-09-30')], new Set(), '2026-11-20');
    expect(proximo.every((x) => x.situacion === 'proximo')).toBe(true);

    const lejano = calcularRecordatorios([boda('w1', '2027-06-01')], new Set(), '2026-11-20');
    expect(lejano).toEqual([]);
    expect(DIAS_DE_AVISO).toBe(14);
  });

  it('lo enviado se queda en la lista, al final', () => {
    const r = calcularRecordatorios(
      [boda('w1', '2026-08-01')],
      new Set([claveDeMarca('w1', 'encuesta')]),
      '2026-11-20',
    );
    expect(r.at(-1)).toMatchObject({ key: 'encuesta', situacion: 'enviado' });
    expect(r.filter((x) => x.situacion === 'vencido')).toHaveLength(3);
  });

  it('borradores, archivadas y sin fecha no generan nada', () => {
    const r = calcularRecordatorios(
      [boda('a', '2026-01-01', 'draft'), boda('b', '2026-01-01', 'archived'), boda('c', null)],
      new Set(),
      '2026-11-20',
    );
    expect(r).toEqual([]);
  });

  it('ordena lo vencido por fecha y luego por boda', () => {
    const r = calcularRecordatorios(
      [boda('z', '2026-06-01'), boda('a', '2026-07-01')],
      new Set(),
      '2026-11-20',
    );
    expect(r[0]?.weddingId).toBe('z');
    expect(r.at(-1)?.weddingId).toBe('a');
  });
});
