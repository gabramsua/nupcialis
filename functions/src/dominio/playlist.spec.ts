import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  MAX_CANCIONES,
  MAX_PROPUESTAS_POR_INVITADO,
  alternarVoto,
  cancionesDeTexto,
  cancionesParaInvitado,
  claveDeTexto,
  decidirAlta,
  leerCancion,
  mismaCancion,
  sanearCancionesServidas,
  type CancionGuardada,
} from './playlist';

const MARCA = '// === COPIA LITERAL';

function cuerpo(ruta: string): string {
  const texto = readFileSync(new URL(ruta, import.meta.url), 'utf8');
  const inicio = texto.indexOf(MARCA);
  expect(inicio, `no se encontró "${MARCA}" en ${ruta}`).toBeGreaterThanOrEqual(0);
  return texto.slice(inicio);
}

describe('copia de la playlist', () => {
  it('es idéntica a la del cliente', () => {
    expect(cuerpo('./playlist.ts')).toBe(
      cuerpo('../../../src/app/features/public-site/playlist/playlist.ts'),
    );
  });
});

function cancion(parcial: Partial<CancionGuardada> & { id: string }): CancionGuardada {
  return {
    title: `Canción ${parcial.id}`,
    artist: '',
    suggestedBy: 'otro',
    source: 'guest',
    votes: [],
    status: 'pending',
    ...parcial,
  };
}

describe('la clave de una canción', () => {
  it('no distingue mayúsculas, tildes, signos ni lo que va entre paréntesis', () => {
    expect(claveDeTexto('Mr. Brightside')).toBe('mr brightside');
    expect(claveDeTexto('  MR BRIGHTSIDE (Remastered 2011) ')).toBe('mr brightside');
    expect(claveDeTexto('Bésame Mucho [Live]')).toBe('besame mucho');
  });

  it('un título que se queda en nada no es título', () => {
    expect(claveDeTexto('¿?!  (solo paréntesis)')).toBe('');
  });
});

describe('¿es la misma canción?', () => {
  it('con el mismo título y el mismo artista, sí', () => {
    expect(
      mismaCancion(
        { title: 'Despacito', artist: 'Luis Fonsi' },
        { title: 'despacito', artist: 'LUIS FONSI' },
      ),
    ).toBe(true);
  });

  /** Quien pide «Despacito» a secas pide la misma que quien pone el artista. */
  it('si a una le falta el artista, basta con el título', () => {
    expect(
      mismaCancion(
        { title: 'Despacito', artist: '' },
        { title: 'Despacito', artist: 'Luis Fonsi' },
      ),
    ).toBe(true);
  });

  it('el mismo título de dos artistas distintos son dos canciones', () => {
    expect(
      mismaCancion(
        { title: 'Hello', artist: 'Adele' },
        { title: 'Hello', artist: 'Lionel Richie' },
      ),
    ).toBe(false);
  });

  it('dos canciones sin título nunca son la misma', () => {
    expect(mismaCancion({ title: '', artist: 'A' }, { title: '', artist: 'A' })).toBe(false);
  });
});

describe('leer una canción de Firestore', () => {
  it('limpia lo que viene y no cuenta dos veces un voto', () => {
    expect(
      leerCancion('c1', {
        title: '  Despacito  ',
        artist: 'Luis   Fonsi',
        votes: ['a', 'a', 'b', 3, ''],
        status: 'accepted',
        source: 'rsvp',
        suggestedBy: 'g1',
      }),
    ).toEqual({
      id: 'c1',
      title: 'Despacito',
      artist: 'Luis Fonsi',
      suggestedBy: 'g1',
      source: 'rsvp',
      votes: ['a', 'b'],
      status: 'accepted',
    });
  });

  it('un estado raro es «pendiente»: nunca algo que la pareja no decidió', () => {
    expect(leerCancion('c1', { title: 'X', status: 'aprobada' })?.status).toBe('pending');
  });

  it('sin título, o sin documento, no es una canción', () => {
    expect(leerCancion('c1', { title: '  ' })).toBeNull();
    expect(leerCancion('c1', null)).toBeNull();
    expect(leerCancion('', { title: 'X' })).toBeNull();
  });
});

describe('qué hacer cuando un invitado propone una canción', () => {
  it('una canción nueva se crea', () => {
    expect(decidirAlta([], 'g1', 'Despacito', 'Luis Fonsi')).toEqual({ accion: 'crear' });
  });

  it('sin título no hay nada que proponer', () => {
    expect(decidirAlta([], 'g1', '  ', 'Luis Fonsi')).toEqual({ accion: 'incompleta' });
    expect(decidirAlta([], 'g1', undefined, undefined)).toEqual({ accion: 'incompleta' });
  });

  it('si ya está, suma el voto en vez de duplicar', () => {
    const lista = [cancion({ id: 'c1', title: 'Despacito', artist: 'Luis Fonsi' })];

    expect(decidirAlta(lista, 'g1', 'despacito', '')).toEqual({ accion: 'votar', id: 'c1' });
  });

  /** El invitado no tiene por qué saber que la pareja la ha vetado. */
  it('una canción vetada o descartada no está disponible, sin decir cuál', () => {
    for (const status of ['vetoed', 'discarded'] as const) {
      const lista = [cancion({ id: 'c1', title: 'Despacito', status })];
      expect(decidirAlta(lista, 'g1', 'Despacito', '')).toEqual({ accion: 'no-disponible' });
    }
  });

  it('un invitado tiene un tope de canciones nuevas', () => {
    const suyas = Array.from({ length: MAX_PROPUESTAS_POR_INVITADO }, (_, n) =>
      cancion({ id: `s${n}`, suggestedBy: 'g1' }),
    );

    expect(decidirAlta(suyas, 'g1', 'Otra distinta', '')).toEqual({ accion: 'tope-invitado' });
  });

  /** Sumar un voto no es proponer nada, así que el tope no se aplica. */
  it('el tope no impide votar una que ya está', () => {
    const lista = [
      ...Array.from({ length: MAX_PROPUESTAS_POR_INVITADO }, (_, n) =>
        cancion({ id: `s${n}`, suggestedBy: 'g1' }),
      ),
      cancion({ id: 'ajena', title: 'Despacito', suggestedBy: 'g2' }),
    ];

    expect(decidirAlta(lista, 'g1', 'Despacito', '')).toEqual({ accion: 'votar', id: 'ajena' });
  });

  it('lo que entró por el RSVP no gasta el tope del invitado', () => {
    const lista = Array.from({ length: MAX_PROPUESTAS_POR_INVITADO }, (_, n) =>
      cancion({ id: `r${n}`, suggestedBy: 'g1', source: 'rsvp' }),
    );

    expect(decidirAlta(lista, 'g1', 'Otra', '')).toEqual({ accion: 'crear' });
  });

  it('la lista entera tiene un tope', () => {
    const llena = Array.from({ length: MAX_CANCIONES }, (_, n) =>
      cancion({ id: `c${n}`, suggestedBy: `g${n}` }),
    );

    expect(decidirAlta(llena, 'nuevo', 'Otra', '')).toEqual({ accion: 'tope-lista' });
  });
});

describe('votar', () => {
  it('un segundo toque quita el voto, y nunca cuenta dos', () => {
    const una = alternarVoto([], 'g1');
    expect(una).toEqual(['g1']);
    expect(alternarVoto(una, 'g1')).toEqual([]);
    expect(alternarVoto(['g2'], 'g1')).toEqual(['g2', 'g1']);
  });
});

describe('la lista que ve el invitado', () => {
  const lista = [
    cancion({ id: 'a', title: 'Alegría', votes: ['x'] }),
    cancion({ id: 'b', title: 'Bailando', votes: ['x', 'g1', 'y'], suggestedBy: 'g1' }),
    cancion({ id: 'c', title: 'Descartada', status: 'discarded', votes: ['x', 'y', 'z'] }),
    cancion({ id: 'd', title: 'Vetada', status: 'vetoed', votes: ['x', 'y', 'z'] }),
    cancion({ id: 'e', title: 'Aceptada', status: 'accepted' }),
  ];

  it('va por votos y no enseña lo descartado ni lo vetado', () => {
    expect(cancionesParaInvitado(lista, 'g1').map((c) => c.id)).toEqual(['b', 'a', 'e']);
  });

  it('dice qué ha votado y qué ha propuesto él', () => {
    const b = cancionesParaInvitado(lista, 'g1').find((c) => c.id === 'b');
    expect(b).toMatchObject({ votos: 3, votadaPorMi: true, mia: true });
  });

  /** Quién votó qué no es asunto de los demás invitados. */
  it('no deja salir ningún id de invitado', () => {
    const json = JSON.stringify(cancionesParaInvitado(lista, 'g1'));
    for (const id of ['"x"', '"y"', '"z"', 'suggestedBy', 'votes']) {
      expect(json).not.toContain(id);
    }
  });
});

describe('lo que vuelve del servidor', () => {
  it('descarta lo que no tiene id o título y los repetidos', () => {
    const salida = sanearCancionesServidas([
      { id: 'a', title: 'Una', votos: 2 },
      { id: 'a', title: 'Repetida', votos: 9 },
      { id: '', title: 'Sin id' },
      { id: 'b', title: '  ' },
      null,
      { id: 'c', title: 'Con votos raros', votos: -4 },
    ]);

    expect(salida.map((c) => c.id)).toEqual(['a', 'c']);
    expect(salida[1]?.votos).toBe(0);
  });

  it('algo que no es una lista no da canciones', () => {
    expect(sanearCancionesServidas({})).toEqual([]);
  });
});

describe('canciones escritas en el RSVP', () => {
  it('acepta el título solo, o con artista de las formas que escribe la gente', () => {
    expect(cancionesDeTexto('Despacito')).toEqual([{ title: 'Despacito', artist: '' }]);
    expect(cancionesDeTexto('Despacito - Luis Fonsi')).toEqual([
      { title: 'Despacito', artist: 'Luis Fonsi' },
    ]);
    expect(cancionesDeTexto('Hello by Adele')).toEqual([{ title: 'Hello', artist: 'Adele' }]);
  });

  it('acepta varias, por líneas o con punto y coma, hasta tres', () => {
    expect(cancionesDeTexto('Una\nDos; Tres\nCuatro\nCinco').map((c) => c.title)).toEqual([
      'Una',
      'Dos',
      'Tres',
    ]);
  });

  /** «de» está dentro de demasiados títulos para fiarse de él como separador. */
  it('un título con «de» dentro no se parte', () => {
    expect(cancionesDeTexto('Se fue de viaje')).toEqual([{ title: 'Se fue de viaje', artist: '' }]);
  });

  it('lo vacío o lo que no es texto no da canciones', () => {
    expect(cancionesDeTexto('   ')).toEqual([]);
    expect(cancionesDeTexto(42)).toEqual([]);
    expect(cancionesDeTexto(undefined)).toEqual([]);
  });
});
