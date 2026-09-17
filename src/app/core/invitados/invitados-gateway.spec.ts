import { describe, expect, it } from 'vitest';

import {
  filtrarInvitados,
  ordenarPorNombre,
  resumirInvitados,
  type Invitado,
} from './invitados-gateway';

function invitado(parcial: Partial<Invitado>): Invitado {
  return {
    id: 'i1',
    fullName: 'María Pérez',
    nickname: 'Mari',
    phone: '+34666123456',
    email: null,
    side: 'both',
    ageGroup: 'adult',
    groupIds: [],
    rsvpStatus: 'pending',
    isCompanion: false,
    invitedById: null,
    maxCompanions: 0,
    loginCount: 0,
    notes: '',
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
    });
  });

  it('con la lista vacía devuelve ceros, no NaN', () => {
    expect(resumirInvitados([])).toEqual({
      total: 0,
      confirmados: 0,
      declinados: 0,
      pendientes: 0,
      sinEntrar: 0,
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
