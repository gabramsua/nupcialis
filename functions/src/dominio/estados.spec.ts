import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  ESTADOS,
  esEstado,
  motivosParaNoPublicar,
  saltoPermitido,
  type EstadoBoda,
} from './estados';

const COMPLETA = {
  couple: { partnerA: 'María', partnerB: 'Gabriel' },
  weddingDate: new Date('2027-06-12T00:00:00.000Z'),
  slug: 'maria-y-gabriel',
};

describe('esEstado', () => {
  it('acepta los tres y rechaza cualquier otra cosa', () => {
    for (const estado of ESTADOS) expect(esEstado(estado)).toBe(true);
    for (const basura of ['activo', 'ACTIVE', '', null, undefined, 1, {}]) {
      expect(esEstado(basura)).toBe(false);
    }
  });
});

describe('saltoPermitido', () => {
  it('permite el camino normal: borrador, publicada, archivada', () => {
    expect(saltoPermitido('draft', 'active')).toBe(true);
    expect(saltoPermitido('active', 'archived')).toBe(true);
  });

  it('permite despublicar y reactivar', () => {
    expect(saltoPermitido('active', 'draft')).toBe(true);
    expect(saltoPermitido('archived', 'active')).toBe(true);
  });

  it('no permite volver de archivada a borrador', () => {
    // Documentado en `estados.ts`: se reactiva y se despublica, dos pasos
    // conscientes. Si esto pasa a true, que sea porque se decidió.
    expect(saltoPermitido('archived', 'draft')).toBe(false);
  });

  it('no permite quedarse donde ya está', () => {
    for (const estado of ESTADOS) {
      expect(saltoPermitido(estado, estado)).toBe(false);
    }
  });

  it('cubre todas las combinaciones sin lanzar', () => {
    for (const desde of ESTADOS) {
      for (const hasta of ESTADOS) {
        expect(typeof saltoPermitido(desde as EstadoBoda, hasta as EstadoBoda)).toBe('boolean');
      }
    }
  });
});

describe('motivosParaNoPublicar', () => {
  it('no pone pegas a una boda completa', () => {
    expect(motivosParaNoPublicar(COMPLETA)).toEqual([]);
  });

  it('exige los dos nombres, no solo uno', () => {
    expect(
      motivosParaNoPublicar({ ...COMPLETA, couple: { partnerA: 'María', partnerB: '' } }),
    ).toEqual(['sin-nombres']);
    expect(
      motivosParaNoPublicar({ ...COMPLETA, couple: { partnerA: '  ', partnerB: 'Gabriel' } }),
    ).toEqual(['sin-nombres']);
  });

  it('exige fecha y dirección', () => {
    expect(motivosParaNoPublicar({ ...COMPLETA, weddingDate: null })).toEqual(['sin-fecha']);
    expect(motivosParaNoPublicar({ ...COMPLETA, slug: '' })).toEqual(['sin-slug']);
  });

  it('devuelve todos los motivos de una vez, no el primero', () => {
    // Quien publica quiere saber de una vez todo lo que le falta.
    expect(motivosParaNoPublicar({})).toEqual(['sin-nombres', 'sin-fecha', 'sin-slug']);
  });

  it('impide el fallo del 2026-09-14: publicar una boda sin nombres', () => {
    // La proyección salió vacía y la portada enseñó un rombo y una inicial.
    const vacia = { couple: { partnerA: '', partnerB: '' }, weddingDate: null, slug: 'x' };
    expect(motivosParaNoPublicar(vacia)).toContain('sin-nombres');
  });
});

/**
 * La pantalla del superadmin no puede ofrecer un salto que esta tabla rechaza.
 *
 * Quien pulsara ese botón se comería un `failed-precondition` sin entender por
 * qué, y el botón no debería haber estado ahí. Se lee el fichero del cliente en
 * vez de copiar su tabla, que es la misma disciplina que en `slug.spec.ts`: una
 * copia que nadie compara deja de ser una copia en cuanto alguien toca una.
 */
describe('las acciones que ofrece el panel', () => {
  it('son todas saltos permitidos', () => {
    const cliente = readFileSync(
      new URL('../../../src/app/features/superadmin/bodas.ts', import.meta.url),
      'utf8',
    );

    const tabla = cliente.slice(
      cliente.indexOf('const ACCIONES'),
      cliente.indexOf('export function accionesDe'),
    );
    expect(tabla, 'no se encontró la tabla ACCIONES en el cliente').not.toBe('');

    const saltos = [...tabla.matchAll(/destino: '(draft|active|archived)'/g)];
    expect(saltos.length, 'el cliente no declara ninguna acción').toBeGreaterThan(0);

    let estado: EstadoBoda = 'draft';
    for (const linea of tabla.split('\n')) {
      const cabecera = /^\s{2}(draft|active|archived):/.exec(linea);
      if (cabecera) estado = cabecera[1] as EstadoBoda;

      const destino = /destino: '(draft|active|archived)'/.exec(linea);
      if (!destino) continue;

      expect(
        saltoPermitido(estado, destino[1] as EstadoBoda),
        `el panel ofrece ${estado} → ${destino[1]}, que el servidor rechaza`,
      ).toBe(true);
    }
  });
});
