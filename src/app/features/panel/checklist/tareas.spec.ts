import { describe, expect, it } from 'vitest';

import {
  agruparTareas,
  campoDeFecha,
  compararTareas,
  diasHasta,
  erroresDeTarea,
  esDe,
  estadoDeTarea,
  fechaDeCampo,
  filtrarTareas,
  iconoDeTarea,
  resumirTareas,
  tareasUrgentes,
  MAX_TITULO_TAREA,
  SIN_FILTROS,
  type TareaDelPanel,
} from './tareas';

// Un miércoles cualquiera. Las fechas de las tareas son medianoche UTC.
const AHORA = new Date(2027, 2, 10, 15, 30);

function dia(texto: string): Date {
  return new Date(`${texto}T00:00:00.000Z`);
}

function tarea(parcial: Partial<TareaDelPanel> & { id: string }): TareaDelPanel {
  return {
    title: `Tarea ${parcial.id}`,
    description: '',
    category: 'Invitados',
    dueDate: null,
    done: false,
    doneAt: null,
    doneByUid: null,
    doneByEmail: null,
    assignedTo: 'both',
    vendorId: null,
    budgetItemId: null,
    priority: 'normal',
    icon: 'list-checks',
    order: 1,
    ...parcial,
  };
}

describe('estadoDeTarea', () => {
  it('hecha manda sobre la fecha: una tarea hecha vencida está hecha', () => {
    expect(estadoDeTarea({ done: true, dueDate: dia('2027-01-01') }, AHORA)).toBe('hecha');
  });

  it('sin fecha', () => {
    expect(estadoDeTarea({ done: false, dueDate: null }, AHORA)).toBe('sin-fecha');
  });

  it('ayer ya está vencida; hoy no', () => {
    expect(estadoDeTarea({ done: false, dueDate: dia('2027-03-09') }, AHORA)).toBe('vencida');
    expect(estadoDeTarea({ done: false, dueDate: dia('2027-03-10') }, AHORA)).toBe('esta-semana');
  });

  it('esta semana llega hasta siete días; a ocho es próxima', () => {
    expect(estadoDeTarea({ done: false, dueDate: dia('2027-03-17') }, AHORA)).toBe('esta-semana');
    expect(estadoDeTarea({ done: false, dueDate: dia('2027-03-18') }, AHORA)).toBe('proxima');
  });

  it('la hora del día no cambia el estado', () => {
    const madrugada = new Date(2027, 2, 10, 0, 5);
    const noche = new Date(2027, 2, 10, 23, 55);
    const t = { done: false, dueDate: dia('2027-03-10') };
    expect(estadoDeTarea(t, madrugada)).toBe(estadoDeTarea(t, noche));
  });
});

describe('diasHasta', () => {
  it('cuenta días de calendario, con signo', () => {
    expect(diasHasta({ dueDate: dia('2027-03-13') }, AHORA)).toBe(3);
    expect(diasHasta({ dueDate: dia('2027-03-05') }, AHORA)).toBe(-5);
    expect(diasHasta({ dueDate: null }, AHORA)).toBeNull();
  });
});

describe('agruparTareas', () => {
  const tareas = [
    tarea({ id: 'hecha', done: true, dueDate: dia('2027-03-01') }),
    tarea({ id: 'lejos', dueDate: dia('2027-09-01') }),
    tarea({ id: 'vencida', dueDate: dia('2027-02-01') }),
    tarea({ id: 'sin' }),
    tarea({ id: 'pronto', dueDate: dia('2027-03-12') }),
  ];

  it('los grupos salen por urgencia y la hecha al final', () => {
    expect(agruparTareas(tareas, AHORA).map((g) => g.estado)).toEqual([
      'vencida',
      'esta-semana',
      'proxima',
      'sin-fecha',
      'hecha',
    ]);
  });

  it('no salen grupos vacíos', () => {
    const g = agruparTareas([tarea({ id: 'a', dueDate: dia('2027-02-01') })], AHORA);
    expect(g.map((x) => x.estado)).toEqual(['vencida']);
  });

  it('dentro del grupo, la más próxima primero y a igual fecha la más importante', () => {
    const g = agruparTareas(
      [
        tarea({ id: 'b', dueDate: dia('2027-02-10'), priority: 'low' }),
        tarea({ id: 'a', dueDate: dia('2027-02-10'), priority: 'high' }),
        tarea({ id: 'c', dueDate: dia('2027-02-01') }),
      ],
      AHORA,
    );
    expect(g[0]?.tareas.map((t) => t.id)).toEqual(['c', 'a', 'b']);
  });
});

describe('el filtro por responsable', () => {
  const lista = [
    tarea({ id: 'a', assignedTo: 'A' }),
    tarea({ id: 'b', assignedTo: 'B' }),
    tarea({ id: 'ab', assignedTo: 'both' }),
  ];

  it('lo de una persona son sus tareas y las de los dos', () => {
    const ids = (f: 'todas' | 'A' | 'B') =>
      agruparTareas(lista, AHORA, f).flatMap((g) => g.tareas.map((t) => t.id).sort());
    expect(ids('todas')).toEqual(['a', 'ab', 'b']);
    expect(ids('A')).toEqual(['a', 'ab']);
    expect(ids('B')).toEqual(['ab', 'b']);
  });

  it('esDe', () => {
    expect(esDe({ assignedTo: 'B' }, 'A')).toBe(false);
    expect(esDe({ assignedTo: 'both' }, 'A')).toBe(true);
  });
});

describe('resumirTareas', () => {
  it('cuenta cada estado y calcula el porcentaje', () => {
    const r = resumirTareas(
      [
        tarea({ id: '1', done: true }),
        tarea({ id: '2', dueDate: dia('2027-02-01') }),
        tarea({ id: '3', dueDate: dia('2027-03-12') }),
        tarea({ id: '4', dueDate: dia('2027-12-01') }),
      ],
      AHORA,
    );
    expect(r).toEqual({
      total: 4,
      hechas: 1,
      vencidas: 1,
      estaSemana: 1,
      proximas: 1,
      sinFecha: 0,
      porcentaje: 25,
    });
  });

  it('sin tareas no hay porcentaje que presumir', () => {
    expect(resumirTareas([], AHORA).porcentaje).toBe(0);
  });

  it('respeta el filtro', () => {
    const r = resumirTareas(
      [tarea({ id: '1', assignedTo: 'A' }), tarea({ id: '2', assignedTo: 'B' })],
      AHORA,
      'A',
    );
    expect(r.total).toBe(1);
  });
});

describe('tareasUrgentes', () => {
  it('solo vencidas y de esta semana, ordenadas y con tope', () => {
    const r = tareasUrgentes(
      [
        tarea({ id: 'lejos', dueDate: dia('2027-12-01') }),
        tarea({ id: 'v2', dueDate: dia('2027-03-01') }),
        tarea({ id: 'v1', dueDate: dia('2027-02-01') }),
        tarea({ id: 'hecha', done: true, dueDate: dia('2027-02-01') }),
        tarea({ id: 'pronto', dueDate: dia('2027-03-12') }),
      ],
      AHORA,
      2,
    );
    expect(r.map((t) => t.id)).toEqual(['v1', 'v2']);
  });
});

describe('compararTareas', () => {
  it('sin fecha va detrás de con fecha', () => {
    expect(
      compararTareas(tarea({ id: 'a' }), tarea({ id: 'b', dueDate: dia('2027-03-01') })),
    ).toBeGreaterThan(0);
  });
});

describe('erroresDeTarea', () => {
  const ok = { title: 'Pagar la señal', description: '', category: 'Lugar', dueDate: '' };

  it('una tarea normal no tiene errores', () => {
    expect(erroresDeTarea(ok)).toEqual([]);
    expect(erroresDeTarea({ ...ok, dueDate: '2027-05-01' })).toEqual([]);
  });

  it('el título es obligatorio y tiene tope', () => {
    expect(erroresDeTarea({ ...ok, title: '   ' })).toContain('titulo');
    expect(erroresDeTarea({ ...ok, title: 'x'.repeat(MAX_TITULO_TAREA + 1) })).toContain('titulo');
  });

  it('una fecha imposible se rechaza', () => {
    expect(erroresDeTarea({ ...ok, dueDate: '2027-02-31' })).toContain('fecha');
    expect(erroresDeTarea({ ...ok, dueDate: 'mañana' })).toContain('fecha');
  });
});

describe('fechas de formulario', () => {
  it('ida y vuelta sin perder el día', () => {
    expect(campoDeFecha(fechaDeCampo('2027-03-12'))).toBe('2027-03-12');
    expect(campoDeFecha(null)).toBe('');
    expect(fechaDeCampo('')).toBeNull();
  });
});

describe('iconoDeTarea', () => {
  it('conserva uno del set y cambia el que no existe', () => {
    expect(iconoDeTarea('camera')).toBe('camera');
    expect(iconoDeTarea('no-existe')).toBe('list-checks');
    expect(iconoDeTarea(3)).toBe('list-checks');
  });
});

describe('filtrarTareas', () => {
  const lista = [
    tarea({
      id: 'a',
      title: 'Contratar al fotógrafo',
      category: 'Proveedores',
      dueDate: dia('2027-03-01'),
    }),
    tarea({
      id: 'b',
      title: 'Lista de invitados',
      category: 'Invitados',
      dueDate: dia('2027-06-01'),
    }),
    tarea({ id: 'c', title: 'Reservar la finca', category: 'Lugar', done: true }),
  ];
  const ids = (f: Parameters<typeof filtrarTareas>[1]) =>
    filtrarTareas(lista, f, AHORA).map((t) => t.id);

  it('sin filtros devuelve todo', () => {
    expect(ids(SIN_FILTROS)).toEqual(['a', 'b', 'c']);
  });

  it('por estado', () => {
    expect(ids({ ...SIN_FILTROS, estado: 'pendientes' })).toEqual(['a', 'b']);
    expect(ids({ ...SIN_FILTROS, estado: 'vencidas' })).toEqual(['a']);
    expect(ids({ ...SIN_FILTROS, estado: 'hechas' })).toEqual(['c']);
  });

  it('por categoría exacta', () => {
    expect(ids({ ...SIN_FILTROS, categoria: 'Lugar' })).toEqual(['c']);
  });

  it('por texto, sin acentos ni mayúsculas, en título y categoría', () => {
    expect(ids({ ...SIN_FILTROS, texto: 'FOTOGRAFO' })).toEqual(['a']);
    expect(ids({ ...SIN_FILTROS, texto: 'proveedor' })).toEqual(['a']);
    expect(ids({ ...SIN_FILTROS, texto: '  ' })).toEqual(['a', 'b', 'c']);
  });

  it('los filtros se combinan', () => {
    expect(ids({ estado: 'pendientes', categoria: 'Invitados', texto: 'lista' })).toEqual(['b']);
    expect(ids({ estado: 'hechas', categoria: 'Invitados', texto: '' })).toEqual([]);
  });
});
