import { describe, expect, it } from 'vitest';

import {
  MAX_NOMBRE,
  exigeTelefono,
  heredarDelTitular,
  puedeAnadir,
  validarAcompanante,
  type Titular,
  MAX_EN_UN_LOTE,
  idsDelLote,
  validarLoteDeCupo,
} from './acompanantes';
import { normalizarTelefono } from './invitados';

/**
 * Acompañantes añadidos por el invitado.
 *
 * Lo que se vigila, por orden de lo que costaría si se rompe:
 *
 * 1. **El cupo se cuenta con lo que hay escrito.** Dos pestañas abiertas mandan
 *    el mismo alta dos veces; si el cupo saliera del cliente, la pareja se
 *    encuentra comensales de más y lo descubre el día del banquete.
 * 2. **Un acompañante no añade acompañantes.** Sin eso, el cupo de uno se vuelve
 *    una cadena.
 * 3. **Los grupos se heredan.** Es seguridad: los grupos deciden quién ve qué
 *    fotos.
 */

function titular(parcial: Partial<Titular> = {}): Titular {
  return {
    id: 'g1',
    isCompanion: false,
    maxCompanions: 2,
    groupIds: ['uni', 'familia'],
    active: true,
    ...parcial,
  };
}

describe('puedeAnadir', () => {
  it('con cupo libre, dice cuántos quedan', () => {
    expect(puedeAnadir(true, titular(), 0)).toEqual({ puede: true, quedan: 2 });
    expect(puedeAnadir(true, titular(), 1)).toEqual({ puede: true, quedan: 1 });
  });

  it('con el cupo lleno, no', () => {
    expect(puedeAnadir(true, titular(), 2)).toEqual({ puede: false, motivo: 'cupo-lleno' });
  });

  /** Ya pasó con el cupo de los grupos: contar mal por arriba cuesta dinero. */
  it('pasado el cupo por lo que sea, tampoco', () => {
    expect(puedeAnadir(true, titular(), 5)).toEqual({ puede: false, motivo: 'cupo-lleno' });
  });

  it('con el interruptor de la boda apagado, nadie añade a nadie', () => {
    expect(puedeAnadir(false, titular(), 0)).toEqual({ puede: false, motivo: 'modulo-apagado' });
  });

  it('sin cupo asignado, no: el cupo lo decide la pareja invitado por invitado', () => {
    expect(puedeAnadir(true, titular({ maxCompanions: 0 }), 0)).toEqual({
      puede: false,
      motivo: 'sin-cupo',
    });
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

describe('validarLoteDeCupo', () => {
  it('un lote normal no tiene nada que objetar', () => {
    expect(validarLoteDeCupo(['a', 'b'], 1, 10)).toEqual([]);
    expect(validarLoteDeCupo(['a'], 0, 10)).toEqual([]);
  });

  it('sin invitados no hay nada que hacer', () => {
    expect(validarLoteDeCupo([], 1, 10)).toEqual(['sin-invitados']);
    expect(validarLoteDeCupo([null, 42, ''], 1, 10)).toEqual(['sin-invitados']);
  });

  /** El cupo es un número pequeño y entero: ni 1.5, ni -1, ni cien. */
  it('un cupo que no es un número entero dentro del tope se rechaza', () => {
    expect(validarLoteDeCupo(['a'], -1, 10)).toEqual(['cupo-invalido']);
    expect(validarLoteDeCupo(['a'], 1.5, 10)).toEqual(['cupo-invalido']);
    expect(validarLoteDeCupo(['a'], 11, 10)).toEqual(['cupo-invalido']);
    expect(validarLoteDeCupo(['a'], '2', 10)).toEqual(['cupo-invalido']);
  });

  it('un lote enorme se corta antes de escribir nada', () => {
    const muchos = Array.from({ length: MAX_EN_UN_LOTE + 1 }, (_, i) => `g${i}`);
    expect(validarLoteDeCupo(muchos, 1, 10)).toEqual(['demasiados']);
  });
});

describe('idsDelLote', () => {
  it('quita repetidos y lo que no es un id', () => {
    expect(idsDelLote(['a', 'a', '', null, 7, 'b'])).toEqual(['a', 'b']);
  });
});
