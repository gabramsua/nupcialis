import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  apuntadosQueNoVinieron,
  diaValido,
  nombreDe,
  resumenDeRecibidos,
  sanearRecibidos,
  vinieronSinApuntar,
  type RegaloRecibido,
} from './recibidos';

const MARCA = '// === COPIA LITERAL';

function cuerpo(ruta: string): string {
  const texto = readFileSync(new URL(ruta, import.meta.url), 'utf8');
  const inicio = texto.indexOf(MARCA);
  expect(inicio, `no se encontró "${MARCA}" en ${ruta}`).toBeGreaterThanOrEqual(0);
  return texto.slice(inicio);
}

describe('copia de los regalos recibidos', () => {
  it('es idéntica a la del cliente', () => {
    expect(cuerpo('./recibidos.ts')).toBe(
      cuerpo('../../../src/app/features/panel/regalos/recibidos.ts'),
    );
  });
});

function crudo(parcial: Record<string, unknown> = {}) {
  return {
    id: 'r1',
    guestId: 'g1',
    fromLabel: '',
    amount: 200,
    method: 'bizum',
    giftDescription: '',
    receivedAt: '2027-06-13',
    thanked: false,
    notes: '',
    ...parcial,
  };
}

function recibido(parcial: Partial<RegaloRecibido> & { id: string }): RegaloRecibido {
  return {
    guestId: null,
    fromLabel: 'Alguien',
    amount: null,
    method: 'other',
    giftDescription: '',
    receivedAt: '2027-06-13',
    thanked: false,
    thankedAt: null,
    notes: '',
    ...parcial,
  };
}

describe('el cuaderno de lo recibido', () => {
  /**
   * Al revés que en los módulos públicos: aquí casi nada se cae. Una anotación
   * a medias sigue siendo dinero que ha entrado.
   */
  it('conserva lo apuntado a medias, que sigue siendo dinero', () => {
    const lista = sanearRecibidos([
      crudo({ id: 'a', guestId: '', fromLabel: '', amount: 50 }),
      crudo({ id: 'b', method: 'lo-que-sea', receivedAt: 'ayer' }),
    ]);

    expect(lista).toHaveLength(2);
    expect(lista.find((r) => r.id === 'a')?.amount).toBe(50);
    // Un método desconocido no borra la anotación: cae en «otro».
    expect(lista.find((r) => r.id === 'b')?.method).toBe('other');
  });

  it('lo sin id sí se cae: sin id no se puede ni editar ni borrar', () => {
    expect(sanearRecibidos([crudo({ id: '' })])).toHaveLength(0);
  });

  it('ordena lo último primero', () => {
    const lista = sanearRecibidos([
      crudo({ id: 'vieja', receivedAt: '2027-06-10' }),
      crudo({ id: 'nueva', receivedAt: '2027-06-20' }),
    ]);

    expect(lista.map((r) => r.id)).toEqual(['nueva', 'vieja']);
  });

  it('acepta una fecha de Firestore y la deja en el día', () => {
    expect(diaValido({ toDate: () => new Date('2027-06-13T22:00:00.000Z') })).toBe('2027-06-13');
    expect(diaValido('mañana')).toBeNull();
  });
});

describe('los totales', () => {
  /**
   * Lo que no es dinero no suma. Ponerle precio a la vajilla de la tía sería
   * el principio de un ranking de invitados, que §8.8 dice que no se hace.
   */
  it('suma solo lo que lleva importe y cuenta aparte lo demás', () => {
    const resumen = resumenDeRecibidos([
      recibido({ id: 'a', amount: 200, method: 'bizum' }),
      recibido({ id: 'b', amount: 100, method: 'cash' }),
      recibido({ id: 'c', method: 'gift', giftDescription: 'La vajilla' }),
    ]);

    expect(resumen.total).toBe(300);
    expect(resumen.cuantos).toBe(3);
    expect(resumen.enEspecie).toBe(1);
  });

  it('da el total por método, sin métodos vacíos', () => {
    const resumen = resumenDeRecibidos([
      recibido({ id: 'a', amount: 200, method: 'bizum' }),
      recibido({ id: 'b', amount: 50, method: 'bizum' }),
    ]);

    expect(resumen.porMetodo).toEqual([{ method: 'bizum', cuantos: 2, total: 250 }]);
  });

  it('cuenta lo que queda por agradecer, que es el trabajo de la semana', () => {
    const resumen = resumenDeRecibidos([
      recibido({ id: 'a', thanked: true }),
      recibido({ id: 'b' }),
      recibido({ id: 'c' }),
    ]);

    expect(resumen.sinAgradecer).toBe(2);
  });
});

describe('el cruce con la lista de invitados', () => {
  const INVITADOS = [
    { id: 'g1', fullName: 'Ana Ruiz', rsvpStatus: 'confirmed', isCompanion: false },
    { id: 'g2', fullName: 'Pepe García', rsvpStatus: 'confirmed', isCompanion: false },
    { id: 'g3', fullName: 'Hijo de Pepe', rsvpStatus: 'confirmed', isCompanion: true },
    { id: 'g4', fullName: 'Marta Olmo', rsvpStatus: 'declined', isCompanion: false },
  ];

  it('dice quién vino y no tiene nada apuntado', () => {
    const sueltos = vinieronSinApuntar(INVITADOS, [recibido({ id: 'r1', guestId: 'g1' })]);

    expect(sueltos.map((c) => c.guestId)).toEqual(['g2']);
  });

  /** Lo que la pareja llevó vino en un sobre, no en tres. */
  it('los acompañantes no cuentan como cabos sueltos', () => {
    const sueltos = vinieronSinApuntar(INVITADOS, []);

    expect(sueltos.map((c) => c.guestId)).not.toContain('g3');
  });

  /**
   * Y al revés: quien no pudo ir y mandó algo igual. No es un error, es a
   * quien más se agradece, y sale para que no se quede sin agradecer.
   */
  it('saca lo apuntado de quien no vino, y sin repetir', () => {
    const otros = apuntadosQueNoVinieron(INVITADOS, [
      recibido({ id: 'r1', guestId: 'g4' }),
      recibido({ id: 'r2', guestId: 'g4' }),
    ]);

    expect(otros).toEqual([{ guestId: 'g4', nombre: 'Marta Olmo' }]);
  });
});

describe('cómo firma cada anotación', () => {
  it('con el nombre del invitado si está vinculada', () => {
    const r = recibido({ id: 'a', guestId: 'g1', fromLabel: 'Lo que sea' });
    expect(nombreDe(r, () => 'Ana Ruiz')).toBe('Ana Ruiz');
  });

  it('con lo que se escribió si no se pudo vincular a nadie', () => {
    const r = recibido({ id: 'a', fromLabel: 'Los vecinos del 3ºB' });
    expect(nombreDe(r, () => null)).toBe('Los vecinos del 3ºB');
  });

  it('y si el invitado vinculado ya no existe, con lo escrito', () => {
    const r = recibido({ id: 'a', guestId: 'borrado', fromLabel: 'Los vecinos' });
    expect(nombreDe(r, () => null)).toBe('Los vecinos');
  });
});
