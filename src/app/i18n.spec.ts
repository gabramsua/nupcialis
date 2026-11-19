import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Que no falte ninguna cadena en el diccionario.
 *
 * Nace de una prueba que no valía. Intenté detectar las claves sin traducir
 * mirando el texto renderizado, borré dos claves a propósito para comprobar que
 * saltaba, y siguió verde: una cadena que falta **no rompe nada**, la pantalla
 * se monta igual. Hace falta comprobarlo aparte y en frío.
 *
 * Esto no mira lo que se pinta: lee el código, saca todas las claves que se
 * piden con `t('…')` y comprueba que cada una está en `es.json`. Es estático,
 * es rápido, y no depende de cómo se comporte la librería ante un fallo.
 */

const RAIZ = 'src/app';
const DICCIONARIO = 'public/i18n/es.json';

/**
 * `t('clave')` y `t('clave', { … })`.
 *
 * La comilla de cierre tiene que ir seguida de `)` o `,`. Sin eso, este mismo
 * patrón se traga el trozo fijo de `t('grupo.' + variable)` y lo da por una
 * clave entera que, claro, no existe.
 */
const CLAVE_FIJA = /\bt\(\s*'([a-zA-Z0-9_.-]+)'\s*[,)]/g;

/**
 * `t('algo' + loQueSea)`: la clave se arma en tiempo de ejecución.
 *
 * De estas solo se puede comprobar el **grupo** que las contiene, y aun así
 * merece la pena: si alguien renombra `panel.invitados.rsvp`, el grupo deja de
 * existir y aquí se ve.
 */
const CLAVE_ARMADA = /\bt\(\s*'([a-zA-Z0-9_.-]+?)'\s*\+/g;

function ficheros(directorio: string): string[] {
  return readdirSync(directorio, { withFileTypes: true }).flatMap((entrada) => {
    const ruta = join(directorio, entrada.name);
    if (entrada.isDirectory()) return ficheros(ruta);
    // Las pruebas montan con diccionarios de mentira a propósito.
    return entrada.name.endsWith('.ts') && !entrada.name.endsWith('.spec.ts') ? [ruta] : [];
  });
}

function buscar(diccionario: unknown, clave: string): unknown {
  return clave
    .split('.')
    .reduce<unknown>(
      (nodo, trozo) =>
        nodo !== null && typeof nodo === 'object'
          ? (nodo as Record<string, unknown>)[trozo]
          : undefined,
      diccionario,
    );
}

function esGrupo(valor: unknown): boolean {
  return valor !== null && typeof valor === 'object';
}

/**
 * El grupo que tiene que existir para una clave armada.
 *
 * Si el trozo fijo acaba en punto —`'panel.importar.estado.' + estado`— ese es
 * el grupo, y tiene que estar tal cual. Si no acaba en punto
 * —`'…confirmar' + sufijo`— el grupo es su padre.
 */
function grupoDe(prefijo: string): string {
  return prefijo.endsWith('.') ? prefijo.slice(0, -1) : prefijo.replace(/\.[^.]*$/, '');
}

const ES: unknown = JSON.parse(readFileSync(DICCIONARIO, 'utf8'));

interface Uso {
  readonly clave: string;
  readonly fichero: string;
  readonly armada: boolean;
}

const USOS: readonly Uso[] = ficheros(RAIZ).flatMap((fichero) => {
  const codigo = readFileSync(fichero, 'utf8');

  return [
    ...[...codigo.matchAll(CLAVE_FIJA)].map((m) => ({ clave: m[1], fichero, armada: false })),
    ...[...codigo.matchAll(CLAVE_ARMADA)].map((m) => ({ clave: m[1], fichero, armada: true })),
  ];
});

describe('el diccionario de traducciones', () => {
  it('encuentra claves que comprobar (si no, la rota es esta prueba)', () => {
    expect(USOS.length).toBeGreaterThan(150);
  });

  it('tiene todas las cadenas que piden las pantallas', () => {
    const faltan = USOS.filter((uso) =>
      uso.armada
        ? !esGrupo(buscar(ES, grupoDe(uso.clave)))
        : typeof buscar(ES, uso.clave) !== 'string' || buscar(ES, uso.clave) === '',
    ).map((uso) =>
      uso.armada
        ? `falta el grupo ${grupoDe(uso.clave)} (${uso.fichero})`
        : `falta ${uso.clave} (${uso.fichero})`,
    );

    expect([...new Set(faltan)].sort()).toEqual([]);
  });
});
