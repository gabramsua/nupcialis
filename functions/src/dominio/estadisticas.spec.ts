import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  MAX_TOPE_FOTOS,
  MEGAS_POR_FOTO,
  MIN_TOPE_FOTOS,
  leerEstadisticas,
  resumir,
  usoDeFotos,
  validarTopeDeFotos,
  type FilaDeBoda,
} from './estadisticas';

const MARCA = '// === COPIA LITERAL';

function cuerpo(ruta: string): string {
  const texto = readFileSync(new URL(ruta, import.meta.url), 'utf8');
  const inicio = texto.indexOf(MARCA);
  expect(inicio, `no se encontró "${MARCA}" en ${ruta}`).toBeGreaterThanOrEqual(0);
  return texto.slice(inicio);
}

describe('copia de las estadísticas', () => {
  it('es idéntica a la del cliente', () => {
    expect(cuerpo('./estadisticas.ts')).toBe(
      cuerpo('../../../src/app/features/superadmin/estadisticas/estadisticas.ts'),
    );
  });
});

function fila(parcial: Partial<FilaDeBoda> & { weddingId: string }): FilaDeBoda {
  return {
    slug: parcial.weddingId,
    status: 'active',
    plan: 'basic',
    invitados: 0,
    confirmados: 0,
    fotos: 0,
    tope: 500,
    topeEsPropio: false,
    partidasQuiz: 0,
    accesos: 0,
    creadaEn: null,
    ...parcial,
  };
}

describe('resumir', () => {
  const ahora = new Date('2026-11-17T10:00:00Z');

  it('cuenta las bodas por estado', () => {
    const r = resumir(
      [
        fila({ weddingId: 'a', status: 'active' }),
        fila({ weddingId: 'b', status: 'active' }),
        fila({ weddingId: 'c', status: 'draft' }),
        fila({ weddingId: 'd', status: 'archived' }),
      ],
      ahora,
    );
    expect([r.bodasActivas, r.bodasBorrador, r.bodasArchivadas]).toEqual([2, 1, 1]);
  });

  it('las altas del mes son las del mes natural en UTC', () => {
    const r = resumir(
      [
        fila({ weddingId: 'a', creadaEn: '2026-11-01T00:10:00.000Z' }),
        fila({ weddingId: 'b', creadaEn: '2026-10-31T23:59:00.000Z' }),
        fila({ weddingId: 'c', creadaEn: null }),
      ],
      ahora,
    );
    expect(r.altasDelMes).toBe(1);
  });

  it('suma y estima el almacenamiento', () => {
    const r = resumir(
      [
        fila({ weddingId: 'a', fotos: 100, invitados: 10, partidasQuiz: 3, accesos: 7 }),
        fila({ weddingId: 'b', fotos: 50, invitados: 5, partidasQuiz: 1, accesos: 2 }),
      ],
      ahora,
    );
    expect(r.fotos).toBe(150);
    expect(r.almacenamientoMB).toBeCloseTo(150 * MEGAS_POR_FOTO, 5);
    expect([r.invitados, r.partidasQuiz, r.accesosInvitados]).toEqual([15, 4, 9]);
  });

  it('sin bodas, todo a cero', () => {
    const r = resumir([], ahora);
    expect(r.fotos).toBe(0);
    expect(r.almacenamientoMB).toBe(0);
  });
});

describe('usoDeFotos', () => {
  it('ok por debajo del 80 %', () => {
    expect(usoDeFotos(100, 500)).toEqual({ porcentaje: 20, nivel: 'ok' });
  });
  it('cerca desde el 80 %', () => {
    expect(usoDeFotos(400, 500)).toEqual({ porcentaje: 80, nivel: 'cerca' });
  });
  it('llena al llegar al tope, y nunca pasa del 100 %', () => {
    expect(usoDeFotos(500, 500)).toEqual({ porcentaje: 100, nivel: 'llena' });
    expect(usoDeFotos(600, 500).porcentaje).toBe(100);
  });
  it('un tope de cero cuenta como llena y no divide', () => {
    expect(usoDeFotos(0, 0).nivel).toBe('llena');
  });
});

describe('validarTopeDeFotos', () => {
  it('acepta enteros en rango', () => {
    expect(validarTopeDeFotos(MIN_TOPE_FOTOS)).toEqual({ ok: true, valor: MIN_TOPE_FOTOS });
    expect(validarTopeDeFotos(MAX_TOPE_FOTOS)).toEqual({ ok: true, valor: MAX_TOPE_FOTOS });
  });
  it('null es volver al tope por defecto', () => {
    expect(validarTopeDeFotos(null)).toEqual({ ok: true, valor: null });
  });
  it.each([0, -3, MAX_TOPE_FOTOS + 1, 1.5, NaN, Infinity, '500', undefined, {}, true])(
    'rechaza %s',
    (valor) => {
      expect(validarTopeDeFotos(valor).ok).toBe(false);
    },
  );
});

describe('leerEstadisticas', () => {
  it('rechaza lo que no es un objeto con bodas', () => {
    expect(leerEstadisticas(null)).toBeNull();
    expect(leerEstadisticas('x')).toBeNull();
    expect(leerEstadisticas({})).toBeNull();
  });

  it('sanea filas rotas, repetidas y estados raros', () => {
    const r = leerEstadisticas({
      bodas: [
        { weddingId: 'a', slug: 'ana', status: 'raro', fotos: -4, tope: 0, topeEsPropio: true },
        { weddingId: 'a', slug: 'duplicada' },
        { weddingId: '' },
        null,
        {
          weddingId: 'b',
          status: 'active',
          fotos: 12.9,
          tope: 300,
          creadaEn: '2026-11-01T00:00:00Z',
        },
      ],
      recortado: true,
    });
    expect(r?.bodas.map((b) => b.weddingId)).toEqual(['a', 'b']);
    expect(r?.bodas[0]).toMatchObject({ status: 'draft', fotos: 0, tope: 1, topeEsPropio: true });
    expect(r?.bodas[1]?.fotos).toBe(12);
    expect(r?.recortado).toBe(true);
    expect(r?.resumen.fotos).toBe(12);
  });
});
