import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  CLAVES_HISTORIA,
  FOTOS_POR_APARTADO,
  esUrlDeFoto,
  historiaConContenido,
  sanearHistoria,
} from './historia';
import { tieneContenido } from './html';

const MARCA = '// === COPIA LITERAL';

function cuerpo(ruta: string): string {
  const texto = readFileSync(new URL(ruta, import.meta.url), 'utf8');
  const inicio = texto.indexOf(MARCA);
  expect(inicio, `no se encontró "${MARCA}" en ${ruta}`).toBeGreaterThanOrEqual(0);
  return texto.slice(inicio);
}

const URL_OK =
  'https://firebasestorage.googleapis.com/v0/b/x/o/weddings%2Fw1%2Fstory%2F1.jpg?alt=media';
const RUTA_OK = 'weddings/w1/story/1.jpg';

describe('copia de «Nuestra historia»', () => {
  it('es idéntica a la del cliente', () => {
    expect(cuerpo('./historia.ts')).toBe(
      cuerpo('../../../src/app/features/public-site/historia/historia.ts'),
    );
  });
});

describe('sanearHistoria', () => {
  it('devuelve siempre los cinco apartados, en su orden, aunque no haya nada', () => {
    for (const entrada of [undefined, null, 'basura', [], 42, {}]) {
      const r = sanearHistoria(entrada);
      expect(r.map((a) => a.clave)).toEqual([...CLAVES_HISTORIA]);
      expect(r.every((a) => a.html === '' && a.fotos.length === 0)).toBe(true);
    }
    expect(CLAVES_HISTORIA).toEqual(['conocemos', 'beso', 'recuerdo', 'viaje', 'pedida']);
  });

  it('conserva el texto y las fotos de cada apartado', () => {
    const r = sanearHistoria({
      beso: { html: '<p>Fue en Lisboa</p>', fotos: [{ url: URL_OK, path: RUTA_OK }] },
    });
    expect(r[1]).toEqual({
      clave: 'beso',
      html: '<p>Fue en Lisboa</p>',
      fotos: [{ url: URL_OK, path: RUTA_OK }],
    });
  });

  it('solo admite hasta dos fotos y solo de Storage', () => {
    const r = sanearHistoria({
      conocemos: {
        fotos: [
          { url: 'javascript:alert(1)', path: RUTA_OK },
          { url: 'http://firebasestorage.googleapis.com/x', path: RUTA_OK },
          { url: 'https://evil.example.com/foto.jpg', path: RUTA_OK },
          { url: URL_OK, path: RUTA_OK },
          { url: URL_OK + '2', path: RUTA_OK },
          { url: URL_OK + '3', path: RUTA_OK },
          null,
        ],
      },
    });
    expect(r[0]?.fotos).toHaveLength(FOTOS_POR_APARTADO);
    expect(r[0]?.fotos.every((f) => esUrlDeFoto(f.url))).toBe(true);
  });

  it('una ruta que no es de la historia se queda vacía, pero la foto se ve', () => {
    const r = sanearHistoria({
      viaje: { fotos: [{ url: URL_OK, path: '../../otra-boda/secreto.jpg' }] },
    });
    expect(r[3]?.fotos).toEqual([{ url: URL_OK, path: '' }]);
  });

  it('ignora apartados que no existen', () => {
    const r = sanearHistoria({ inventado: { html: 'x' } });
    expect(r).toHaveLength(5);
  });
});

describe('historiaConContenido', () => {
  it('un editor vacío no cuenta, una foto sola sí', () => {
    const vacia = sanearHistoria({ beso: { html: '<p><br></p>' } });
    expect(historiaConContenido(vacia, tieneContenido)).toBe(false);
    const conFoto = sanearHistoria({ beso: { fotos: [{ url: URL_OK, path: RUTA_OK }] } });
    expect(historiaConContenido(conFoto, tieneContenido)).toBe(true);
    const conTexto = sanearHistoria({ pedida: { html: '<p>Dijo que sí</p>' } });
    expect(historiaConContenido(conTexto, tieneContenido)).toBe(true);
  });
});
