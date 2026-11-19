import { describe, expect, it } from 'vitest';

import { MAX_GRUPOS, type GrupoExistente } from './grupos';
import { MAX_INVITADOS, planificarImportacion } from './importacion';
import type { EntradaInvitado, Existente } from './invitados';

const NADIE: readonly Existente[] = [];

function filas(...nombres: readonly (string | EntradaInvitado)[]): EntradaInvitado[] {
  return nombres.map((n) => (typeof n === 'string' ? { fullName: n } : n));
}

describe('planificarImportacion', () => {
  it('deja entrar una lista limpia', () => {
    const plan = planificarImportacion(filas('María Pérez', 'Pepe García'), NADIE);

    expect(plan.resumen).toEqual({ nuevos: 2, duplicados: 0, invalidos: 0, sinSitio: 0 });
    expect(plan.filas.map((f) => f.estado)).toEqual(['nuevo', 'nuevo']);
    expect(plan.filas[0].datos?.normalizedName).toBe('maria perez');
  });

  it('numera las filas para poder señalarlas', () => {
    const plan = planificarImportacion(filas('Uno', 'Dos', 'Tres'), NADIE);
    expect(plan.filas.map((f) => f.fila)).toEqual([1, 2, 3]);
  });

  it('marca inválida la fila sin nombre y dice por qué', () => {
    const plan = planificarImportacion(filas('   ', 'Pepe García'), NADIE);

    expect(plan.filas[0].estado).toBe('invalido');
    expect(plan.filas[0].motivos).toEqual([{ campo: 'fullName', motivo: 'ausente' }]);
    // Una fila mala no tumba el resto del fichero.
    expect(plan.filas[1].estado).toBe('nuevo');
  });

  it('detecta a quien ya está en la boda', () => {
    const plan = planificarImportacion(filas('Maria Perez'), [
      { id: 'g1', phone: null, normalizedName: 'maria perez' },
    ]);

    expect(plan.filas[0].estado).toBe('duplicado');
    expect(plan.filas[0].duplicadoDe).toBe('g1');
    expect(plan.filas[0].motivoDuplicado).toBe('nombre');
  });

  /**
   * El caso que de verdad justifica este fichero. Una hoja que ha pasado por
   * tres manos trae al mismo primo dos veces, y sin esto entraría dos veces.
   */
  it('detecta duplicados dentro del propio fichero', () => {
    const plan = planificarImportacion(filas('María Pérez', 'maria perez'), NADIE);

    expect(plan.filas.map((f) => f.estado)).toEqual(['nuevo', 'duplicado']);
    expect(plan.resumen.duplicados).toBe(1);
  });

  it('también dentro del fichero cuando repiten teléfono con nombres distintos', () => {
    const plan = planificarImportacion(
      filas(
        { fullName: 'Javier Ruiz', phone: '666123456' },
        { fullName: 'Javi Ruiz', phone: '666 12 34 56' },
      ),
      NADIE,
    );

    expect(plan.filas[1].estado).toBe('duplicado');
    expect(plan.filas[1].motivoDuplicado).toBe('telefono');
  });

  it('con forzarDuplicados entran igual', () => {
    // La segunda pasada: la pareja ya ha visto la lista y sabe que esos dos
    // Javier Ruiz son dos personas distintas.
    const plan = planificarImportacion(filas('María Pérez', 'maria perez'), NADIE, {
      forzarDuplicados: true,
    });

    expect(plan.filas.map((f) => f.estado)).toEqual(['nuevo', 'nuevo']);
  });

  it('respeta el tope de la boda contando los que ya están', () => {
    const yaEstan: Existente[] = Array.from({ length: MAX_INVITADOS - 1 }, (_, n) => ({
      id: `g${n}`,
      phone: null,
      normalizedName: `invitado numero ${n}`,
    }));

    const plan = planificarImportacion(filas('Cabe Justo', 'Ya No Cabe'), yaEstan);

    expect(plan.filas[0].estado).toBe('nuevo');
    expect(plan.filas[1].estado).toBe('sin-sitio');
    expect(plan.resumen.sinSitio).toBe(1);
  });

  it('un fichero enorme no se traga entero', () => {
    const muchas = filas(...Array.from({ length: 5000 }, (_, n) => `Invitado ${n}`));
    expect(planificarImportacion(muchas, NADIE).filas.length).toBeLessThanOrEqual(1000);
  });

  it('solo las filas que entran traen datos que escribir', () => {
    const plan = planificarImportacion(filas('', 'Pepe García'), NADIE);

    expect(plan.filas[0].datos).toBeNull();
    expect(plan.filas[1].datos).not.toBeNull();
  });

  it('conserva el nombre tal como venía, para que se reconozca la fila', () => {
    // Aunque la fila sea inválida por otro motivo, hay que poder decir de quién
    // se está hablando.
    const plan = planificarImportacion(
      filas({ fullName: '  Begoña  Agüero ', phone: 'no tengo' }),
      NADIE,
    );

    expect(plan.filas[0].estado).toBe('invalido');
    expect(plan.filas[0].nombre).toBe('Begoña  Agüero');
  });

  it('con una lista vacía no lanza y no promete nada', () => {
    const plan = planificarImportacion([], NADIE);
    expect(plan.filas).toEqual([]);
    expect(plan.resumen).toEqual({ nuevos: 0, duplicados: 0, invalidos: 0, sinSitio: 0 });
  });
});

describe('planificarImportacion con grupos', () => {
  const UNI: GrupoExistente = {
    id: 'uni',
    normalizedName: 'universidad',
    photoAudience: 'restricted',
  };
  const PADEL: GrupoExistente = {
    id: 'padel',
    normalizedName: 'padel',
    photoAudience: 'restricted',
  };

  it('el grupo que ya existe se asigna por nombre', () => {
    const plan = planificarImportacion([{ fullName: 'Ana', groupNames: ['Universidad'] }], NADIE, {
      grupos: [UNI],
    });

    expect(plan.filas[0].datos?.groupIds).toEqual(['uni']);
    expect(plan.gruposNuevos).toEqual([]);
  });

  it('el que no existe se anuncia para crearlo, una sola vez y con la primera grafía', () => {
    const plan = planificarImportacion(
      [
        { fullName: 'Ana', groupNames: ['Primos Madrid'] },
        { fullName: 'Leo', groupNames: ['primos madrid'] },
      ],
      NADIE,
    );

    expect(plan.gruposNuevos).toEqual([{ id: 'nuevo:primos madrid', name: 'Primos Madrid' }]);
    expect(plan.filas.map((f) => f.datos?.groupIds)).toEqual([
      ['nuevo:primos madrid'],
      ['nuevo:primos madrid'],
    ]);
  });

  it('una fila que no entra no crea grupos', () => {
    const plan = planificarImportacion([{ fullName: '', groupNames: ['Fantasma'] }], NADIE);
    expect(plan.gruposNuevos).toEqual([]);
  });

  it('un duplicado tampoco', () => {
    const plan = planificarImportacion(
      [{ fullName: 'Ana', groupNames: ['Fantasma'] }],
      [{ id: 'g1', normalizedName: 'ana' }],
    );
    expect(plan.filas[0].estado).toBe('duplicado');
    expect(plan.gruposNuevos).toEqual([]);
  });

  it('dos grupos restringidos en la misma fila la dejan fuera, con el motivo', () => {
    const plan = planificarImportacion(
      [{ fullName: 'Ana', groupNames: ['Universidad', 'Pádel'] }],
      NADIE,
      { grupos: [UNI, PADEL] },
    );

    expect(plan.filas[0].estado).toBe('invalido');
    expect(plan.filas[0].motivos).toEqual([{ campo: 'groupIds', motivo: 'dos-restringidos' }]);
  });

  it('los grupos nuevos nacen públicos, así que no chocan con uno restringido', () => {
    const plan = planificarImportacion(
      [{ fullName: 'Ana', groupNames: ['Universidad', 'Primos'] }],
      NADIE,
      { grupos: [UNI] },
    );
    expect(plan.filas[0].estado).toBe('nuevo');
  });

  it('pasado el tope de grupos, la fila que pediría uno más se queda fuera', () => {
    const muchos: GrupoExistente[] = Array.from({ length: MAX_GRUPOS }, (_, i) => ({
      id: `g${i}`,
      normalizedName: `grupo ${i}`,
      photoAudience: 'public',
    }));

    const plan = planificarImportacion(
      [
        { fullName: 'Ana', groupNames: ['grupo 3'] },
        { fullName: 'Leo', groupNames: ['Uno más'] },
      ],
      NADIE,
      { grupos: muchos },
    );

    expect(plan.filas.map((f) => f.estado)).toEqual(['nuevo', 'invalido']);
    expect(plan.filas[1].motivos).toEqual([{ campo: 'groupIds', motivo: 'demasiados-grupos' }]);
    expect(plan.gruposNuevos).toEqual([]);
  });
});

describe('planificarImportacion y el grupo de todos', () => {
  const TODOS: GrupoExistente = {
    id: 'todos',
    normalizedName: 'invitados',
    photoAudience: 'public',
    isDefault: true,
  };

  it('cada invitado importado entra en el grupo de todos, además de en los suyos', () => {
    const plan = planificarImportacion(
      [{ fullName: 'Ana', groupNames: ['Primos'] }, { fullName: 'Leo' }],
      NADIE,
      { grupos: [TODOS] },
    );

    expect(plan.filas.map((f) => f.datos?.groupIds)).toEqual([
      ['todos', 'nuevo:primos'],
      ['todos'],
    ]);
  });

  it('escribir «Invitados» en la columna no lo duplica', () => {
    const plan = planificarImportacion([{ fullName: 'Ana', groupNames: ['Invitados'] }], NADIE, {
      grupos: [TODOS],
    });
    expect(plan.filas[0].datos?.groupIds).toEqual(['todos']);
    expect(plan.gruposNuevos).toEqual([]);
  });
});
