import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  MAX_LUGAR_RUTA,
  MAX_RUTAS,
  horaDeAutobus,
  sanearAutobuses,
  tieneAutobuses,
} from './autobuses';

const MARCA = '// === COPIA LITERAL';

function cuerpo(ruta: string): string {
  const texto = readFileSync(new URL(ruta, import.meta.url), 'utf8');
  const inicio = texto.indexOf(MARCA);
  expect(inicio, `no se encontró "${MARCA}" en ${ruta}`).toBeGreaterThanOrEqual(0);
  return texto.slice(inicio);
}

describe('copia de los autobuses', () => {
  it('es idéntica a la del cliente', () => {
    expect(cuerpo('./autobuses.ts')).toBe(
      cuerpo('../../../src/app/features/public-site/autobuses/autobuses.ts'),
    );
  });
});

const RUTA = { id: 'r1', sentido: 'ida', salida: 'Plaza Mayor', destino: 'Finca', hora: '17:30' };

describe('horaDeAutobus', () => {
  it('normaliza las horas buenas y descarta las raras', () => {
    expect(horaDeAutobus('9:05')).toBe('09:05');
    expect(horaDeAutobus(' 17:30 ')).toBe('17:30');
    expect(horaDeAutobus('24:00')).toBe('');
    expect(horaDeAutobus('12:60')).toBe('');
    expect(horaDeAutobus('por la tarde')).toBe('');
    expect(horaDeAutobus(null)).toBe('');
  });
});

describe('sanearAutobuses', () => {
  it('lo que no es una lista no publica nada', () => {
    for (const malo of [null, undefined, 'x', 5, {}]) {
      expect(sanearAutobuses(malo)).toEqual([]);
    }
  });

  it('una ruta sin salida, sin destino o sin id no es una ruta', () => {
    const salida = sanearAutobuses([
      { ...RUTA, id: '' },
      { ...RUTA, id: 'a', salida: '  ' },
      { ...RUTA, id: 'b', destino: '' },
      null,
      'texto',
      RUTA,
    ]);
    expect(salida.map((r) => r.id)).toEqual(['r1']);
  });

  it('deja solo los campos de la lista blanca, limpios y con tope', () => {
    const [ruta] = sanearAutobuses([
      {
        ...RUTA,
        salida: ' ' + 'x'.repeat(MAX_LUGAR_RUTA + 50),
        nombre: 'Bus 1',
        nota: 'Con aire',
        secreto: 'no',
        __proto__: { admin: true },
      },
    ]);
    expect(Object.keys(ruta ?? {}).sort()).toEqual([
      'destino',
      'hora',
      'id',
      'nombre',
      'nota',
      'salida',
      'sentido',
    ]);
    expect(ruta?.salida).toHaveLength(MAX_LUGAR_RUTA);
  });

  it('un sentido desconocido se queda en ida; una hora rara, en vacío', () => {
    const [ruta] = sanearAutobuses([{ ...RUTA, sentido: 'diagonal', hora: '99:99' }]);
    expect(ruta?.sentido).toBe('ida');
    expect(ruta?.hora).toBe('');
  });

  it('descarta los ids repetidos', () => {
    expect(sanearAutobuses([RUTA, { ...RUTA, salida: 'Otra' }])).toHaveLength(1);
  });

  it('ordena: primero las de ida, por hora, y las que no tienen hora al final', () => {
    const salida = sanearAutobuses([
      { ...RUTA, id: 'v', sentido: 'vuelta', hora: '01:00' },
      { ...RUTA, id: 'sin', hora: '' },
      { ...RUTA, id: 'tarde', hora: '18:00' },
      { ...RUTA, id: 'pronto', hora: '16:45' },
    ]);
    expect(salida.map((r) => r.id)).toEqual(['pronto', 'tarde', 'sin', 'v']);
  });

  it('respeta el tope de rutas', () => {
    const muchas = Array.from({ length: MAX_RUTAS + 5 }, (_, i) => ({ ...RUTA, id: `r${i}` }));
    expect(sanearAutobuses(muchas)).toHaveLength(MAX_RUTAS);
  });

  it('tieneAutobuses distingue vacío de con rutas', () => {
    expect(tieneAutobuses([])).toBe(false);
    expect(tieneAutobuses(sanearAutobuses([RUTA]))).toBe(true);
  });
});
