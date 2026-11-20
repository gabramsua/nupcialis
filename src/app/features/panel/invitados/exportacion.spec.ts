import { describe, expect, it } from 'vitest';

import type { Grupo } from '../../../core/invitados/grupos-gateway';
import type { Invitado } from '../../../core/invitados/invitados-gateway';
import type { Pregunta } from '../../../core/rsvp/rsvp-gateway';
import type { RespuestasDeInvitado } from '../../../core/rsvp/respuestas-gateway';
import {
  HOJA_CATERING,
  HOJA_INVITADOS,
  HOJA_RESPUESTAS,
  hojaDeRespuestas,
  hojaDeInvitados,
  hojaParaCatering,
  hojas,
  nombreDelFichero,
  resumenDeMenus,
  type Etiquetas,
} from './exportacion';
import { GRUPOS_DE_PRUEBA, INVITADO_DE_PRUEBA } from './dobles.testing';

/**
 * La hoja que se descarga.
 *
 * Lo que se vigila, por orden:
 *
 * 1. **La hoja del catering no lleva teléfonos, correos ni notas.** Ese fichero
 *    sale por correo a una empresa de fuera; las notas son privadas de la pareja
 *    y los teléfonos no le hacen falta a quien cocina (§9.4).
 * 2. **Solo van los que vienen** en esa hoja. Si fuera la lista entera, el
 *    catering contaría comensales que no van.
 * 3. Los códigos del modelo no salen a la hoja: «confirmed» no se lo lee nadie.
 */

const ETIQUETAS: Etiquetas = {
  estado: { confirmed: 'Confirmado', declined: 'No viene', pending: 'Sin contestar' },
  edad: { adult: 'Adulto', child: 'Niño', baby: 'Bebé' },
  lado: { A: 'De María', B: 'De Gabriel', both: 'De los dos' },
  si: 'Sí',
  no: 'No',
};

function invitado(parcial: Partial<Invitado>): Invitado {
  return { ...INVITADO_DE_PRUEBA, ...parcial };
}

const VIENE = invitado({
  id: 'g1',
  fullName: 'Ana Ruiz',
  nickname: 'Anita',
  phone: '+34600111222',
  rsvpStatus: 'confirmed',
  menu: 'Vegano',
  allergies: 'Nueces',
  tableId: 'mesa-3',
  notes: 'La prima de mi madre',
  side: 'A',
  groupIds: ['uni'],
  loginCount: 3,
});

const NO_VIENE = invitado({ id: 'g2', fullName: 'Borja Gil', rsvpStatus: 'declined' });
const SIN_CONTESTAR = invitado({ id: 'g3', fullName: 'Carmen Díaz', ageGroup: 'child' });

const GRUPOS: readonly Grupo[] = GRUPOS_DE_PRUEBA;

function datos(invitados: readonly Invitado[]) {
  return {
    invitados,
    grupos: GRUPOS,
    etiquetas: ETIQUETAS,
    mesaDe: (id: string | null) => (id === 'mesa-3' ? 'Los de la uni' : ''),
  };
}

describe('la hoja de invitados', () => {
  it('lleva una fila por invitado, en orden alfabético', () => {
    const hoja = hojaDeInvitados(datos([SIN_CONTESTAR, VIENE, NO_VIENE]));

    expect(hoja.nombre).toBe(HOJA_INVITADOS);
    expect(hoja.filas.map((f) => f[0])).toEqual(['Ana Ruiz', 'Borja Gil', 'Carmen Díaz']);
  });

  it('traduce los códigos del modelo: nadie lee «confirmed»', () => {
    const fila = hojaDeInvitados(datos([VIENE])).filas[0]!;

    expect(fila).toContain('Confirmado');
    expect(fila).toContain('Adulto');
    expect(fila).toContain('De María');
    expect(fila).not.toContain('confirmed');
  });

  it('pone los grupos por nombre, no por identificador', () => {
    const fila = hojaDeInvitados(datos([VIENE])).filas[0]!;

    expect(fila).toContain('Universidad');
    expect(fila).not.toContain('uni');
  });

  it('la pareja sí ve el teléfono y sus notas', () => {
    const fila = hojaDeInvitados(datos([VIENE])).filas[0]!;

    expect(fila).toContain('+34600111222');
    expect(fila).toContain('La prima de mi madre');
  });

  it('dice quién trae a cada acompañante', () => {
    const acompanante = invitado({
      id: 'g9',
      fullName: 'Zoe Luz',
      isCompanion: true,
      invitedById: 'g1',
    });
    const fila = hojaDeInvitados(datos([VIENE, acompanante])).filas[1]!;

    expect(fila).toContain('Ana Ruiz');
  });

  it('cada columna tiene su título, y son tantos como celdas', () => {
    const hoja = hojaDeInvitados(datos([VIENE]));

    expect(hoja.columnas.length).toBe(hoja.filas[0]!.length);
    expect(hoja.columnas[0]?.titulo).toBe('Nombre');
  });
});

describe('la hoja del catering', () => {
  /** **La prueba que importa.** Ese fichero sale a una empresa de fuera. */
  it('no lleva teléfonos ni las notas de la pareja', () => {
    const hoja = hojaParaCatering(datos([VIENE]));
    const todo = JSON.stringify(hoja);

    expect(todo).not.toContain('+34600111222');
    expect(todo).not.toContain('La prima de mi madre');
    expect(hoja.columnas.map((c) => c.titulo)).toEqual([
      'Nombre',
      'Edad',
      'Menú',
      'Alergias',
      'Mesa',
    ]);
  });

  it('solo van los que vienen', () => {
    const hoja = hojaParaCatering(datos([VIENE, NO_VIENE, SIN_CONTESTAR]));

    expect(hoja.nombre).toBe(HOJA_CATERING);
    expect(hoja.filas.map((f) => f[0])).toEqual(['Ana Ruiz']);
  });

  it('lleva lo que hace falta para cocinar y para sentar', () => {
    expect(hojaParaCatering(datos([VIENE])).filas[0]).toEqual([
      'Ana Ruiz',
      'Adulto',
      'Vegano',
      'Nueces',
      'Los de la uni',
    ]);
  });

  it('la mesa sale con su nombre, nunca con el identificador de Firestore', () => {
    const sinMesas = { invitados: [VIENE], grupos: GRUPOS, etiquetas: ETIQUETAS };

    expect(JSON.stringify(hojaParaCatering(sinMesas))).not.toContain('mesa-3');
    expect(JSON.stringify(hojaDeInvitados(sinMesas))).not.toContain('mesa-3');
    expect(JSON.stringify(hojaDeInvitados(datos([VIENE])))).toContain('Los de la uni');
  });

  it('un niño sale como niño: el catering cuenta menús infantiles', () => {
    const nino = invitado({ fullName: 'Leo', ageGroup: 'child', rsvpStatus: 'confirmed' });

    expect(hojaParaCatering(datos([nino])).filas[0]).toContain('Niño');
  });
});

describe('el fichero', () => {
  it('lleva las dos hojas, la de la pareja primero', () => {
    expect(hojas(datos([VIENE])).map((h) => h.nombre)).toEqual([HOJA_INVITADOS, HOJA_CATERING]);
  });

  it('se llama con el slug y la fecha, porque va a haber cinco en Descargas', () => {
    expect(nombreDelFichero('mms', new Date('2026-11-11T09:00:00Z'))).toBe(
      'invitados-mms-2026-11-11.xlsx',
    );
  });

  it('un slug raro no se cuela en el nombre del fichero', () => {
    expect(nombreDelFichero('../../etc/passwd', new Date('2026-11-11T09:00:00Z'))).toBe(
      'invitados-etcpasswd-2026-11-11.xlsx',
    );
    expect(nombreDelFichero('', new Date('2026-11-11T09:00:00Z'))).toBe(
      'invitados-boda-2026-11-11.xlsx',
    );
  });
});

describe('resumenDeMenus', () => {
  /** Lo primero que pregunta el catering: cuántos de cada cosa. */
  it('cuenta solo los que vienen, de mayor a menor', () => {
    const lista = [
      invitado({ id: '1', rsvpStatus: 'confirmed', menu: 'Normal' }),
      invitado({ id: '2', rsvpStatus: 'confirmed', menu: 'Vegano' }),
      invitado({ id: '3', rsvpStatus: 'confirmed', menu: 'Normal' }),
      invitado({ id: '4', rsvpStatus: 'declined', menu: 'Normal' }),
      invitado({ id: '5', rsvpStatus: 'pending', menu: 'Normal' }),
    ];

    expect(resumenDeMenus(lista)).toEqual([
      { menu: 'Normal', cuantos: 2 },
      { menu: 'Vegano', cuantos: 1 },
    ]);
  });

  it('quien viene y no ha elegido menú también se cuenta', () => {
    const lista = [invitado({ rsvpStatus: 'confirmed', menu: '' })];

    expect(resumenDeMenus(lista)).toEqual([{ menu: '', cuantos: 1 }]);
  });
});

/**
 * Lo escrito en el formulario, en su hoja (F1.8g).
 *
 * El motivo: una canción pedida o una alergia escrita a mano se leían en el
 * panel y no salían en la hoja, que es lo que la pareja imprime, manda a la
 * finca y mira el día de antes.
 */
describe('la hoja de respuestas', () => {
  function pregunta(parcial: Partial<Pregunta> & { id: string }): Pregunta {
    return {
      label: parcial.id,
      helpText: '',
      type: 'text',
      options: [],
      required: false,
      visibleIf: null,
      order: 1,
      ...parcial,
    };
  }

  function contesto(nombre: string, respuestas: Record<string, unknown>): RespuestasDeInvitado {
    return {
      guestId: nombre,
      nombre,
      mote: '',
      estado: 'confirmed',
      cuando: '2027-01-10T10:00:00.000Z',
      respuestas,
    };
  }

  const CANCION = pregunta({ id: 'cancion', label: '¿Qué canción no puede faltar?' });
  const MENSAJE = pregunta({ id: 'mensaje', label: 'Un mensaje', type: 'textarea' });
  const MENU = pregunta({
    id: 'menu',
    label: 'Menú',
    type: 'select',
    options: [{ value: 'vegano', label: 'Vegano' }],
  });

  it('una columna por pregunta escrita, y los nombres en orden', () => {
    const hoja = hojaDeRespuestas({
      preguntas: [CANCION, MENSAJE],
      invitados: [
        contesto('Zoe', { cancion: 'Despacito' }),
        contesto('Ana', { cancion: 'Bohemian Rhapsody', mensaje: 'Qué ganas' }),
      ],
    });

    expect(hoja?.nombre).toBe(HOJA_RESPUESTAS);
    expect(hoja?.columnas.map((c) => c.titulo)).toEqual([
      'Nombre',
      '¿Qué canción no puede faltar?',
      'Un mensaje',
    ]);
    expect(hoja?.filas).toEqual([
      ['Ana', 'Bohemian Rhapsody', 'Qué ganas'],
      ['Zoe', 'Despacito', ''],
    ]);
  });

  /** Las de opciones ya tienen su columna en la hoja de la pareja. */
  it('las preguntas de opciones no repiten columna', () => {
    const hoja = hojaDeRespuestas({
      preguntas: [MENU],
      invitados: [contesto('Ana', { menu: 'vegano' })],
    });

    expect(hoja).toBeNull();
  });

  /** Trescientas filas en blanco no son información. */
  it('quien no ha escrito nada no ocupa una fila', () => {
    const hoja = hojaDeRespuestas({
      preguntas: [CANCION],
      invitados: [contesto('Ana', { cancion: 'Despacito' }), contesto('Borja', { cancion: '' })],
    });

    expect(hoja?.filas).toEqual([['Ana', 'Despacito']]);
  });

  it('sin nadie que haya escrito, no hay hoja que enseñar', () => {
    expect(hojaDeRespuestas({ preguntas: [CANCION], invitados: [] })).toBeNull();
  });

  it('se añade a las otras dos, sin tocarlas', () => {
    const datos = {
      invitados: [invitado({ id: 'a', fullName: 'Ana', rsvpStatus: 'confirmed' as const })],
      grupos: GRUPOS_DE_PRUEBA,
      etiquetas: ETIQUETAS,
      formulario: {
        preguntas: [CANCION],
        invitados: [contesto('Ana', { cancion: 'Despacito' })],
      },
    };

    expect(hojas(datos).map((h) => h.nombre)).toEqual([
      HOJA_INVITADOS,
      HOJA_CATERING,
      HOJA_RESPUESTAS,
    ]);
  });

  /** Si falla la llamada que trae las respuestas, la hoja sale igual. */
  it('sin respuestas, la exportación sigue siendo las dos de siempre', () => {
    const datos = {
      invitados: [invitado({ id: 'a', fullName: 'Ana' })],
      grupos: GRUPOS_DE_PRUEBA,
      etiquetas: ETIQUETAS,
    };

    expect(hojas(datos).map((h) => h.nombre)).toEqual([HOJA_INVITADOS, HOJA_CATERING]);
  });
});
