import { describe, expect, it } from 'vitest';

import {
  accionesDe,
  claveDeNombre,
  conIncidencias,
  filtrarBodas,
  hayFiltros,
  ordenPorDefecto,
  SIN_FILTROS,
  type BodaEnListado,
  type FiltrosDeBodas,
} from './bodas';

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

describe('accionesDe', () => {
  it('ofrece publicar y archivar en una boda en borrador', () => {
    expect(accionesDe('draft').map((a) => a.accion)).toEqual(['publicar', 'archivar']);
  });

  it('ofrece despublicar y archivar en una publicada', () => {
    expect(accionesDe('active').map((a) => a.accion)).toEqual(['despublicar', 'archivar']);
  });

  it('en una archivada solo deja reactivar', () => {
    expect(accionesDe('archived').map((a) => a.accion)).toEqual(['reactivar']);
  });

  it('nunca ofrece ir al estado en el que ya está', () => {
    for (const estado of ['draft', 'active', 'archived'] as const) {
      for (const accion of accionesDe(estado)) {
        expect(accion.destino).not.toBe(estado);
      }
    }
  });

  it('cada acción lleva icono además de color', () => {
    // El color nunca viaja solo (sistema visual, CLAUDE.md).
    for (const estado of ['draft', 'active', 'archived'] as const) {
      for (const accion of accionesDe(estado)) {
        expect(accion.icono).toBeTruthy();
      }
    }
  });
});

describe('filtrarBodas', () => {
  const hoy = new Date(2027, 2, 10, 12);
  const boda = (parcial: Partial<BodaEnListado> & { weddingId: string }): BodaEnListado => ({
    slug: parcial.weddingId,
    status: 'active',
    plan: 'basic',
    pareja: { partnerA: 'Ana', partnerB: 'Juan' },
    weddingDate: new Date('2027-06-12T00:00:00Z'),
    invitados: 0,
    confirmados: 0,
    authDomain: 'ok',
    ...parcial,
  });

  const lista = [
    boda({
      weddingId: 'a',
      pareja: { partnerA: 'María', partnerB: 'Gabriel' },
      slug: 'mariaygabriel',
    }),
    boda({ weddingId: 'b', status: 'draft', weddingDate: new Date('2027-03-10T00:00:00Z') }),
    boda({ weddingId: 'c', status: 'archived', weddingDate: new Date('2026-05-01T00:00:00Z') }),
    boda({ weddingId: 'd', weddingDate: null }),
  ];
  const ids = (f: Partial<FiltrosDeBodas>) =>
    filtrarBodas(lista, { ...SIN_FILTROS, ...f }, hoy).map((b) => b.weddingId);

  it('sin filtros devuelve todas', () => {
    expect(ids({})).toEqual(['a', 'b', 'c', 'd']);
    expect(hayFiltros(SIN_FILTROS)).toBe(false);
  });

  it('por estado', () => {
    expect(ids({ estado: 'draft' })).toEqual(['b']);
    expect(ids({ estado: 'archived' })).toEqual(['c']);
  });

  it('por texto, sin tildes ni mayúsculas y en los dos nombres y el slug', () => {
    expect(ids({ texto: 'maria' })).toEqual(['a']);
    expect(ids({ texto: 'GABRIEL maría' })).toEqual(['a']);
    expect(ids({ texto: 'mariaygab' })).toEqual(['a']);
    expect(ids({ texto: 'zzz' })).toEqual([]);
  });

  it('próximas incluye la de hoy; pasadas, las anteriores; y las sin fecha aparte', () => {
    expect(ids({ momento: 'proximas' })).toEqual(['a', 'b']);
    expect(ids({ momento: 'pasadas' })).toEqual(['c']);
    expect(ids({ momento: 'sin-fecha' })).toEqual(['d']);
  });

  it('los filtros se combinan', () => {
    expect(ids({ estado: 'active', momento: 'proximas' })).toEqual(['a']);
    expect(hayFiltros({ ...SIN_FILTROS, texto: ' x ' })).toBe(true);
  });
});
