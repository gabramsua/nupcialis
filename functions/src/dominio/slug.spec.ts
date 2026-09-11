import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { normalizarYValidar, SLUGS_RESERVADOS, validarSlug } from './slug';

const MARCA = 'export const SLUG_MIN';

function cuerpo(ruta: string): string {
  const texto = readFileSync(new URL(ruta, import.meta.url), 'utf8');
  const inicio = texto.indexOf(MARCA);
  expect(inicio, `no se encontró "${MARCA}" en ${ruta}`).toBeGreaterThanOrEqual(0);
  return texto.slice(inicio);
}

describe('copia del slug', () => {
  // Este es el test que justifica la duplicación. Si alguien añade un slug
  // reservado en el cliente y no aquí, el panel se lo ofrecerá a la pareja y el
  // alta fallará después, cuando ya han elegido nombre.
  it('es idéntica a la del cliente', () => {
    expect(cuerpo('./slug.ts')).toBe(cuerpo('../../../src/app/core/tenant/slug.ts'));
  });
});

describe('validarSlug', () => {
  it('acepta un slug normal', () => {
    expect(validarSlug('maria-y-gabriel')).toEqual({ ok: true, slug: 'maria-y-gabriel' });
  });

  it('rechaza los reservados', () => {
    expect(validarSlug('admin')).toEqual({ ok: false, motivo: 'reservado' });
  });

  it('rechaza lo que el cliente nunca produciría pero un callable sí recibe', () => {
    // provisionWedding es una función invocable: nada garantiza que la entrada
    // haya pasado por el formulario. Por eso valida, no confía.
    expect(validarSlug('María y Gabriel').ok).toBe(false);
    expect(validarSlug('-boda').ok).toBe(false);
    expect(validarSlug('bo--da').ok).toBe(false);
  });

  it('normaliza acentos antes de validar', () => {
    expect(normalizarYValidar('María & Gabriel')).toEqual({ ok: true, slug: 'maria-gabriel' });
  });

  it('protege las tres familias de reservados', () => {
    for (const reservado of ['www', 'mail', 'soporte']) {
      expect(SLUGS_RESERVADOS.has(reservado), reservado).toBe(true);
    }
  });
});
