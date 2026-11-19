import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  HUECO_LARGO,
  MAX_HITOS,
  huecos,
  minutosDelDia,
  sanearCronologia,
  solapes,
  type HitoPublico,
} from './cronologia';

const MARCA = '// === COPIA LITERAL';

function cuerpo(ruta: string): string {
  const texto = readFileSync(new URL(ruta, import.meta.url), 'utf8');
  const inicio = texto.indexOf(MARCA);
  expect(inicio, `no se encontró "${MARCA}" en ${ruta}`).toBeGreaterThanOrEqual(0);
  return texto.slice(inicio);
}

describe('copia de la cronología', () => {
  it('es idéntica a la del cliente', () => {
    expect(cuerpo('./cronologia.ts')).toBe(
      cuerpo('../../../src/app/features/public-site/cronologia/cronologia.ts'),
    );
  });
});

/**
 * **El detalle que decide si esto sirve o no**: una boda que empieza a las
 * cinco de la tarde acaba a las cinco de la mañana. «04:30» no es antes que
 * «17:00»: es doce horas después.
 */
describe('minutosDelDia', () => {
  it('cuenta las horas de la tarde tal cual', () => {
    expect(minutosDelDia('17:00')).toBe(17 * 60);
    expect(minutosDelDia('09:30')).toBe(9 * 60 + 30);
  });

  it('la madrugada va después, no antes', () => {
    expect(minutosDelDia('04:30')).toBeGreaterThan(minutosDelDia('23:00')!);
    expect(minutosDelDia('02:00')).toBe(26 * 60);
  });

  it('lo que no es una hora no es nada', () => {
    for (const malo of ['', 'media tarde', '25:00', '17:70', '17', null, 1700]) {
      expect(minutosDelDia(malo)).toBeNull();
    }
  });
});

function hito(parcial: Partial<Record<string, unknown>> & { id: string }) {
  return {
    time: '17:00',
    endTime: null,
    title: `Hito ${parcial.id}`,
    description: '',
    icon: 'church',
    color: 'rosa',
    order: 1,
    visibleToGuests: true,
    ...parcial,
  };
}

describe('sanearCronologia', () => {
  it('deja pasar un hito completo', () => {
    const salida = sanearCronologia([
      hito({ id: 'ceremonia', title: 'Ceremonia', time: '17:00', endTime: '17:45' }),
    ]);

    expect(salida).toEqual([
      {
        id: 'ceremonia',
        time: '17:00',
        endTime: '17:45',
        title: 'Ceremonia',
        description: '',
        icon: 'church',
        color: 'rosa',
        order: 1,
      },
    ]);
  });

  /**
   * Lo que de verdad protege el requisito: la hora a la que llega el fotógrafo
   * no es asunto de los invitados, y el documento público es lo único que leen.
   */
  it('lo interno no se publica', () => {
    expect(sanearCronologia([hito({ id: 'fotografo', visibleToGuests: false })])).toEqual([]);
  });

  it('sin hora válida o sin título, fuera', () => {
    expect(sanearCronologia([hito({ id: 'a', time: 'por la tarde' })])).toEqual([]);
    expect(sanearCronologia([hito({ id: 'b', title: '' })])).toEqual([]);
  });

  /** El orden **es** la hora: un `order` escrito a mano no la contradice. */
  it('ordena por hora, contando la madrugada como el final', () => {
    const salida = sanearCronologia([
      hito({ id: 'fin', time: '04:00', order: 1 }),
      hito({ id: 'ceremonia', time: '17:00', order: 99 }),
      hito({ id: 'baile', time: '23:30', order: 50 }),
    ]);

    expect(salida.map((h) => h.id)).toEqual(['ceremonia', 'baile', 'fin']);
  });

  it('un icono o un color que no están en la lista caen en el de serie', () => {
    const salida = sanearCronologia([hito({ id: 'a', icon: 'calavera', color: 'fucsia' })]);

    expect(salida[0]?.icon).toBe('clock');
    expect(salida[0]?.color).toBe('rosa');
  });

  it('no publica más hitos de los que caben', () => {
    const muchos = Array.from({ length: MAX_HITOS + 5 }, (_, i) => hito({ id: `h${i}` }));

    expect(sanearCronologia(muchos)).toHaveLength(MAX_HITOS);
  });

  it('lo que no es una lista no revienta', () => {
    expect(sanearCronologia(null)).toEqual([]);
    expect(sanearCronologia([null, 'hola', 42])).toEqual([]);
  });
});

function publico(id: string, time: string, endTime: string | null = null): HitoPublico {
  return {
    id,
    time,
    endTime,
    title: id,
    description: '',
    icon: 'clock',
    color: 'rosa',
    order: 1,
  };
}

describe('solapes', () => {
  it('avisa cuando un hito se mete dentro de otro', () => {
    const encontrados = solapes([publico('coctel', '19:00', '21:00'), publico('fotos', '20:00')]);

    expect(encontrados).toEqual([{ uno: 'coctel', otro: 'fotos' }]);
  });

  /** Uno acaba a las 18:00 y el otro empieza a las 18:00: no se pisan. */
  it('tocarse no es pisarse', () => {
    expect(solapes([publico('a', '17:00', '18:00'), publico('b', '18:00')])).toEqual([]);
  });

  it('sin hora de fin no hay solape que detectar', () => {
    expect(solapes([publico('a', '17:00'), publico('b', '17:10')])).toEqual([]);
  });

  it('también de madrugada', () => {
    expect(solapes([publico('barra', '00:30', '03:00'), publico('recena', '01:30')])).toEqual([
      { uno: 'barra', otro: 'recena' },
    ]);
  });

  it('una cronología sin solapes no inventa ninguno', () => {
    expect(solapes([publico('a', '17:00', '18:00'), publico('b', '19:00', '20:00')])).toEqual([]);
  });
});

describe('huecos', () => {
  it('avisa del rato largo en que no pasa nada', () => {
    const encontrados = huecos([publico('ceremonia', '17:00', '17:45'), publico('cena', '21:00')]);

    expect(encontrados).toEqual([{ despuesDe: 'ceremonia', antesDe: 'cena', minutos: 195 }]);
  });

  /** Hora y media entre el cóctel y el banquete es la vida normal de una boda. */
  it('hora y media no es un hueco', () => {
    expect(huecos([publico('coctel', '19:00', '20:00'), publico('cena', '21:30')])).toEqual([]);
    expect(HUECO_LARGO).toBe(120);
  });

  /**
   * El cambio que quitó el ruido: casi ningún hito lleva hora de fin, y
   * suponer que acaban en cuanto empiezan sacaba cuatro avisos en una agenda
   * de boda normal. Un aviso que salta siempre no lo lee nadie.
   */
  it('sin hora de fin no hay hueco: no se sabe cuánto dura', () => {
    expect(huecos([publico('ceremonia', '17:00'), publico('cena', '21:00')])).toEqual([]);
  });

  it('una agenda de boda normal no saca ningún aviso', () => {
    const dia = [
      publico('ceremonia', '17:00', '17:45'),
      publico('coctel', '18:00'),
      publico('banquete', '20:30'),
      publico('baile', '23:30'),
      publico('fin', '04:00'),
    ];

    expect(huecos(dia)).toEqual([]);
  });

  it('con un solo hito no hay huecos', () => {
    expect(huecos([publico('a', '17:00')])).toEqual([]);
  });
});
