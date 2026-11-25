import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  ALBUMES,
  MAX_BYTES,
  MAX_PIE,
  TIPOS_PERMITIDOS,
  albumDe,
  bytesDeBase64,
  esAlbum,
  esTipoPermitido,
  extensionDe,
  puedeBorrar,
  sanearFotos,
  sanearPie,
} from './galeria';

const MARCA = '// === COPIA LITERAL';

function cuerpo(ruta: string): string {
  const texto = readFileSync(new URL(ruta, import.meta.url), 'utf8');
  const inicio = texto.indexOf(MARCA);
  expect(inicio, `no se encontró "${MARCA}" en ${ruta}`).toBeGreaterThanOrEqual(0);
  return texto.slice(inicio);
}

describe('copia de la galería', () => {
  it('es idéntica a la del cliente', () => {
    expect(cuerpo('./galeria.ts')).toBe(
      cuerpo('../../../src/app/features/public-site/galeria/galeria.ts'),
    );
  });
});

describe('los tipos que se admiten', () => {
  it('son los que el navegador sabe reducir en un canvas', () => {
    expect([...TIPOS_PERMITIDOS]).toEqual(['image/jpeg', 'image/png', 'image/webp']);
  });

  /** El móvil lo convierte a JPEG antes de mandarlo, así que nunca llega. */
  it('no admite HEIC ni cualquier otra cosa', () => {
    expect(esTipoPermitido('image/heic')).toBe(false);
    expect(esTipoPermitido('application/pdf')).toBe(false);
    expect(esTipoPermitido('')).toBe(false);
    expect(esTipoPermitido(42)).toBe(false);
  });

  it('da la extensión que le toca a cada uno', () => {
    expect(extensionDe('image/png')).toBe('png');
    expect(extensionDe('image/webp')).toBe('webp');
    expect(extensionDe('image/jpeg')).toBe('jpg');
    expect(extensionDe('lo que sea')).toBe('jpg');
  });
});

/**
 * Medir el base64 **por su longitud** es lo que evita reservar cien megas de
 * memoria en la función para luego decir que pesa demasiado.
 */
describe('bytesDeBase64', () => {
  it('calcula el tamaño sin convertir nada', () => {
    expect(bytesDeBase64('')).toBe(0);
    expect(bytesDeBase64(Buffer.from('hola').toString('base64'))).toBe(4);
    expect(bytesDeBase64(Buffer.alloc(1000).toString('base64'))).toBe(1000);
  });

  it('una cadena enorme se pasa del tope', () => {
    const enorme = 'A'.repeat(Math.ceil((MAX_BYTES * 4) / 3) + 100);
    expect(bytesDeBase64(enorme)).toBeGreaterThan(MAX_BYTES);
  });
});

describe('sanearFotos', () => {
  const foto = {
    id: 'f1',
    url: 'https://example.com/f1.jpg',
    urlMiniatura: 'https://example.com/f1-thumb.jpg',
    guestId: 'g1',
    autor: 'Ana',
    pie: 'Qué guapos',
    album: 'camino',
    creadoEn: '2027-06-12T18:00:00.000Z',
  };

  it('deja pasar una foto entera', () => {
    expect(sanearFotos([foto])).toEqual([foto]);
  });

  /** Pasa si la subida se quedó a medias: documento sin fichero detrás. */
  it('tira una foto sin URL, que no es una foto', () => {
    expect(sanearFotos([{ ...foto, url: '' }])).toEqual([]);
    expect(sanearFotos([{ ...foto, id: '' }])).toEqual([]);
  });

  it('sin miniatura, usa la grande', () => {
    expect(sanearFotos([{ ...foto, urlMiniatura: '' }])[0]?.urlMiniatura).toBe(foto.url);
  });

  it('no repite ni se cae con basura', () => {
    expect(sanearFotos([foto, foto, null, 42, 'foto'])).toHaveLength(1);
    expect(sanearFotos('fotos')).toEqual([]);
  });

  it('acota el pie de foto', () => {
    expect(sanearPie('x'.repeat(500))).toHaveLength(MAX_PIE);
    expect(sanearPie('  dos   espacios  ')).toBe('dos espacios');
    expect(sanearPie(42)).toBe('');
  });
});

/** La suya, y la pareja cualquiera. */
describe('puedeBorrar', () => {
  const foto = { guestId: 'g1' };

  it('el invitado borra la suya', () => {
    expect(puedeBorrar(foto, { guestId: 'g1', esPareja: false })).toBe(true);
  });

  it('y no la de otro', () => {
    expect(puedeBorrar(foto, { guestId: 'g2', esPareja: false })).toBe(false);
  });

  it('la pareja borra cualquiera, que es su boda', () => {
    expect(puedeBorrar(foto, { guestId: null, esPareja: true })).toBe(true);
  });

  it('sin sesión, ninguna', () => {
    expect(puedeBorrar(foto, { guestId: null, esPareja: false })).toBe(false);
  });
});

describe('los álbumes', () => {
  it('son dos: el día y el camino de la pareja', () => {
    expect([...ALBUMES]).toEqual(['dia', 'camino']);
  });

  it('esAlbum solo admite los que existen', () => {
    expect(esAlbum('dia')).toBe(true);
    expect(esAlbum('camino')).toBe(true);
    expect(esAlbum('historia')).toBe(false);
    expect(esAlbum(undefined)).toBe(false);
  });

  /** Las fotos de antes de los álbumes no tienen el campo: son del día. */
  it('una foto sin álbum, o con uno raro, es del día', () => {
    expect(albumDe(undefined)).toBe('dia');
    expect(albumDe('otro')).toBe('dia');
    expect(albumDe('camino')).toBe('camino');
  });

  it('sanearFotos conserva el álbum y pone «dia» si falta', () => {
    const fotos = sanearFotos([
      { id: 'a', url: 'u1', album: 'camino' },
      { id: 'b', url: 'u2' },
    ]);
    expect(fotos.map((f) => f.album)).toEqual(['camino', 'dia']);
  });
});
