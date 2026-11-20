import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  COLORES_GRUPO,
  MAX_NOMBRE_GRUPO,
  colorLibre,
  conGrupoPorDefecto,
  conflictosAlRestringir,
  idGrupoPorDefecto,
  resolverNombresDeGrupo,
  validarAsignacion,
  validarGrupo,
  type GrupoExistente,
  ordenPedido,
} from './grupos';

const UNIVERSIDAD: GrupoExistente = {
  id: 'uni',
  normalizedName: 'universidad',
  photoAudience: 'restricted',
  color: 'rosa',
};
const PADEL: GrupoExistente = {
  id: 'padel',
  normalizedName: 'padel',
  photoAudience: 'restricted',
  color: 'coral',
};
const FAMILIA: GrupoExistente = {
  id: 'familia',
  normalizedName: 'familia de la novia',
  photoAudience: 'public',
  color: 'teja',
};

describe('los colores de grupo', () => {
  /**
   * La lista vive en dos paquetes. Si alguien añade un color a la paleta y no
   * aquí, la pareja lo ve en el selector y la función se lo rechaza: el peor
   * tipo de fallo, porque parece culpa suya.
   */
  it('son exactamente los de la paleta categórica del sistema visual', () => {
    const paleta = JSON.parse(
      readFileSync('../src/app/design-system/tokens/palette.json', 'utf8'),
    ) as { categorical: { colores: { id: string }[] } };

    expect([...COLORES_GRUPO]).toEqual(paleta.categorical.colores.map((c) => c.id));
  });

  it('se reparten sin repetir mientras quedan libres', () => {
    expect(colorLibre([])).toBe('rosa');
    expect(colorLibre(['rosa', 'coral'])).toBe('teja');
  });

  it('cuando se acaban, vuelven a empezar en vez de fallar', () => {
    expect(COLORES_GRUPO).toContain(colorLibre([...COLORES_GRUPO]));
  });
});

describe('validarGrupo', () => {
  it('acepta un grupo con solo el nombre y rellena lo demás con lo prudente', () => {
    const r = validarGrupo({ name: '  Amigos   del   cole ' }, []);

    expect(r).toEqual({
      ok: true,
      datos: {
        name: 'Amigos del cole',
        normalizedName: 'amigos del cole',
        // Público por defecto: restringir cambia quién ve qué fotos, y eso se
        // decide a propósito, no por no haber tocado nada.
        photoAudience: 'public',
        color: 'rosa',
      },
    });
  });

  it('sin nombre, o con uno larguísimo, no', () => {
    expect(validarGrupo({ name: '   ' }, [])).toEqual({
      ok: false,
      motivos: [{ campo: 'name', motivo: 'ausente' }],
    });
    expect(validarGrupo({ name: 'x'.repeat(MAX_NOMBRE_GRUPO + 1) }, [])).toEqual({
      ok: false,
      motivos: [{ campo: 'name', motivo: 'demasiado-largo' }],
    });
  });

  it('no deja dos grupos que se llaman igual, aunque cambien tildes o mayúsculas', () => {
    const r = validarGrupo({ name: 'UNIVERSIDÁD' }, [UNIVERSIDAD]);
    expect(r).toEqual({ ok: false, motivos: [{ campo: 'name', motivo: 'repetido' }] });
  });

  it('un grupo no choca consigo mismo al guardarse', () => {
    expect(validarGrupo({ name: 'Universidad' }, [UNIVERSIDAD], 'uni').ok).toBe(true);
  });

  it('rechaza un color que no está en la paleta', () => {
    const r = validarGrupo({ name: 'Primos', color: '#ff0000' }, []);
    expect(r).toEqual({ ok: false, motivos: [{ campo: 'color', motivo: 'no-existe' }] });
  });

  it('sin color elegido, coge uno que no use nadie', () => {
    const r = validarGrupo({ name: 'Primos' }, [UNIVERSIDAD, PADEL]);
    expect(r.ok && r.datos.color).toBe('teja');
  });

  /**
   * Solo la pareja decide si una foto se publica para todos. Un invitado no
   * puede, ni siquiera en un grupo que la pareja haya marcado: es la defensa
   * contra quien suba la foto de la despedida que la familia no debe ver.
   */
  it('un grupo no puede dar a los invitados la opción de publicar para todos', () => {
    // Un cliente antiguo (o uno manipulado) puede seguir mandándolo.
    const entrada = { name: 'B', photoAudience: 'restricted', allowPublicOptIn: true };
    const r = validarGrupo(entrada, []);
    expect(r.ok && 'allowPublicOptIn' in r.datos).toBe(false);
  });

  it('una audiencia desconocida se queda en pública, nunca en restringida', () => {
    const r = validarGrupo({ name: 'A', photoAudience: 'secreto' }, []);
    expect(r.ok && r.datos.photoAudience).toBe('public');
  });
});

describe('validarAsignacion', () => {
  const GRUPOS = [UNIVERSIDAD, PADEL, FAMILIA];

  it('un restringido y los públicos que quieras', () => {
    expect(validarAsignacion(['uni', 'familia'], GRUPOS)).toEqual([]);
  });

  it('dos restringidos, no: no se sabría con quién comparte sus fotos', () => {
    expect(validarAsignacion(['uni', 'padel'], GRUPOS)).toEqual([
      { campo: 'groupIds', motivo: 'dos-restringidos' },
    ]);
  });

  it('un grupo que ya no existe se rechaza, no se ignora', () => {
    expect(validarAsignacion(['borrado'], GRUPOS)).toEqual([
      { campo: 'groupIds', motivo: 'no-existe' },
    ]);
  });

  it('sin grupos también vale', () => {
    expect(validarAsignacion([], GRUPOS)).toEqual([]);
  });
});

describe('conflictosAlRestringir', () => {
  const PADEL_PUBLICO: GrupoExistente = { ...PADEL, photoAudience: 'public' };

  it('cuenta a quien quedaría en dos restringidos', () => {
    const invitados = [
      { groupIds: ['uni', 'padel'] }, // conflicto
      { groupIds: ['padel'] },
      { groupIds: ['uni'] },
      { groupIds: ['padel', 'familia'] },
    ];

    expect(conflictosAlRestringir('padel', invitados, [UNIVERSIDAD, PADEL_PUBLICO, FAMILIA])).toBe(
      1,
    );
  });

  it('sin otros restringidos no hay conflicto posible', () => {
    const invitados = [{ groupIds: ['padel', 'familia'] }];
    expect(conflictosAlRestringir('padel', invitados, [PADEL_PUBLICO, FAMILIA])).toBe(0);
  });
});

describe('resolverNombresDeGrupo', () => {
  it('los que existen se convierten en su id, sin mirar tildes ni mayúsculas', () => {
    expect(
      resolverNombresDeGrupo(['universidad', 'Familia de la Novia'], [UNIVERSIDAD, FAMILIA]),
    ).toEqual(['uni', 'familia']);
  });

  it('los que no existen reciben un id provisional para crearlos', () => {
    expect(resolverNombresDeGrupo(['Primos'], [])).toEqual(['nuevo:primos']);
  });

  it('no repite, y descarta celdas vacías', () => {
    expect(resolverNombresDeGrupo(['Primos', ' primos ', ''], [])).toEqual(['nuevo:primos']);
  });
});

describe('el grupo de todos', () => {
  const INVITADOS: GrupoExistente = {
    id: 'todos',
    normalizedName: 'invitados',
    photoAudience: 'public',
    isDefault: true,
  };

  it('se reconoce por la marca que pone el alta', () => {
    expect(idGrupoPorDefecto([FAMILIA, INVITADOS])).toBe('todos');
  });

  it('en bodas anteriores a la marca, vale el que se llama «Invitados»', () => {
    const antiguo = { ...INVITADOS, isDefault: undefined };
    expect(idGrupoPorDefecto([FAMILIA, antiguo])).toBe('todos');
  });

  it('si no hay ninguno, no se inventa', () => {
    expect(idGrupoPorDefecto([FAMILIA])).toBeNull();
  });

  it('un invitado nuevo entra en él, sin perder los grupos que traía', () => {
    expect(conGrupoPorDefecto(['familia'], 'todos')).toEqual(['todos', 'familia']);
    expect(conGrupoPorDefecto(['todos'], 'todos')).toEqual(['todos']);
    expect(conGrupoPorDefecto(['familia'], null)).toEqual(['familia']);
  });

  it('no puede llevar candado: toda la boda quedaría en un grupo cerrado', () => {
    const r = validarGrupo(
      { name: 'Invitados', photoAudience: 'restricted' },
      [INVITADOS],
      'todos',
    );
    expect(r).toEqual({ ok: false, motivos: [{ campo: 'photoAudience', motivo: 'por-defecto' }] });
  });

  it('otro grupo sí puede llevarlo', () => {
    const r = validarGrupo(
      { name: 'Familia', photoAudience: 'restricted' },
      [INVITADOS, FAMILIA],
      'familia',
    );
    expect(r.ok).toBe(true);
  });
});

describe('ordenPedido', () => {
  it('pone los grupos en el orden que ha pedido la pareja', () => {
    expect(ordenPedido(['c', 'a', 'b'], ['a', 'b', 'c'])).toEqual(['c', 'a', 'b']);
  });

  /** Un grupo creado en otra pestaña no puede desaparecer del listado. */
  it('lo que no venía en la lista se queda al final, no se pierde', () => {
    expect(ordenPedido(['b'], ['a', 'b', 'c'])).toEqual(['b', 'a', 'c']);
  });

  it('un id que ya no existe se ignora', () => {
    expect(ordenPedido(['borrado', 'a'], ['a', 'b'])).toEqual(['a', 'b']);
  });

  it('repetidos y basura no cuentan dos veces', () => {
    expect(ordenPedido(['a', 'a', null, 7, 'b'], ['a', 'b'])).toEqual(['a', 'b']);
  });

  it('sin nada pedido, el orden que ya había', () => {
    expect(ordenPedido([], ['a', 'b'])).toEqual(['a', 'b']);
  });
});
