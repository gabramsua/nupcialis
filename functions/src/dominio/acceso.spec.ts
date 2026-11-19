import { describe, expect, it } from 'vitest';

import {
  ACCIONES_VERIFICADAS,
  BLOQUEOS_MS,
  BYTES_TOKEN,
  MAX_INTENTOS,
  SIN_INTENTOS,
  VENTANA_MS,
  esModoAcceso,
  esNivel,
  pareceToken,
  puedeHacer,
  puedeIntentar,
  trasAcertar,
  trasFallar,
  verificar,
  type InvitadoIdentificable,
  type RegistroIntentos,
} from './acceso';

function invitado(
  id: string,
  normalizedName: string,
  phone: string | null,
  extra: Partial<InvitadoIdentificable> = {},
): InvitadoIdentificable {
  return {
    id,
    normalizedName,
    phone,
    phoneLast4: phone ? phone.slice(-4) : null,
    active: true,
    ...extra,
  };
}

const LISTA = [
  invitado('g1', 'maria jose perez', '+34666123456'),
  invitado('g2', 'inigo munoz', '+34677000111'),
  invitado('g3', 'sin telefono', null),
];

describe('verificar en modo nombre + cuatro dígitos', () => {
  it('reconoce al invitado', () => {
    expect(
      verificar('name_phone4', { nombre: 'María José Pérez', digitos: '3456' }, LISTA),
    ).toEqual({ ok: true, guestId: 'g1' });
  });

  it('da igual cómo escriba el nombre: tildes, mayúsculas y espacios de más', () => {
    expect(
      verificar('name_phone4', { nombre: '  maria  jose   perez ', digitos: '3456' }, LISTA),
    ).toEqual({ ok: true, guestId: 'g1' });
  });

  it('acepta los dígitos escritos con separadores, que es como se teclean', () => {
    expect(
      verificar('name_phone4', { nombre: 'María José Pérez', digitos: '34 56' }, LISTA).ok,
    ).toBe(true);
  });

  it('con los dígitos de otro, no entra', () => {
    expect(
      verificar('name_phone4', { nombre: 'María José Pérez', digitos: '0111' }, LISTA),
    ).toEqual({ ok: false });
  });

  /**
   * Lo que no puede pasar nunca: que el fallo diga cuál de las dos cosas ha
   * fallado. Con un mensaje distinto, cualquiera averigua quién está invitado
   * probando nombres (regla 3). Aquí se comprueba sobre el **valor**: los dos
   * resultados son el mismo objeto, no dos objetos parecidos.
   */
  it('un nombre que no existe y unos dígitos que no coinciden dan exactamente lo mismo', () => {
    const noExiste = verificar('name_phone4', { nombre: 'Nadie De Nada', digitos: '3456' }, LISTA);
    const noCoincide = verificar(
      'name_phone4',
      { nombre: 'María José Pérez', digitos: '9999' },
      LISTA,
    );

    expect(noExiste).toEqual(noCoincide);
    expect(Object.keys(noExiste)).toEqual(['ok']);
  });

  it('quien no tiene teléfono no puede entrar por este modo', () => {
    expect(verificar('name_phone4', { nombre: 'Sin Teléfono', digitos: '0000' }, LISTA).ok).toBe(
      false,
    );
  });

  it('sin nombre o sin cuatro dígitos, no', () => {
    expect(verificar('name_phone4', { nombre: '', digitos: '3456' }, LISTA).ok).toBe(false);
    expect(verificar('name_phone4', { nombre: 'María José Pérez', digitos: '345' }, LISTA).ok).toBe(
      false,
    );
    expect(verificar('name_phone4', { nombre: 'María José Pérez' }, LISTA).ok).toBe(false);
  });
});

describe('verificar en modo teléfono', () => {
  it('reconoce el número escrito como sea', () => {
    for (const telefono of ['677000111', '+34 677 00 01 11', '0034677000111']) {
      expect(verificar('phone', { telefono }, LISTA)).toEqual({ ok: true, guestId: 'g2' });
    }
  });

  it('un número que no está en la lista no entra', () => {
    expect(verificar('phone', { telefono: '600000000' }, LISTA)).toEqual({ ok: false });
  });

  it('algo que no es un teléfono tampoco', () => {
    expect(verificar('phone', { telefono: 'no tengo' }, LISTA).ok).toBe(false);
  });
});

describe('verificar: los casos que acaban en «no» aunque parezca que sí', () => {
  it('un invitado dado de baja no entra, y no se nota que exista', () => {
    const lista = [invitado('g9', 'ana ruiz', '+34600111222', { active: false })];
    expect(verificar('phone', { telefono: '600111222' }, lista)).toEqual({ ok: false });
  });

  /**
   * Dos personas que encajan a la vez: mismo nombre y mismos cuatro dígitos.
   * Dejar entrar a la primera le daría a una la identidad de la otra —su mesa,
   * su menú, su grupo de fotos—, así que no se adivina.
   */
  it('si encajan dos, no entra ninguna', () => {
    const lista = [
      invitado('a', 'javier ruiz', '+34611223344'),
      invitado('b', 'javier ruiz', '+34699223344'),
    ];
    expect(verificar('name_phone4', { nombre: 'Javier Ruiz', digitos: '3344' }, lista).ok).toBe(
      false,
    );
  });

  it('pero si los dígitos los distinguen, sí', () => {
    const lista = [
      invitado('a', 'javier ruiz', '+34611223344'),
      invitado('b', 'javier ruiz', '+34699990000'),
    ];
    expect(verificar('name_phone4', { nombre: 'Javier Ruiz', digitos: '0000' }, lista)).toEqual({
      ok: true,
      guestId: 'b',
    });
  });

  it('en modo abierto no se verifica a nadie: no hay puerta que probar', () => {
    expect(verificar('open', { telefono: '677000111' }, LISTA)).toEqual({ ok: false });
  });
});

describe('esModoAcceso', () => {
  it('acepta los tres modos y nada más', () => {
    expect(['open', 'name_phone4', 'phone'].every(esModoAcceso)).toBe(true);
    expect(esModoAcceso('abierto')).toBe(false);
    expect(esModoAcceso(undefined)).toBe(false);
  });
});

describe('límite de intentos', () => {
  const T0 = 1_000_000;

  /** Falla `veces` seguidas desde `SIN_INTENTOS`. */
  function fallando(veces: number, ahora = T0): RegistroIntentos {
    let r = SIN_INTENTOS;
    for (let i = 0; i < veces; i++) r = trasFallar(r, ahora);
    return r;
  }

  it('deja intentar mientras no se pase', () => {
    expect(puedeIntentar(fallando(MAX_INTENTOS - 1), T0)).toEqual({ permitido: true });
  });

  it('al pasarse, bloquea un minuto', () => {
    const r = fallando(MAX_INTENTOS);
    expect(puedeIntentar(r, T0)).toEqual({ permitido: false, esperaMs: BLOQUEOS_MS[0] });
  });

  it('pasado el bloqueo se puede volver a intentar', () => {
    const r = fallando(MAX_INTENTOS);
    expect(puedeIntentar(r, T0 + BLOQUEOS_MS[0]!)).toEqual({ permitido: true });
  });

  it('cada bloqueo dura más que el anterior', () => {
    let r = SIN_INTENTOS;
    const esperas: number[] = [];

    for (let vuelta = 0; vuelta < BLOQUEOS_MS.length + 2; vuelta++) {
      for (let i = 0; i < MAX_INTENTOS; i++) r = trasFallar(r, T0);
      esperas.push(r.bloqueadoHasta - T0);
      // Se espera lo justo y se vuelve a la carga.
      r = { ...r, bloqueadoHasta: 0, desde: T0 };
    }

    expect(esperas.slice(0, BLOQUEOS_MS.length)).toEqual([...BLOQUEOS_MS]);
    // Y la escalada no se agota: pasado el último, se queda ahí.
    const ultimo = BLOQUEOS_MS[BLOQUEOS_MS.length - 1];
    expect(esperas.slice(BLOQUEOS_MS.length)).toEqual([ultimo, ultimo]);
  });

  it('los intentos caducan: media hora después se cuenta desde cero', () => {
    const viejo = fallando(MAX_INTENTOS - 1);
    const r = trasFallar(viejo, T0 + VENTANA_MS + 1);

    expect(r.intentos).toBe(1);
    expect(puedeIntentar(r, T0 + VENTANA_MS + 1)).toEqual({ permitido: true });
  });

  /**
   * Si la ventana reiniciara también los bloqueos, el castigo nunca crecería:
   * bastaría con esperar un cuarto de hora entre tandas para volver siempre al
   * bloqueo de un minuto.
   */
  it('dejar pasar la ventana no borra la escalada', () => {
    const bloqueado = fallando(MAX_INTENTOS);
    let r: RegistroIntentos = { ...bloqueado, bloqueadoHasta: 0 };
    const despues = T0 + VENTANA_MS + 1;
    for (let i = 0; i < MAX_INTENTOS; i++) r = trasFallar(r, despues);

    expect(r.bloqueadoHasta - despues).toBe(BLOQUEOS_MS[1]);
  });

  it('entrar bien lo borra todo, escalada incluida', () => {
    expect(trasAcertar()).toEqual(SIN_INTENTOS);
    expect(puedeIntentar(trasAcertar(), T0)).toEqual({ permitido: true });
  });
});

describe('los dos niveles de sesión (D-34)', () => {
  /**
   * **La regla de la opción 3.** El enlace se reenvía; lo que llega por un
   * grupo de WhatsApp puede mirar la web y no puede tocar nada.
   */
  it('una sesión de enlace no hace nada con consecuencias', () => {
    expect(puedeHacer('name_phone4', 'enlace')).toBe(false);
    expect(puedeHacer('phone', 'enlace')).toBe(false);
  });

  it('una sesión verificada sí', () => {
    expect(puedeHacer('name_phone4', 'verificado')).toBe(true);
    expect(puedeHacer('phone', 'verificado')).toBe(true);
  });

  /** En modo abierto no hay dígitos que pedir: ahí no hay identidad. */
  it('en modo abierto el nivel no decide nada', () => {
    expect(puedeHacer('open', 'enlace')).toBe(true);
    expect(puedeHacer('open', 'verificado')).toBe(true);
  });

  it('esNivel no se cree lo que llegue en un claim', () => {
    expect(esNivel('verificado')).toBe(true);
    expect(esNivel('enlace')).toBe(true);
    expect(esNivel('admin')).toBe(false);
    expect(esNivel(undefined)).toBe(false);
    expect(esNivel(1)).toBe(false);
  });

  /**
   * La lista existe para que el fallo no sea «se me olvidó comprobarlo en la
   * función nueva». Si se añade una acción del invitado, va aquí.
   */
  it('las acciones que exigen verificación están enumeradas', () => {
    expect(ACCIONES_VERIFICADAS).toContain('enviar-rsvp');
    expect(ACCIONES_VERIFICADAS).toContain('anadir-acompanante');
    expect(ACCIONES_VERIFICADAS).toContain('ver-fotos-restringidas');
  });
});

describe('el token del enlace', () => {
  it('acepta la forma que generamos, de 32 caracteres base64url', () => {
    expect(pareceToken('abcdEFGH1234_-abcdEFGH1234_-abcd')).toBe(
      'abcdEFGH1234_-abcdEFGH1234_-abcd',
    );
  });

  it('recorta los espacios que mete un copiar y pegar', () => {
    expect(pareceToken('  abcdEFGH1234_-abcdEFGH1234_-abcd  ')).toBe(
      'abcdEFGH1234_-abcdEFGH1234_-abcd',
    );
  });

  /** Lo que no tiene nuestra forma no se busca: una consulta menos por intento. */
  it('rechaza lo que no puede ser un token nuestro', () => {
    expect(pareceToken('corto')).toBeNull();
    expect(pareceToken('con espacios dentro xxxxxxxxxxxxxx')).toBeNull();
    expect(pareceToken('con/barras/y+signos+raros+aqui+xx')).toBeNull();
    expect(pareceToken('x'.repeat(65))).toBeNull();
    expect(pareceToken(null)).toBeNull();
    expect(pareceToken(42)).toBeNull();
  });

  it('192 bits de azar: el escenario no es adivinarlo', () => {
    expect(BYTES_TOKEN).toBeGreaterThanOrEqual(16);
  });
});
