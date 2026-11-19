import { describe, expect, it } from 'vitest';

import {
  dosRestringidos,
  marcarPorDefecto,
  miembrosPorGrupo,
  ordenarGrupos,
  type Grupo,
  moverGrupo,
} from './grupos-gateway';

function grupo(id: string, extra: Partial<Grupo> = {}): Grupo {
  return {
    id,
    name: id,
    side: 'both',
    photoAudience: 'public',
    allowPublicOptIn: false,
    color: 'rosa',
    order: 0,
    porDefecto: false,
    ...extra,
  };
}

describe('ordenarGrupos', () => {
  it('respeta el orden de la pareja y, a igualdad, el alfabético en español', () => {
    const ordenados = ordenarGrupos([
      grupo('b', { name: 'Ñandú', order: 1 }),
      grupo('a', { name: 'Zeta', order: 0 }),
      grupo('c', { name: 'Nube', order: 1 }),
    ]);
    expect(ordenados.map((g) => g.name)).toEqual(['Zeta', 'Nube', 'Ñandú']);
  });
});

describe('miembrosPorGrupo', () => {
  it('cuenta a cada invitado en todos sus grupos', () => {
    const cuenta = miembrosPorGrupo([
      { groupIds: ['uni', 'familia'] },
      { groupIds: ['uni'] },
      { groupIds: [] },
    ]);
    expect(cuenta.get('uni')).toBe(2);
    expect(cuenta.get('familia')).toBe(1);
    expect(cuenta.get('padel')).toBeUndefined();
  });
});

describe('dosRestringidos', () => {
  const GRUPOS = [
    grupo('uni', { photoAudience: 'restricted' }),
    grupo('padel', { photoAudience: 'restricted' }),
    grupo('familia'),
  ];

  it('avisa con dos restringidos', () => {
    expect(dosRestringidos(['uni', 'padel'], GRUPOS)).toBe(true);
  });

  it('uno restringido y varios públicos está bien', () => {
    expect(dosRestringidos(['uni', 'familia'], GRUPOS)).toBe(false);
  });
});

describe('marcarPorDefecto', () => {
  it('en una boda antigua, el grupo de todos es el que se llama «Invitados»', () => {
    const marcados = marcarPorDefecto([
      grupo('f', { name: 'Familia' }),
      grupo('i', { name: 'Invitados' }),
    ]);
    expect(marcados.map((g) => g.porDefecto)).toEqual([false, true]);
  });

  it('si ya hay uno marcado, no marca otro aunque se llame igual', () => {
    const marcados = marcarPorDefecto([
      grupo('a', { name: 'Todos', porDefecto: true }),
      grupo('i', { name: 'Invitados' }),
    ]);
    expect(marcados.map((g) => g.porDefecto)).toEqual([true, false]);
  });
});

describe('moverGrupo', () => {
  const lista = [grupo('a', { order: 0 }), grupo('b', { order: 1 }), grupo('c', { order: 2 })];

  it('sube uno y renumera a todos', () => {
    const movidos = moverGrupo(lista, 'c', -1);

    expect(movidos.map((g) => g.id)).toEqual(['a', 'c', 'b']);
    expect(movidos.map((g) => g.order)).toEqual([0, 1, 2]);
  });

  it('baja uno', () => {
    expect(moverGrupo(lista, 'a', 1).map((g) => g.id)).toEqual(['b', 'a', 'c']);
  });

  /** Sacar al primero por arriba no es nada: se devuelve la misma lista. */
  it('no se sale por los extremos', () => {
    expect(moverGrupo(lista, 'a', -1)).toBe(lista);
    expect(moverGrupo(lista, 'c', 1)).toBe(lista);
  });

  it('un grupo que no está se ignora', () => {
    expect(moverGrupo(lista, 'no-existe', 1)).toBe(lista);
  });
});
