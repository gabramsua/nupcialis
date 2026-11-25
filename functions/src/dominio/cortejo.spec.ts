import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { MAX_BIO, MAX_PAPEL, MAX_PERSONAS, sanearCortejo } from './cortejo';

const MARCA = '// === COPIA LITERAL';

function cuerpo(ruta: string): string {
  const texto = readFileSync(new URL(ruta, import.meta.url), 'utf8');
  const inicio = texto.indexOf(MARCA);
  expect(inicio, `no se encontró "${MARCA}" en ${ruta}`).toBeGreaterThanOrEqual(0);
  return texto.slice(inicio);
}

describe('copia del cortejo', () => {
  it('es idéntica a la del cliente', () => {
    expect(cuerpo('./cortejo.ts')).toBe(
      cuerpo('../../../src/app/features/public-site/cortejo/cortejo.ts'),
    );
  });
});

const persona = (parcial: Record<string, unknown> = {}) => ({
  id: 'p1',
  displayName: 'Carmen Ruiz',
  role: 'Madrina',
  side: 'A',
  bio: '',
  photoUrl: null,
  photoConsent: false,
  visibleToGuests: true,
  order: 1,
  ...parcial,
});

describe('sanearCortejo', () => {
  it('aguanta cualquier basura sin lanzar', () => {
    for (const basura of [null, undefined, 42, 'texto', {}, [null, 1, 'x', []]]) {
      expect(sanearCortejo(basura)).toEqual([]);
    }
  });

  it('descarta a quien no tiene nombre, papel o id, o no es visible', () => {
    expect(
      sanearCortejo([
        persona({ displayName: '  ' }),
        persona({ id: 'a', role: '' }),
        persona({ id: '' }),
        persona({ id: 'b', visibleToGuests: false }),
        persona({ id: 'c' }),
      ]).map((p) => p.id),
    ).toEqual(['c']);
  });

  it('un lado raro cae a «los dos»', () => {
    expect(sanearCortejo([persona({ side: 'C' })])[0]?.side).toBe('both');
  });

  it('recorta los textos largos', () => {
    const [p] = sanearCortejo([persona({ role: 'x'.repeat(500), bio: 'y'.repeat(2000) })]);
    expect(p?.role).toHaveLength(MAX_PAPEL);
    expect(p?.bio).toHaveLength(MAX_BIO);
  });

  it('ordena por el orden de la pareja y publica como mucho MAX_PERSONAS', () => {
    const muchas = Array.from({ length: MAX_PERSONAS + 10 }, (_, i) =>
      persona({ id: `p${String(i).padStart(3, '0')}`, order: MAX_PERSONAS + 10 - i }),
    );
    const salida = sanearCortejo(muchas);
    expect(salida).toHaveLength(MAX_PERSONAS);
    expect(salida[0]?.order).toBeLessThanOrEqual(salida[1]!.order);
  });

  it('no copia nada que no esté en la lista blanca', () => {
    const [p] = sanearCortejo([persona({ phone: '600', guestId: 'g', secreto: 'x' })]);
    expect(Object.keys(p!).sort()).toEqual(
      ['bio', 'id', 'name', 'order', 'photoUrl', 'role', 'side'].sort(),
    );
  });
});
