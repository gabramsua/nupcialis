import { describe, expect, it } from 'vitest';

import type { Invitado } from '../../../core/invitados/invitados-gateway';
import { INVITADO_DE_PRUEBA } from '../invitados/dobles.testing';
import {
  HOJA_POR_MESA,
  HOJA_RESUMEN,
  HOJA_SIN_MESA,
  hojaPorMesa,
  hojaResumen,
  hojaSinMesa,
  hojasDeMesas,
  nombreDeMesaPorId,
  nombreDelFicheroDeMesas,
  type DatosDeMesas,
  type EtiquetasDeMesas,
} from './exportar-mesas';
import type { Mesa } from './mesas';

/**
 * La hoja que se manda al catering con el plano de mesas.
 *
 * Lo que se vigila, por orden:
 *
 * 1. **No lleva teléfonos, correos ni notas**: sale por correo a una empresa.
 * 2. **Solo se sientan los que vienen**: una silla de alguien que dijo que no es
 *    una silla que se cobra.
 * 3. **Los menús se cuentan por mesa**, que es lo que no se ve en una lista.
 * 4. **Los confirmados sin mesa salen aparte**, para que no se mande «terminado»
 *    un reparto que no lo está.
 */

const ETIQUETAS: EtiquetasDeMesas = {
  edad: { adult: 'Adulto', child: 'Niño', baby: 'Bebé' },
  forma: { round: 'Redonda', rect: 'Rectangular' },
  estado: { bien: 'Bien', corta: 'Corta', pasada: 'Pasada', vacia: 'Vacía' },
  sinMenu: 'Sin menú',
  total: 'Total',
};

function mesa(parcial: Partial<Mesa> & { id: string }): Mesa {
  return {
    name: '',
    shape: 'round',
    minSeats: 2,
    maxSeats: 3,
    order: 0,
    notes: '',
    ...parcial,
  };
}

function invitado(parcial: Partial<Invitado>): Invitado {
  return { ...INVITADO_DE_PRUEBA, rsvpStatus: 'confirmed', ...parcial };
}

const MESAS = [
  mesa({ id: 'm1', name: 'Los novios', order: 1 }),
  mesa({ id: 'm2', name: '', order: 2 }),
  mesa({ id: 'm3', name: 'Vacía', order: 3 }),
];

const INVITADOS = [
  invitado({
    id: 'a',
    fullName: 'Ana Ruiz',
    tableId: 'm1',
    menu: 'Vegano',
    allergies: 'Nueces',
    phone: '+34600111222',
    notes: 'La prima de mi madre',
  }),
  invitado({ id: 'b', fullName: 'Borja Gil', tableId: 'm1', menu: 'Carne' }),
  invitado({ id: 'c', fullName: 'Carmen Díaz', tableId: 'm1', menu: 'Carne' }),
  invitado({ id: 'd', fullName: 'Dani Soto', tableId: 'm1', menu: '' }),
  invitado({
    id: 'e',
    fullName: 'Eva Lara',
    tableId: 'm2',
    menu: 'Pescado',
    ageGroup: 'child',
    isCompanion: true,
    invitedById: 'a',
  }),
  invitado({ id: 'f', fullName: 'Félix Vega', tableId: 'm2', rsvpStatus: 'declined' }),
  invitado({ id: 'g', fullName: 'Gema Pons', tableId: null, menu: 'Carne' }),
  invitado({ id: 'h', fullName: 'Hugo Rey', tableId: null, rsvpStatus: 'pending' }),
];

const DATOS: DatosDeMesas = { mesas: MESAS, invitados: INVITADOS, etiquetas: ETIQUETAS };

describe('la hoja de resumen', () => {
  const hoja = hojaResumen(DATOS);

  it('lleva una fila por mesa y una de totales', () => {
    expect(hoja.nombre).toBe(HOJA_RESUMEN);
    expect(hoja.filas.map((f) => f[0])).toEqual(['Los novios', 'Mesa 2', 'Vacía', 'Total']);
  });

  it('dice si la mesa está bien, corta, pasada o vacía', () => {
    const estados = hoja.filas.slice(0, 3).map((f) => f[5]);
    // m1 tiene cuatro para un máximo de tres; m2 tiene uno para un mínimo de dos.
    expect(estados).toEqual(['Pasada', 'Corta', 'Vacía']);
  });

  it('no cuenta al que no viene', () => {
    expect(hoja.filas[1]![4]).toBe(1);
  });

  it('cuenta cuántos hay de cada menú, y los sin menú aparte', () => {
    const titulos = hoja.columnas.map((c) => c.titulo);
    const fila = hoja.filas[0]!;

    expect(titulos.slice(6, -1).sort()).toEqual(['Carne', 'Pescado', 'Sin menú', 'Vegano']);
    expect(fila[titulos.indexOf('Carne')]).toBe(2);
    expect(fila[titulos.indexOf('Vegano')]).toBe(1);
    expect(fila[titulos.indexOf('Sin menú')]).toBe(1);
    expect(fila[titulos.indexOf('Pescado')]).toBe(0);
  });

  it('cuenta las alergias por mesa y suma los totales', () => {
    const alergias = hoja.columnas.length - 1;
    expect(hoja.filas[0]![alergias]).toBe(1);

    const total = hoja.filas.at(-1)!;
    expect(total[4]).toBe(5);
    expect(total[alergias]).toBe(1);
  });

  it('sin mesas no hay ni fila de totales', () => {
    expect(hojaResumen({ ...DATOS, mesas: [] }).filas).toEqual([]);
  });
});

describe('la hoja por mesa', () => {
  const hoja = hojaPorMesa(DATOS);

  it('va por mesas, y dentro de cada una en orden alfabético', () => {
    expect(hoja.nombre).toBe(HOJA_POR_MESA);
    expect(hoja.filas.map((f) => [f[0], f[1]])).toEqual([
      ['Los novios', 'Ana Ruiz'],
      ['Los novios', 'Borja Gil'],
      ['Los novios', 'Carmen Díaz'],
      ['Los novios', 'Dani Soto'],
      ['Mesa 2', 'Eva Lara'],
    ]);
  });

  it('lleva el menú y las alergias, y quién trae a un acompañante', () => {
    const ana = hoja.filas[0]!;
    const eva = hoja.filas[4]!;

    expect(ana.slice(2, 5)).toEqual(['Adulto', 'Vegano', 'Nueces']);
    expect(eva.slice(2, 6)).toEqual(['Niño', 'Pescado', '', 'Ana Ruiz']);
  });

  it('un invitado sin menú sale como «Sin menú», no como un hueco', () => {
    expect(hoja.filas[3]![3]).toBe('Sin menú');
  });

  it('no lleva teléfonos, correos ni notas', () => {
    const todo = JSON.stringify(hojasDeMesas(DATOS));

    expect(todo).not.toContain('+34600111222');
    expect(todo).not.toContain('La prima de mi madre');
  });
});

describe('la hoja de los que no tienen mesa', () => {
  it('lleva solo a los confirmados sin sitio', () => {
    const hoja = hojaSinMesa(DATOS)!;

    expect(hoja.nombre).toBe(HOJA_SIN_MESA);
    expect(hoja.filas.map((f) => f[0])).toEqual(['Gema Pons']);
  });

  it('un invitado en una mesa que ya no existe también está sin sitio', () => {
    const huerfano = invitado({ id: 'z', fullName: 'Zoe Mar', tableId: 'borrada' });
    const hoja = hojaSinMesa({ ...DATOS, invitados: [huerfano] })!;

    expect(hoja.filas.map((f) => f[0])).toEqual(['Zoe Mar']);
  });

  it('si no queda nadie, no hay hoja: un reparto terminado no lleva una vacía', () => {
    const sentados = INVITADOS.filter((i) => i.tableId !== null);

    expect(hojaSinMesa({ ...DATOS, invitados: sentados })).toBeNull();
    expect(hojasDeMesas({ ...DATOS, invitados: sentados }).map((h) => h.nombre)).toEqual([
      HOJA_RESUMEN,
      HOJA_POR_MESA,
    ]);
  });

  it('con gente sin sentar, son tres hojas', () => {
    expect(hojasDeMesas(DATOS).map((h) => h.nombre)).toEqual([
      HOJA_RESUMEN,
      HOJA_POR_MESA,
      HOJA_SIN_MESA,
    ]);
  });
});

describe('el nombre de una mesa por su identificador', () => {
  const nombre = nombreDeMesaPorId(MESAS);

  it('usa el que puso la pareja o «Mesa n»', () => {
    expect(nombre('m1')).toBe('Los novios');
    expect(nombre('m2')).toBe('Mesa 2');
  });

  it('un identificador desconocido sale vacío, nunca el identificador', () => {
    expect(nombre('borrada')).toBe('');
    expect(nombre(null)).toBe('');
  });
});

describe('el nombre del fichero', () => {
  it('lleva el slug y la fecha', () => {
    expect(nombreDelFicheroDeMesas('ana-juan', new Date('2027-06-12T10:00:00Z'))).toBe(
      'mesas-ana-juan-2027-06-12.xlsx',
    );
  });

  it('un slug raro no rompe el nombre', () => {
    expect(nombreDelFicheroDeMesas('../x y', new Date('2027-06-12T10:00:00Z'))).toBe(
      'mesas-xy-2027-06-12.xlsx',
    );
  });
});
