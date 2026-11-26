import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Todo botón «Guardar» con estado de carga lleva su icono de check.
 *
 * El estado de carga del botón hace girar **el primer icono** (`_button.scss`):
 * sin icono no gira nada y quien guarda no ve que pase nada. Pasó en autobuses
 * y en dress code; esto lo vigila en todo el panel y el superadmin.
 */
function ficheros(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) return ficheros(ruta);
    return ruta.endsWith('.ts') && !ruta.endsWith('.spec.ts') && !ruta.includes('testing')
      ? [ruta]
      : [];
  });
}

const ETIQUETAS_DE_GUARDAR = [
  "t('common.save')",
  "t('superadmin.planes.guardar')",
  "t('panel.historia.guardarTodo')",
];

describe('los botones Guardar', () => {
  it('llevan el icono de check que gira mientras guardan', () => {
    const sinIcono: string[] = [];

    for (const dir of ['src/app/features/panel', 'src/app/features/superadmin']) {
      for (const fichero of ficheros(dir)) {
        const texto = readFileSync(fichero, 'utf8');
        for (const boton of texto.match(/<button\b(?:(?!<\/button>)[\s\S])*?<\/button>/g) ?? []) {
          if (!boton.includes('[loading]')) continue;
          if (!ETIQUETAS_DE_GUARDAR.some((e) => boton.includes(e))) continue;
          if (!/>\s*<np-icon/.test(boton.slice(boton.indexOf('[loading]')))) sinIcono.push(fichero);
        }
      }
    }

    expect(sinIcono).toEqual([]);
  });
});
