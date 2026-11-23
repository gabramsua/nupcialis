import { describe, expect, it } from 'vitest';

import {
  MAX_NOMBRE,
  exigeTelefono,
  heredarDelTitular,
  puedeAnadir,
  sigueAlTitular,
  validarAcompanante,
  type Titular,
  idsDelLote,
  validarVinculo,
} from './acompanantes';
import { MAX_ACOMPANANTES, normalizarTelefono } from './invitados';

/**
 * Acompañantes añadidos por el invitado.
 *
 * Lo que se vigila, por orden de lo que costaría si se rompe:
 *
 * 1. **El tope se cuenta con lo que hay escrito.** Dos pestañas abiertas mandan
 *    el mismo alta dos veces; si la cuenta saliera del cliente, la pareja se
 *    encuentra comensales de más y lo descubre el día del banquete. Ya no hay
 *    cupo por invitado (D-51): queda solo el tope técnico.
 * 2. **Un acompañante no añade acompañantes.** Sin eso, el cupo de uno se vuelve
 *    una cadena.
 * 3. **Los grupos se heredan.** Es seguridad: los grupos deciden quién ve qué
 *    fotos.
 */

function titular(parcial: Partial<Titular> = {}): Titular {
  return {
    id: 'g1',
    isCompanion: false,
    groupIds: ['uni', 'familia'],
    active: true,
    ...parcial,
  };
}

describe('puedeAnadir', () => {
  it('sin cupo asignado por la pareja, pueden traer hasta el tope técnico', () => {
    expect(puedeAnadir(true, titular(), 0)).toEqual({ puede: true, quedan: MAX_ACOMPANANTES });
    expect(puedeAnadir(true, titular(), 1)).toEqual({
      puede: true,
      quedan: MAX_ACOMPANANTES - 1,
    });
  });

  it('con el tope lleno, no', () => {
    expect(puedeAnadir(true, titular(), MAX_ACOMPANANTES)).toEqual({
      puede: false,
      motivo: 'cupo-lleno',
    });
  });

  /** Ya pasó con el cupo de los grupos: contar mal por arriba cuesta dinero. */
  it('pasado el tope por lo que sea, tampoco', () => {
    expect(puedeAnadir(true, titular(), MAX_ACOMPANANTES + 5)).toEqual({
      puede: false,
      motivo: 'cupo-lleno',
    });
  });

  it('con el interruptor de la boda apagado, nadie añade a nadie', () => {
    expect(puedeAnadir(false, titular(), 0)).toEqual({ puede: false, motivo: 'modulo-apagado' });
  });

  /** Si no, el cupo de uno se vuelve una cadena de treinta desconocidos. */
  it('un acompañante no puede añadir acompañantes', () => {
    expect(puedeAnadir(true, titular({ isCompanion: true }), 0)).toEqual({
      puede: false,
      motivo: 'es-acompanante',
    });
  });

  it('un invitado desactivado tampoco', () => {
    expect(puedeAnadir(true, titular({ active: false }), 0)).toEqual({
      puede: false,
      motivo: 'inactivo',
    });
  });
});

describe('el teléfono del acompañante', () => {
  it('hace falta en los modos que lo piden para entrar', () => {
    expect(exigeTelefono('name_phone4')).toBe(true);
    expect(exigeTelefono('phone')).toBe(true);
  });

  it('en una boda abierta no: ahí entra cualquiera con el enlace', () => {
    expect(exigeTelefono('open')).toBe(false);
  });
});

describe('validarAcompanante', () => {
  it('con nombre y teléfono, pasa', () => {
    expect(
      validarAcompanante(
        { fullName: '  Ana Ruiz ', phone: '600 11 22 33', ageGroup: 'adult' },
        'name_phone4',
        normalizarTelefono,
      ),
    ).toEqual({
      ok: true,
      datos: { fullName: 'Ana Ruiz', phone: '+34600112233', ageGroup: 'adult' },
    });
  });

  it('sin nombre, no', () => {
    const r = validarAcompanante({ phone: '600112233' }, 'open', normalizarTelefono);

    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivos).toEqual([{ campo: 'fullName', motivo: 'ausente' }]);
  });

  it('un nombre kilométrico tampoco', () => {
    const r = validarAcompanante(
      { fullName: 'x'.repeat(MAX_NOMBRE + 1) },
      'open',
      normalizarTelefono,
    );

    expect(r.ok).toBe(false);
  });

  /** Mandarle un enlace que no puede abrir es peor que no dejarlo apuntar. */
  it('en modo nombre y dígitos, sin teléfono no se puede añadir', () => {
    const r = validarAcompanante({ fullName: 'Ana Ruiz' }, 'name_phone4', normalizarTelefono);

    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivos).toEqual([{ campo: 'phone', motivo: 'ausente' }]);
  });

  it('en una boda abierta, sin teléfono sí', () => {
    const r = validarAcompanante({ fullName: 'Ana Ruiz' }, 'open', normalizarTelefono);

    expect(r.ok && r.datos.phone).toBeNull();
  });

  it('un teléfono que no es un teléfono se dice, no se guarda a medias', () => {
    const r = validarAcompanante({ fullName: 'Ana Ruiz', phone: '12' }, 'open', normalizarTelefono);

    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivos).toEqual([{ campo: 'phone', motivo: 'no-es-telefono' }]);
  });

  it('sin edad, adulto', () => {
    const r = validarAcompanante({ fullName: 'Ana Ruiz' }, 'open', normalizarTelefono);

    expect(r.ok && r.datos.ageGroup).toBe('adult');
  });

  it('una edad inventada se rechaza en vez de colarse como adulto', () => {
    const r = validarAcompanante(
      { fullName: 'Ana Ruiz', ageGroup: 'anciano' },
      'open',
      normalizarTelefono,
    );

    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivos).toEqual([{ campo: 'ageGroup', motivo: 'desconocido' }]);
  });

  it('un niño se puede apuntar como niño: el catering cuenta menús infantiles', () => {
    const r = validarAcompanante(
      { fullName: 'Leo', ageGroup: 'child' },
      'open',
      normalizarTelefono,
    );

    expect(r.ok && r.datos.ageGroup).toBe('child');
  });

  /** El invitado no elige nada más: está dando datos de un tercero (RGPD). */
  it('lo que no se pregunta no se guarda, aunque llegue', () => {
    const r = validarAcompanante(
      {
        fullName: 'Ana Ruiz',
        ...({ notes: 'lo que sea', maxCompanions: 9, groupIds: ['vip'] } as object),
      },
      'open',
      normalizarTelefono,
    );

    expect(r.ok && Object.keys(r.datos)).toEqual(['fullName', 'phone', 'ageGroup']);
  });
});

describe('heredarDelTitular', () => {
  /**
   * Es seguridad, no comodidad: los grupos deciden quién ve qué fotos. Un
   * acompañante fuera de los grupos de su titular vería otra galería que su
   * pareja, y uno dentro de un grupo que no es el suyo sería una fuga.
   */
  it('el acompañante entra en los grupos del titular', () => {
    expect(heredarDelTitular(titular()).groupIds).toEqual(['uni', 'familia']);
  });

  it('copia la lista, no la comparte', () => {
    const quien = titular();
    const heredado = heredarDelTitular(quien).groupIds as string[];
    heredado.push('colado');

    expect(quien.groupIds).toEqual(['uni', 'familia']);
  });
});

describe('validarVinculo', () => {
  /**
   * La pareja decide quién viene con quién, pero no a costa de dejar la lista
   * en un estado que luego no se pueda contar: sin cadenas y sin huérfanos.
   */
  it('enlaza con un titular y hereda sus grupos', () => {
    expect(validarVinculo('g2', titular(), 0)).toEqual({ ok: true, groupIds: ['uni', 'familia'] });
  });

  it('también vale para quien aún no existe (alta directa como acompañante)', () => {
    expect(validarVinculo(null, titular(), 0).ok).toBe(true);
  });

  it('no existe el titular', () => {
    expect(validarVinculo('g2', null, 0)).toEqual({ ok: false, motivo: 'no-existe' });
  });

  it('nadie viene consigo mismo', () => {
    expect(validarVinculo('g1', titular(), 0)).toEqual({ ok: false, motivo: 'uno-mismo' });
  });

  it('un acompañante no puede ser titular', () => {
    expect(validarVinculo('g2', titular({ isCompanion: true }), 0)).toEqual({
      ok: false,
      motivo: 'es-acompanante',
    });
  });

  it('quien ya trae gente no pasa a ser acompañante', () => {
    expect(validarVinculo('g2', titular(), 2)).toEqual({ ok: false, motivo: 'tiene-acompanantes' });
  });
});

describe('idsDelLote', () => {
  it('quita repetidos y lo que no es un id', () => {
    expect(idsDelLote(['a', 'a', '', null, 7, 'b'])).toEqual(['a', 'b']);
  });
});

describe('sigueAlTitular', () => {
  it('sin marca, sigue: son los acompañantes anteriores a la regla', () => {
    expect(sigueAlTitular({})).toBe(true);
  });

  it('con la marca a favor, sigue', () => {
    expect(sigueAlTitular({ rsvpFollowsTitular: true })).toBe(true);
  });

  /** Cambiarlo a mano es decir «este va por libre»: no se le pisa después. */
  it('cambiado a mano, ya no', () => {
    expect(sigueAlTitular({ rsvpFollowsTitular: false })).toBe(false);
  });
});
