import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  MAX_UBICACIONES,
  TIPOS_UBICACION,
  contarPorTipo,
  coordenadasValidas,
  enlaceDeGoogleMaps,
  enlaceParaLlegar,
  horaDelSitio,
  sanearUbicaciones,
} from './ubicaciones';

const MARCA = '// === COPIA LITERAL';

function cuerpo(ruta: string): string {
  const texto = readFileSync(new URL(ruta, import.meta.url), 'utf8');
  const inicio = texto.indexOf(MARCA);
  expect(inicio, `no se encontró "${MARCA}" en ${ruta}`).toBeGreaterThanOrEqual(0);
  return texto.slice(inicio);
}

describe('copia de las ubicaciones', () => {
  it('es idéntica a la del cliente', () => {
    expect(cuerpo('./ubicaciones.ts')).toBe(
      cuerpo('../../../src/app/features/public-site/mapa/ubicaciones.ts'),
    );
  });
});

const IGLESIA = {
  id: 'iglesia',
  type: 'ceremonia',
  name: 'Iglesia de San Pedro',
  address: 'Plaza Mayor, 1',
  coords: { lat: 40.41683, lng: -3.70379 },
  description: 'Hay un aparcamiento a cien metros.',
  time: '17:30',
  order: 1,
  visibleToGuests: true,
};

describe('coordenadasValidas', () => {
  it.each([
    [40.4, -3.7, true],
    [-33.9, 151.2, true],
    [90, 180, true],
    [0, 0, false],
    [91, 0, false],
    [0, 181, false],
    [Number.NaN, 1, false],
    [Infinity, 1, false],
    ['40.4', -3.7, false],
    [null, null, false],
  ])('(%s, %s) → %s', (lat, lng, esperado) => {
    expect(coordenadasValidas(lat, lng)).toBe(esperado);
  });
});

describe('horaDelSitio', () => {
  it('acepta HH:mm y nada más', () => {
    expect(horaDelSitio('17:30')).toBe('17:30');
    expect(horaDelSitio(' 09:05 ')).toBe('09:05');
    expect(horaDelSitio('24:00')).toBeNull();
    expect(horaDelSitio('9:05')).toBeNull();
    expect(horaDelSitio('las cinco')).toBeNull();
    expect(horaDelSitio(1730)).toBeNull();
  });
});

describe('sanearUbicaciones', () => {
  it('publica una ficha completa con sus coordenadas', () => {
    expect(sanearUbicaciones([IGLESIA])).toEqual([
      {
        id: 'iglesia',
        type: 'ceremonia',
        name: 'Iglesia de San Pedro',
        address: 'Plaza Mayor, 1',
        lat: 40.41683,
        lng: -3.70379,
        description: 'Hay un aparcamiento a cien metros.',
        time: '17:30',
        order: 1,
      },
    ]);
  });

  it('se cae lo que la pareja marcó como no visible', () => {
    // Es lo que impide publicar, por ejemplo, dónde aparcan los proveedores.
    expect(sanearUbicaciones([{ ...IGLESIA, visibleToGuests: false }])).toEqual([]);
  });

  it('se cae lo que no tiene nombre ni coordenadas de verdad', () => {
    expect(sanearUbicaciones([{ ...IGLESIA, name: '  ' }])).toEqual([]);
    expect(sanearUbicaciones([{ ...IGLESIA, coords: { lat: 0, lng: 0 } }])).toEqual([]);
    expect(sanearUbicaciones([{ ...IGLESIA, coords: undefined }])).toEqual([]);
    expect(sanearUbicaciones([{ ...IGLESIA, coords: { lat: 'x', lng: 1 } }])).toEqual([]);
  });

  it('un tipo desconocido es «otro» y una hora rota es «sin hora»', () => {
    const [u] = sanearUbicaciones([{ ...IGLESIA, type: 'castillo', time: '25:99' }]);

    expect(u?.type).toBe('otro');
    expect(u?.time).toBeNull();
  });

  it('no repite identificadores y nunca lanza con basura', () => {
    expect(sanearUbicaciones([IGLESIA, IGLESIA])).toHaveLength(1);
    expect(sanearUbicaciones(null)).toEqual([]);
    expect(sanearUbicaciones('hola')).toEqual([]);
    expect(sanearUbicaciones([null, 3, 'x', {}])).toEqual([]);
  });

  it('redondea a cinco decimales y recorta los textos largos', () => {
    const [u] = sanearUbicaciones([
      { ...IGLESIA, coords: { lat: 40.123456789, lng: -3.987654321 }, name: 'x'.repeat(500) },
    ]);

    expect(u?.lat).toBe(40.12346);
    expect(u?.lng).toBe(-3.98765);
    expect(u?.name).toHaveLength(80);
  });

  it('va por el orden de la pareja y, a igualdad, por hora', () => {
    const lista = sanearUbicaciones([
      { ...IGLESIA, id: 'c', order: 2, time: null },
      { ...IGLESIA, id: 'b', order: 1, time: '19:00' },
      { ...IGLESIA, id: 'a', order: 1, time: '17:00' },
    ]);

    expect(lista.map((u) => u.id)).toEqual(['a', 'b', 'c']);
  });

  it('no publica más de las que caben', () => {
    const muchas = Array.from({ length: MAX_UBICACIONES + 10 }, (_, i) => ({
      ...IGLESIA,
      id: `u${i}`,
      order: i,
    }));

    expect(sanearUbicaciones(muchas)).toHaveLength(MAX_UBICACIONES);
  });
});

describe('sanearUbicaciones es idempotente', () => {
  /**
   * El servidor publica la lista saneada (con `lat`, `lng` planos) y el
   * navegador la vuelve a sanear al leerla. Si el saneador solo entendiera
   * `coords`, la web pública tiraba todos los sitios: «Todavía no hay sitios».
   */
  it('lo ya publicado sobrevive a una segunda pasada', () => {
    const publicado = sanearUbicaciones([
      {
        id: 'boda',
        type: 'ceremonia',
        name: 'Boda',
        address: 'Castillo de San Marcos',
        coords: { lat: 36.5964, lng: -6.2318 },
        time: '12:00',
        order: 1,
        visibleToGuests: true,
      },
    ]);
    expect(publicado).toHaveLength(1);
    expect(sanearUbicaciones(publicado)).toEqual(publicado);
  });

  it('un sitio sin pin sigue cayendo, venga como `coords: null` o sin coordenadas', () => {
    expect(sanearUbicaciones([{ id: 'a', name: 'A', coords: null }])).toEqual([]);
    expect(sanearUbicaciones([{ id: 'a', name: 'A' }])).toEqual([]);
    expect(sanearUbicaciones([{ id: 'a', name: 'A', lat: 0, lng: 0 }])).toEqual([]);
  });
});

describe('los enlaces a Google Maps', () => {
  const sitio = { lat: 40.41683, lng: -3.70379 };

  it('abrir el sitio y cómo llegar llevan las coordenadas, sin clave', () => {
    expect(enlaceDeGoogleMaps(sitio)).toBe(
      'https://www.google.com/maps/search/?api=1&query=40.41683,-3.70379',
    );
    expect(enlaceParaLlegar(sitio)).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=40.41683,-3.70379',
    );
  });
});

describe('contarPorTipo', () => {
  it('cuenta lo que hay y calla lo que no', () => {
    const lista = sanearUbicaciones([
      IGLESIA,
      { ...IGLESIA, id: 'b', type: 'parking' },
      { ...IGLESIA, id: 'c', type: 'parking' },
    ]);

    expect(contarPorTipo(lista)).toEqual([
      { type: 'ceremonia', cuantas: 1 },
      { type: 'parking', cuantas: 2 },
    ]);
    expect(TIPOS_UBICACION).toContain('banquete');
  });
});
