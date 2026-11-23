import { describe, expect, it } from 'vitest';

import {
  deLaFamilia,
  filtrarInvitados,
  ordenarInvitados,
  ordenarPorNombre,
  porGrupo,
  porVista,
  resumirInvitados,
  type Invitado,
  apuntadosHacePoco,
} from './invitados-gateway';

function invitado(parcial: Partial<Invitado>): Invitado {
  return {
    id: 'i1',
    fullName: 'María Pérez',
    nickname: 'Mari',
    phone: '+34666123456',
    side: 'both',
    ageGroup: 'adult',
    groupIds: [],
    rsvpStatus: 'pending',
    isCompanion: false,
    invitedById: null,
    loginCount: 0,
    notes: '',
    menu: '',
    allergies: '',
    tableId: null,
    apuntadoPorInvitado: false,
    altaEn: null,
    ...parcial,
  };
}

describe('ordenarPorNombre', () => {
  it('ordena con las reglas del español', () => {
    const lista = [
      invitado({ id: 'c', fullName: 'Zoe' }),
      invitado({ id: 'a', fullName: 'Ángela' }),
      invitado({ id: 'b', fullName: 'Bernardo' }),
    ];
    expect(ordenarPorNombre(lista).map((i) => i.id)).toEqual(['a', 'b', 'c']);
  });

  it('no coloca los acentos al final', () => {
    // Con una comparación de cadenas a pelo, «Ángela» iría después de «Zoe».
    const lista = [invitado({ fullName: 'Zoe' }), invitado({ fullName: 'Ángela' })];
    expect(ordenarPorNombre(lista)[0].fullName).toBe('Ángela');
  });

  it('no toca la lista original', () => {
    const lista = [invitado({ fullName: 'Zoe' }), invitado({ fullName: 'Ana' })];
    ordenarPorNombre(lista);
    expect(lista[0].fullName).toBe('Zoe');
  });
});

describe('resumirInvitados', () => {
  it('cuenta por estado y cuántos no han entrado nunca', () => {
    const resumen = resumirInvitados([
      invitado({ rsvpStatus: 'confirmed', loginCount: 3 }),
      invitado({ rsvpStatus: 'confirmed', loginCount: 0 }),
      invitado({ rsvpStatus: 'declined', loginCount: 1 }),
      invitado({ rsvpStatus: 'pending', loginCount: 0 }),
    ]);

    expect(resumen).toEqual({
      total: 4,
      confirmados: 2,
      declinados: 1,
      pendientes: 1,
      // Es a quién hay que reenviarle el enlace (§8.3).
      sinEntrar: 2,
      apuntados: 0,
    });
  });

  it('con la lista vacía devuelve ceros, no NaN', () => {
    expect(resumirInvitados([])).toEqual({
      total: 0,
      confirmados: 0,
      declinados: 0,
      pendientes: 0,
      sinEntrar: 0,
      apuntados: 0,
    });
  });
});

describe('filtrarInvitados', () => {
  const lista = [
    invitado({ id: 'a', fullName: 'Begoña Agüero', nickname: 'Bego', phone: '+34666111222' }),
    invitado({ id: 'b', fullName: 'Pepe García', nickname: 'Pepito', phone: '+34677333444' }),
  ];

  it('encuentra por nombre ignorando acentos', () => {
    // Quien busca a Begoña escribe «begona» la mitad de las veces.
    expect(filtrarInvitados(lista, 'begona').map((i) => i.id)).toEqual(['a']);
    expect(filtrarInvitados(lista, 'AGUERO').map((i) => i.id)).toEqual(['a']);
  });

  it('encuentra por mote y por teléfono', () => {
    expect(filtrarInvitados(lista, 'pepito').map((i) => i.id)).toEqual(['b']);
    expect(filtrarInvitados(lista, '333444').map((i) => i.id)).toEqual(['b']);
  });

  it('sin texto devuelve la lista entera', () => {
    expect(filtrarInvitados(lista, '   ')).toHaveLength(2);
  });

  it('sin coincidencias devuelve vacío, no la lista entera', () => {
    expect(filtrarInvitados(lista, 'nadie')).toHaveLength(0);
  });
});

describe('porVista', () => {
  const lista = [
    invitado({ id: '1', rsvpStatus: 'confirmed', loginCount: 2 }),
    invitado({ id: '2', rsvpStatus: 'declined', loginCount: 1 }),
    invitado({ id: '3', rsvpStatus: 'pending', loginCount: 0 }),
    invitado({ id: '4', rsvpStatus: 'confirmed', loginCount: 0 }),
  ];

  it('sin filtro, la lista entera', () => {
    expect(porVista(lista, 'todos')).toHaveLength(4);
  });

  it('por estado del RSVP', () => {
    expect(porVista(lista, 'confirmed').map((i) => i.id)).toEqual(['1', '4']);
    expect(porVista(lista, 'declined').map((i) => i.id)).toEqual(['2']);
    expect(porVista(lista, 'pending').map((i) => i.id)).toEqual(['3']);
  });

  /**
   * «Sin entrar» no es un estado del RSVP: es a quién hay que reenviarle el
   * enlace, y eso incluye a quien ya confirmó por teléfono y nunca abrió la web.
   */
  it('«sin entrar» mira los accesos, no la confirmación', () => {
    expect(porVista(lista, 'sin-entrar').map((i) => i.id)).toEqual(['3', '4']);
  });
});

describe('porGrupo', () => {
  const lista = [
    invitado({ id: '1', groupIds: ['todos', 'primos'] }),
    invitado({ id: '2', groupIds: ['todos'] }),
    invitado({ id: '3', groupIds: ['todos', 'primos', 'trabajo'] }),
  ];

  it('sin grupo elegido, la lista entera', () => {
    expect(porGrupo(lista, null)).toHaveLength(3);
  });

  it('deja a los del grupo, estén además en otros o no', () => {
    expect(porGrupo(lista, 'primos').map((i) => i.id)).toEqual(['1', '3']);
  });

  it('un grupo sin nadie deja la lista vacía, no la entera', () => {
    expect(porGrupo(lista, 'nadie-aqui')).toEqual([]);
  });
});

describe('apuntadosHacePoco', () => {
  const ahora = new Date('2026-11-13T10:00:00.000Z');
  const hace = (dias: number) =>
    new Date(ahora.getTime() - dias * 24 * 60 * 60 * 1000).toISOString();

  it('son los que han apuntado los invitados esta semana', () => {
    const lista = [
      invitado({ id: 'nuevo', apuntadoPorInvitado: true, altaEn: hace(2) }),
      invitado({ id: 'viejo', apuntadoPorInvitado: true, altaEn: hace(20) }),
      invitado({ id: 'de-la-pareja', apuntadoPorInvitado: false, altaEn: hace(1) }),
    ];

    expect(apuntadosHacePoco(lista, ahora).map((i) => i.id)).toEqual(['nuevo']);
  });

  /**
   * Un invitado de antes de que se guardara la fecha no puede salir como
   * «nuevo» cada vez que la pareja abre el panel.
   */
  it('sin fecha de alta, no es una novedad', () => {
    const lista = [invitado({ id: 'antiguo', apuntadoPorInvitado: true, altaEn: null })];

    expect(apuntadosHacePoco(lista, ahora)).toEqual([]);
  });

  /** Un despliegue viejo manda la lista sin los campos nuevos. */
  it('aguanta una lista sin los campos nuevos', () => {
    const sinCampos = [{ ...invitado({ id: 'x' }) } as Partial<Invitado> as Invitado];
    delete (sinCampos[0] as { apuntadoPorInvitado?: boolean }).apuntadoPorInvitado;

    expect(() => apuntadosHacePoco(sinCampos, ahora)).not.toThrow();
    expect(apuntadosHacePoco(sinCampos, ahora)).toEqual([]);
  });
});

describe('porVista: apuntados', () => {
  it('deja solo a los que han apuntado los invitados', () => {
    const lista = [
      invitado({ id: '1', apuntadoPorInvitado: true }),
      invitado({ id: '2', apuntadoPorInvitado: false }),
    ];

    expect(porVista(lista, 'apuntados').map((i) => i.id)).toEqual(['1']);
  });
});

describe('deLaFamilia', () => {
  const lista = [
    invitado({ id: 'a', fullName: 'Ana' }),
    invitado({ id: 'b', fullName: 'Beto', isCompanion: true, invitedById: 'a' }),
    invitado({ id: 'c', fullName: 'Cris', isCompanion: true, invitedById: 'a' }),
    invitado({ id: 'd', fullName: 'Dani' }),
    invitado({ id: 'e', fullName: 'Eva', isCompanion: true, invitedById: 'd' }),
  ];

  it('sin titular, la lista entera', () => {
    expect(deLaFamilia(lista, null)).toHaveLength(5);
  });

  it('el titular y los suyos, y nadie más', () => {
    expect(deLaFamilia(lista, 'a').map((i) => i.id)).toEqual(['a', 'b', 'c']);
  });

  it('un titular sin acompañantes sale solo', () => {
    expect(deLaFamilia([lista[0]!, lista[3]!], 'd').map((i) => i.id)).toEqual(['d']);
  });
});

describe('ordenarInvitados', () => {
  const ana = invitado({ id: 'ana', fullName: 'Ana', rsvpStatus: 'declined', groupIds: ['g2'] });
  const beto = invitado({
    id: 'beto',
    fullName: 'Beto',
    rsvpStatus: 'confirmed',
    groupIds: ['g1'],
  });
  const carla = invitado({ id: 'carla', fullName: 'Carla', rsvpStatus: 'pending', groupIds: [] });
  const dani = invitado({
    id: 'dani',
    fullName: 'Dani',
    rsvpStatus: 'confirmed',
    groupIds: ['g2', 'g1'],
  });
  const lista = [dani, carla, ana, beto];
  const grupos = ['g1', 'g2'];
  const ids = (l: readonly Invitado[]) => l.map((i) => i.id);

  it('por nombre, ascendente y descendente', () => {
    expect(ids(ordenarInvitados(lista, 'nombre', 'asc', grupos))).toEqual([
      'ana',
      'beto',
      'carla',
      'dani',
    ]);
    expect(ids(ordenarInvitados(lista, 'nombre', 'desc', grupos))).toEqual([
      'dani',
      'carla',
      'beto',
      'ana',
    ]);
  });

  it('por respuesta: confirmados, pendientes, no vienen; los empates, por nombre', () => {
    expect(ids(ordenarInvitados(lista, 'estado', 'asc', grupos))).toEqual([
      'beto',
      'dani',
      'carla',
      'ana',
    ]);
    expect(ids(ordenarInvitados(lista, 'estado', 'desc', grupos))).toEqual([
      'ana',
      'carla',
      'beto',
      'dani',
    ]);
  });

  it('por grupo sigue el orden de la pareja y deja sin grupo al final en los dos sentidos', () => {
    // Dani está en g1 y g2: cuenta por el primero de la pareja, g1.
    expect(ids(ordenarInvitados(lista, 'grupo', 'asc', grupos))).toEqual([
      'beto',
      'dani',
      'ana',
      'carla',
    ]);
    expect(ids(ordenarInvitados(lista, 'grupo', 'desc', grupos))).toEqual([
      'ana',
      'beto',
      'dani',
      'carla',
    ]);
  });

  it('por fecha de alta: los sin fecha cuentan como los más antiguos', () => {
    const viejo = invitado({ id: 'viejo', fullName: 'Zoe', altaEn: null });
    const antes = invitado({ id: 'antes', fullName: 'Yago', altaEn: '2026-01-01T10:00:00.000Z' });
    const despues = invitado({
      id: 'despues',
      fullName: 'Xia',
      altaEn: '2026-03-01T10:00:00.000Z',
    });
    const todos = [despues, viejo, antes];
    expect(ids(ordenarInvitados(todos, 'alta', 'asc', []))).toEqual(['viejo', 'antes', 'despues']);
    expect(ids(ordenarInvitados(todos, 'alta', 'desc', []))).toEqual(['despues', 'antes', 'viejo']);
  });

  it('no toca la lista original', () => {
    const copia = [...lista];
    ordenarInvitados(lista, 'estado', 'desc', grupos);
    expect(lista).toEqual(copia);
  });
});
