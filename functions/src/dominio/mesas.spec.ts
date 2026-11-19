import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  MAXIMO_ASIENTOS,
  TOPES_INICIALES,
  avisosDeMesas,
  nombreDeMesa,
  resumenDeMesas,
  sanearMesas,
  sentadosEn,
  sinMesa,
  type InvitadoSentado,
  type Mesa,
} from './mesas';

const MARCA = '// === COPIA LITERAL';

function cuerpo(ruta: string): string {
  const texto = readFileSync(new URL(ruta, import.meta.url), 'utf8');
  const inicio = texto.indexOf(MARCA);
  expect(inicio, `no se encontró "${MARCA}" en ${ruta}`).toBeGreaterThanOrEqual(0);
  return texto.slice(inicio);
}

describe('copia de las mesas', () => {
  it('es idéntica a la del panel', () => {
    expect(cuerpo('./mesas.ts')).toBe(cuerpo('../../../src/app/features/panel/mesas/mesas.ts'));
  });
});

function mesa(parcial: Partial<Mesa> & { id: string }): Mesa {
  return {
    name: '',
    shape: 'round',
    minSeats: 8,
    maxSeats: 12,
    order: 1,
    notes: '',
    ...parcial,
  };
}

function invitado(parcial: Partial<InvitadoSentado> & { id: string }): InvitadoSentado {
  return {
    fullName: `Invitado ${parcial.id}`,
    rsvpStatus: 'confirmed',
    tableId: null,
    isCompanion: false,
    invitedById: null,
    groupIds: [],
    ...parcial,
  };
}

describe('los topes de partida', () => {
  /** Lo que pidió Gabriel: no son un límite, son por dónde empieza una mesa. */
  it('una redonda nace de 8 a 12 y una rectangular de 12 a 50', () => {
    expect(TOPES_INICIALES.round).toEqual({ min: 8, max: 12 });
    expect(TOPES_INICIALES.rect).toEqual({ min: 12, max: 50 });
  });

  it('la pareja puede subirlos y bajarlos', () => {
    const [guardada] = sanearMesas([{ id: 'm1', shape: 'round', minSeats: 2, maxSeats: 14 }]);

    expect(guardada?.minSeats).toBe(2);
    expect(guardada?.maxSeats).toBe(14);
  });
});

describe('sanearMesas', () => {
  it('a una mesa sin topes le pone los de su forma', () => {
    const mesas = sanearMesas([
      { id: 'm1', shape: 'rect' },
      { id: 'm2', shape: 'round' },
    ]);

    expect(mesas[0]).toMatchObject({ minSeats: 12, maxSeats: 50 });
    expect(mesas[1]).toMatchObject({ minSeats: 8, maxSeats: 12 });
  });

  it('ante una forma desconocida, redonda', () => {
    expect(sanearMesas([{ id: 'm1', shape: 'triangular' }])[0]?.shape).toBe('round');
  });

  /** Un mínimo por encima del máximo deja la mesa imposible de cuadrar. */
  it('no deja un mínimo mayor que el máximo', () => {
    const [guardada] = sanearMesas([{ id: 'm1', minSeats: 20, maxSeats: 8 }]);
    expect(guardada?.maxSeats).toBe(20);
  });

  it('acota lo disparatado y lo negativo', () => {
    const [guardada] = sanearMesas([{ id: 'm1', minSeats: -5, maxSeats: 10_000 }]);
    expect(guardada?.minSeats).toBe(0);
    expect(guardada?.maxSeats).toBe(MAXIMO_ASIENTOS);
  });

  it('no repite una mesa ni se cae con basura', () => {
    expect(sanearMesas([{ id: 'm1' }, { id: 'm1' }, null, 42, {}])).toHaveLength(1);
    expect(sanearMesas('mesas')).toEqual([]);
  });

  it('las ordena', () => {
    const mesas = sanearMesas([
      { id: 'b', order: 2 },
      { id: 'a', order: 1 },
    ]);
    expect(mesas.map((m) => m.id)).toEqual(['a', 'b']);
  });
});

describe('quién se sienta', () => {
  const invitados = [
    invitado({ id: 'a', tableId: 'm1' }),
    invitado({ id: 'b', tableId: 'm1', rsvpStatus: 'declined' }),
    invitado({ id: 'c', tableId: 'm1', rsvpStatus: 'pending' }),
    invitado({ id: 'd', tableId: null }),
  ];

  /** Sentar a quien ha dicho que no es pagarle el cubierto. */
  it('solo se sientan los que vienen', () => {
    expect(sentadosEn('m1', invitados).map((i) => i.id)).toEqual(['a']);
  });

  it('los que faltan por sentar son los confirmados sin mesa', () => {
    expect(sinMesa(invitados).map((i) => i.id)).toEqual(['d']);
  });

  it('cuenta sillas, sentados y pendientes', () => {
    const resumen = resumenDeMesas([mesa({ id: 'm1' }), mesa({ id: 'm2' })], invitados);
    expect(resumen).toEqual({ sentados: 1, porSentar: 1, sillas: 24 });
  });
});

/** §8.4: avisos, no bloqueos. */
describe('avisosDeMesas', () => {
  it('avisa de una mesa pasada de gente, y la deja pasar', () => {
    const invitados = Array.from({ length: 13 }, (_, n) =>
      invitado({ id: `i${n}`, tableId: 'm1' }),
    );

    expect(avisosDeMesas([mesa({ id: 'm1', maxSeats: 12 })], invitados)).toEqual([
      { tipo: 'pasada', mesaId: 'm1', sobran: 1 },
    ]);
  });

  it('avisa de una mesa corta', () => {
    const invitados = [invitado({ id: 'a', tableId: 'm1' })];

    expect(avisosDeMesas([mesa({ id: 'm1', minSeats: 8 })], invitados)).toEqual([
      { tipo: 'corta', mesaId: 'm1', faltan: 7 },
    ]);
  });

  /** Una mesa vacía no está corta: está sin montar, y eso ya se ve. */
  it('una mesa vacía no saca aviso', () => {
    expect(avisosDeMesas([mesa({ id: 'm1' })], [])).toEqual([]);
  });

  it('avisa del acompañante separado de quien lo apuntó', () => {
    const invitados = [
      invitado({ id: 'titular', tableId: 'm1' }),
      invitado({ id: 'mas-uno', tableId: 'm2', isCompanion: true, invitedById: 'titular' }),
    ];

    expect(avisosDeMesas([mesa({ id: 'm1' }), mesa({ id: 'm2' })], invitados)).toContainEqual({
      tipo: 'separado',
      invitadoId: 'mas-uno',
      titularId: 'titular',
    });
  });

  it('con el acompañante al lado de su titular, no dice nada', () => {
    const invitados = [
      invitado({ id: 'titular', tableId: 'm1' }),
      invitado({ id: 'mas-uno', tableId: 'm1', isCompanion: true, invitedById: 'titular' }),
    ];

    // Mínimo a dos para que no se cuele el aviso de mesa corta, que aquí no
    // es lo que se está probando.
    expect(avisosDeMesas([mesa({ id: 'm1', minSeats: 2 })], invitados)).toEqual([]);
  });

  /** Mientras el titular no tiene mesa, no hay separación de la que avisar. */
  it('no avisa si el titular todavía no está sentado', () => {
    const invitados = [
      invitado({ id: 'titular', tableId: null }),
      invitado({ id: 'mas-uno', tableId: 'm1', isCompanion: true, invitedById: 'titular' }),
    ];

    expect(avisosDeMesas([mesa({ id: 'm1', minSeats: 1 })], invitados)).toEqual([]);
  });
});

describe('nombreDeMesa', () => {
  it('usa el de la pareja, y si no, el número', () => {
    expect(nombreDeMesa(mesa({ id: 'm1', name: 'Los de la uni' }), 3)).toBe('Los de la uni');
    expect(nombreDeMesa(mesa({ id: 'm1' }), 3)).toBe('Mesa 3');
  });
});
