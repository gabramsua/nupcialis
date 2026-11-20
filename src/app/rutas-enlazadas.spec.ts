import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Routes } from '@angular/router';
import { describe, expect, it } from 'vitest';

import { routes } from './app.routes';
import { RUTA_MODULO } from './features/panel/boda';

/**
 * Que todo `routerLink` escrito a mano lleve a alguna parte.
 *
 * El fallo que vigila ya ha pasado: la pantalla de respuestas del formulario
 * se escribió, se probó, se enlazó desde «Preguntas»… y nadie declaró su
 * ruta. Los tests pasaban —la pantalla se monta sola en el test de render— y
 * en la aplicación el botón llevaba a una página en blanco.
 *
 * Es un error que no se ve leyendo el diff: el enlace está en un fichero y la
 * ruta falta en otro. Por eso se comprueba aquí y no con los ojos.
 *
 * Los enlaces con partes calculadas (`[routerLink]="['/panel/guests', id]"`)
 * se quedan fuera: no son una cadena hasta que se ejecutan.
 */

const RAIZ = 'src/app';

function ficheros(directorio: string): string[] {
  return readdirSync(directorio, { withFileTypes: true }).flatMap((entrada) => {
    const camino = join(directorio, entrada.name);
    if (entrada.isDirectory()) return ficheros(camino);
    return entrada.name.endsWith('.ts') && !entrada.name.endsWith('.spec.ts') ? [camino] : [];
  });
}

/**
 * Aplana el árbol de rutas, incluidas las diferidas.
 *
 * `loadChildren` se **ejecuta**: solo importa el fichero de rutas, que no
 * arrastra ningún componente. Sin esto no se vería ni una ruta del panel, que
 * es justo donde estaba el fallo.
 */
async function caminosDe(rutas: Routes, prefijo = ''): Promise<string[]> {
  const caminos: string[] = [];

  for (const ruta of rutas) {
    const propio = [prefijo, ruta.path ?? ''].filter((parte) => parte !== '').join('/');
    caminos.push('/' + propio);

    if (ruta.children) caminos.push(...(await caminosDe(ruta.children, propio)));

    if (typeof ruta.loadChildren === 'function') {
      const hijas = (await ruta.loadChildren()) as Routes;
      if (Array.isArray(hijas)) caminos.push(...(await caminosDe(hijas, propio)));
    }
  }

  return caminos;
}

interface Enlace {
  readonly fichero: string;
  readonly destino: string;
}

function enlacesEscritos(): Enlace[] {
  const encontrados: Enlace[] = [];

  for (const fichero of ficheros(RAIZ)) {
    const codigo = readFileSync(fichero, 'utf8');
    for (const [, destino] of codigo.matchAll(/routerLink="(\/[^"{]*)"/g)) {
      encontrados.push({ fichero, destino });
    }
  }

  return encontrados;
}

describe('los enlaces del menú y de las pantallas llevan a una ruta que existe', () => {
  it('ninguno apunta a una ruta que nadie ha declarado', async () => {
    const declaradas = new Set(await caminosDe(routes));
    const rotos = enlacesEscritos().filter((enlace) => !declaradas.has(enlace.destino));

    expect(rotos).toEqual([]);
  });

  /**
   * Y lo mismo con el menú del panel, que no enlaza con una cadena escrita
   * sino con la ruta que tiene apuntada cada módulo.
   *
   * El fallo que vigila también ha pasado: el menú construía `/panel/<modulo>`
   * para los dieciocho del catálogo, y los que no tienen pantalla —el mapa, la
   * cronología, las preguntas frecuentes— llevaban a una página en blanco.
   */
  it('cada módulo con pantalla apunta a una ruta que existe', async () => {
    const declaradas = new Set(await caminosDe(routes));
    const rotas = Object.entries(RUTA_MODULO).filter(([, ruta]) => !declaradas.has(ruta!));

    expect(rotas).toEqual([]);
  });

  /** Si esto deja de encontrar enlaces, el que no sirve es el test. */
  it('encuentra los enlaces que hay', () => {
    expect(enlacesEscritos().length).toBeGreaterThan(3);
  });
});
