import { describe, expect, it } from 'vitest';

import {
  MAX_ACOMPANANTES,
  duplicadoDe,
  normalizarNombre,
  normalizarTelefono,
  ultimos4,
  validarInvitado,
  type EntradaInvitado,
  type InvitadoValidado,
} from './invitados';

const VALIDO: EntradaInvitado = {
  fullName: 'María José Pérez',
  phone: '666 12 34 56',
};

function datos(parcial: Partial<EntradaInvitado>): InvitadoValidado {
  const resultado = validarInvitado({ ...VALIDO, ...parcial });
  if (!resultado.ok) throw new Error(`no validó: ${JSON.stringify(resultado.motivos)}`);
  return resultado.datos;
}

function motivos(parcial: Partial<EntradaInvitado>) {
  const resultado = validarInvitado({ ...VALIDO, ...parcial });
  return resultado.ok ? [] : resultado.motivos;
}

describe('normalizarNombre', () => {
  it('quita acentos, mayúsculas y puntuación', () => {
    expect(normalizarNombre('María José Pérez')).toBe('maria jose perez');
    expect(normalizarNombre('  J.  Ramón   Díaz-López ')).toBe('j ramon diaz lopez');
  });

  it('conserva la ñ, que no es una n con adorno', () => {
    // Si se quitara, «Muñoz» y «Munoz» serían la misma persona.
    expect(normalizarNombre('Íñigo Muñoz')).toBe('iñigo muñoz');
    expect(normalizarNombre('Munoz')).not.toBe(normalizarNombre('Muñoz'));
  });

  it('conserva la diéresis', () => {
    expect(normalizarNombre('Begoña Agüero')).toBe('begoña agüero');
  });

  it('hace que dos formas de escribir el mismo nombre coincidan', () => {
    // Es lo que sostiene el acceso del invitado por nombre (regla 3): lo que
    // teclea en el móvil tiene que casar con lo que la pareja importó.
    expect(normalizarNombre('MARÍA JOSÉ PÉREZ')).toBe(normalizarNombre('maria jose perez'));
  });

  it('devuelve cadena vacía con lo que no es un nombre', () => {
    for (const basura of [null, undefined, 42, {}, '   ']) {
      expect(normalizarNombre(basura)).toBe('');
    }
  });
});

describe('normalizarTelefono', () => {
  it('entiende un móvil español escrito de cualquier manera', () => {
    for (const escrito of ['666123456', '666 12 34 56', '666-12-34-56', '(666) 123456']) {
      expect(normalizarTelefono(escrito), escrito).toBe('+34666123456');
    }
  });

  it('respeta un prefijo internacional', () => {
    expect(normalizarTelefono('+33 6 12 34 56 78')).toBe('+33612345678');
    expect(normalizarTelefono('0034666123456')).toBe('+34666123456');
  });

  it('acepta los fijos españoles, que empiezan por 8 o 9', () => {
    expect(normalizarTelefono('956123456')).toBe('+34956123456');
  });

  it('no le inventa el país a una ristra de dígitos cualquiera', () => {
    // Adivinar aquí sale caro: el fallo se descubre meses después, cuando ese
    // invitado intenta entrar en la web y no puede.
    expect(normalizarTelefono('12345')).toBeNull();
    expect(normalizarTelefono('123456789')).toBeNull();
  });

  it('rechaza lo que no es un teléfono', () => {
    for (const basura of ['', 'no tiene', '+', '++34666123456', null, 666123456]) {
      expect(normalizarTelefono(basura), String(basura)).toBeNull();
    }
  });
});

describe('ultimos4', () => {
  it('son los cuatro últimos dígitos, que es la clave del modo B', () => {
    expect(ultimos4('+34666123456')).toBe('3456');
  });

  it('sin teléfono no hay clave', () => {
    expect(ultimos4(null)).toBeNull();
  });
});

describe('validarInvitado', () => {
  it('normaliza un invitado completo', () => {
    const d = datos({});
    expect(d.fullName).toBe('María José Pérez');
    expect(d.normalizedName).toBe('maria jose perez');
    expect(d.phone).toBe('+34666123456');
    expect(d.phoneLast4).toBe('3456');
    // El correo no se guarda para nada: aunque llegue, no entra en el documento.
    expect('email' in d).toBe(false);
  });

  it('exige el nombre y nada más', () => {
    // Una pareja empieza la lista con nombres sueltos y va rellenando. Exigir
    // teléfono desde el principio convierte el alta en un muro.
    const resultado = validarInvitado({ fullName: 'Pepe' });
    expect(resultado.ok).toBe(true);
  });

  it('sin nombre no hay invitado', () => {
    expect(motivos({ fullName: '   ' })).toEqual([{ campo: 'fullName', motivo: 'ausente' }]);
  });

  it('un teléfono escrito y no entendido es un error; no ponerlo, no', () => {
    expect(motivos({ phone: 'el de siempre' })).toEqual([
      { campo: 'phone', motivo: 'no-es-telefono' },
    ]);
    expect(motivos({ phone: '' })).toEqual([]);
  });

  it('pone tope al cupo de acompañantes', () => {
    expect(motivos({ maxCompanions: MAX_ACOMPANANTES + 1 })).toEqual([
      { campo: 'maxCompanions', motivo: 'fuera-de-rango' },
    ]);
    expect(motivos({ maxCompanions: -1 })).toEqual([
      { campo: 'maxCompanions', motivo: 'fuera-de-rango' },
    ]);
  });

  it('devuelve todos los motivos de una vez, no el primero', () => {
    // En una importación de doscientas filas, de uno en uno es una tortura.
    const todos = motivos({ fullName: '', phone: 'nada' });
    expect(todos.map((m) => m.campo).sort()).toEqual(['fullName', 'phone']);
  });

  it('sin mote, el mote es el nombre', () => {
    // Es lo que va en la tarjeta de la mesa: ahí no puede quedar un hueco.
    expect(datos({ nickname: '' }).nickname).toBe('María José Pérez');
    expect(datos({ nickname: 'Majo' }).nickname).toBe('Majo');
  });

  it('cae a valores sensatos cuando el lado o la edad vienen raros', () => {
    expect(datos({ side: 'novia' }).side).toBe('both');
    expect(datos({ ageGroup: 'anciano' }).ageGroup).toBe('adult');
  });

  it('quita los grupos repetidos y los que no son cadenas', () => {
    expect(datos({ groupIds: ['g1', 'g1', '', null, 7, 'g2'] }).groupIds).toEqual(['g1', 'g2']);
  });
});

describe('duplicadoDe', () => {
  const existentes = [
    { id: 'a', phone: '+34666123456', normalizedName: 'maria jose perez' },
    { id: 'b', phone: null, normalizedName: 'pepe garcia' },
  ];

  it('el teléfono manda: es lo único que identifica de verdad', () => {
    const candidato = datos({ fullName: 'Otra Persona' });
    expect(duplicadoDe(candidato, existentes)).toEqual({ id: 'a', motivo: 'telefono' });
  });

  it('sin teléfono se cae al nombre, y lo dice', () => {
    const candidato = datos({ fullName: 'Pepe García', phone: '' });
    expect(duplicadoDe(candidato, existentes)).toEqual({ id: 'b', motivo: 'nombre' });
  });

  it('el mismo nombre escrito distinto también coincide', () => {
    const candidato = datos({ fullName: 'pepe garcia', phone: '' });
    expect(duplicadoDe(candidato, existentes)?.id).toBe('b');
  });

  it('no inventa duplicados', () => {
    const candidato = datos({ fullName: 'Nadie Conocido', phone: '677000000' });
    expect(duplicadoDe(candidato, existentes)).toBeNull();
  });

  it('con la lista vacía nunca hay duplicado', () => {
    expect(duplicadoDe(datos({}), [])).toBeNull();
  });
});
