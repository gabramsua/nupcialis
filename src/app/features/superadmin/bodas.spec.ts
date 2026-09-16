import { describe, expect, it } from 'vitest';

import { claveDeNombre, conIncidencias, ordenPorDefecto, type BodaEnListado } from './bodas';

function boda(parcial: Partial<BodaEnListado>): BodaEnListado {
  return {
    weddingId: 'id',
    slug: 'slug',
    status: 'active',
    plan: 'basic',
    pareja: { partnerA: 'María', partnerB: 'Gabriel' },
    weddingDate: new Date('2027-06-12'),
    invitados: 0,
    confirmados: 0,
    authDomain: 'ok',
    ...parcial,
  };
}

describe('ordenPorDefecto', () => {
  // Una boda con el subdominio sin autorizar tiene el acceso con Google roto y
  // nadie lo sabe. Si aparece en la página tres, el listado no sirve.
  it('pone primero las bodas con el subdominio sin autorizar', () => {
    const bodas = [
      boda({ slug: 'lejana', weddingDate: new Date('2027-01-01') }),
      boda({ slug: 'rota', weddingDate: new Date('2028-01-01'), authDomain: 'pending' }),
    ];
    expect([...bodas].sort(ordenPorDefecto)[0]?.slug).toBe('rota');
  });

  it('después, las más próximas primero', () => {
    const bodas = [
      boda({ slug: 'junio', weddingDate: new Date('2027-06-12') }),
      boda({ slug: 'marzo', weddingDate: new Date('2027-03-01') }),
    ];
    expect([...bodas].sort(ordenPorDefecto).map((b) => b.slug)).toEqual(['marzo', 'junio']);
  });

  it('y las archivadas al final, aunque su fecha fuera antes', () => {
    const bodas = [
      boda({ slug: 'vieja', weddingDate: new Date('2020-01-01'), status: 'archived' }),
      boda({ slug: 'proxima', weddingDate: new Date('2027-06-12') }),
    ];
    expect([...bodas].sort(ordenPorDefecto).map((b) => b.slug)).toEqual(['proxima', 'vieja']);
  });

  it('una boda sin fecha no se cuela la primera', () => {
    const bodas = [
      boda({ slug: 'sin-fecha', weddingDate: null }),
      boda({ slug: 'con-fecha', weddingDate: new Date('2027-06-12') }),
    ];
    expect([...bodas].sort(ordenPorDefecto).map((b) => b.slug)).toEqual(['con-fecha', 'sin-fecha']);
  });

  it('una incidencia gana aunque esté archivada', () => {
    const bodas = [
      boda({ slug: 'normal' }),
      boda({ slug: 'rota-vieja', status: 'archived', authDomain: 'pending' }),
    ];
    expect([...bodas].sort(ordenPorDefecto)[0]?.slug).toBe('rota-vieja');
  });
});

describe('conIncidencias', () => {
  it('cuenta las que tienen el subdominio pendiente', () => {
    expect(
      conIncidencias([boda({ authDomain: 'pending' }), boda({}), boda({ authDomain: 'pending' })]),
    ).toBe(2);
  });

  it('con todo en orden, cero', () => {
    expect(conIncidencias([boda({}), boda({})])).toBe(0);
  });
});

describe('claveDeNombre', () => {
  it('junta los dos nombres para poder ordenar por ellos', () => {
    expect(claveDeNombre(boda({ pareja: { partnerA: 'Ana', partnerB: 'Juan' } }))).toBe('Ana Juan');
  });

  // "Álvarez" detrás de "Zurita" es lo que pasa sin reglas de español, y el
  // comparador del design system ya lo resuelve: aquí basta con darle texto.
  it('una boda a medio rellenar no rompe el orden', () => {
    expect(claveDeNombre(boda({ pareja: { partnerA: 'Ana', partnerB: '' } }))).toBe('Ana');
  });
});
