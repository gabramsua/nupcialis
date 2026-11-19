/**
 * Ni un acento grave dentro de un comentario de una plantilla en línea.
 *
 * Esto existe porque ha pasado **cinco veces**. Las plantillas y los estilos de
 * este proyecto son literales de plantilla de TypeScript, así que un acento
 * grave dentro de un comentario —`<!-- ... -->` en la plantilla o una barra y
 * asterisco en los estilos— cierra el literal y el fichero deja de compilar.
 *
 * Y el error no menciona el comentario. Dice cosas como:
 *
 *     NG1001: Decorator argument must be literal.
 *     TS1005: ',' expected.
 *
 * Es un script de Node y no un test a propósito: cuando esto pasa, **nada
 * compila**, así que un test de Vitest tampoco llegaría a ejecutarse. Por eso
 * corre antes de `ng build` y antes de `ng test`, donde sí sirve de algo.
 *
 *     node tools/comprueba-plantillas.mjs
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = 'src/app';

export function ficheros(directorio) {
  return readdirSync(directorio, { withFileTypes: true }).flatMap((entrada) => {
    const ruta = join(directorio, entrada.name);
    if (entrada.isDirectory()) return ficheros(ruta);
    return entrada.name.endsWith('.ts') ? [ruta] : [];
  });
}

/**
 * Las líneas con un acento grave dentro de un comentario de plantilla o de
 * estilos.
 *
 * Se recorre carácter a carácter desde cada `template:` o `styles:` porque el
 * propio fallo rompe cualquier atajo: el acento grave que buscamos **es** el
 * que cerraría el bloque, así que no se puede empezar por encontrar el cierre.
 * Al llegar a uno, o estamos dentro de un comentario —y entonces es el fallo—
 * o es el final del bloque.
 */
export function sospechosos(codigo) {
  const lineas = [];

  for (const apertura of codigo.matchAll(/(?:template|styles):\s*`/g)) {
    let i = apertura.index + apertura[0].length;
    let cierre = null;

    while (i < codigo.length) {
      if (cierre === null && codigo.startsWith('<!--', i)) {
        cierre = '-->';
        i += 4;
        continue;
      }
      if (cierre === null && codigo.startsWith('/*', i)) {
        cierre = '*/';
        i += 2;
        continue;
      }
      if (cierre !== null && codigo.startsWith(cierre, i)) {
        i += cierre.length;
        cierre = null;
        continue;
      }
      if (codigo[i] === '`') {
        if (cierre === null) break;
        lineas.push(codigo.slice(0, i).split('\n').length);
      }
      i += 1;
    }
  }

  return lineas;
}

/** Cuántos comentarios hay dentro de plantillas y estilos, para no mirar al vacío. */
export function cuantosComentarios(codigo) {
  let cuantos = 0;

  for (const apertura of codigo.matchAll(/(?:template|styles):\s*`/g)) {
    const desde = apertura.index + apertura[0].length;
    const hasta = codigo.indexOf('`', desde);
    const bloque = codigo.slice(desde, hasta < 0 ? codigo.length : hasta);
    cuantos += [...bloque.matchAll(/<!--|\/\*/g)].length;
  }

  return cuantos;
}

export function revisar(raiz = RAIZ) {
  return ficheros(raiz).flatMap((fichero) =>
    sospechosos(readFileSync(fichero, 'utf8')).map((linea) => `${fichero}:${linea}`),
  );
}

// Solo al ejecutarlo a mano o desde un script de npm, no al importarlo.
if (process.argv[1]?.endsWith('comprueba-plantillas.mjs')) {
  const encontrados = revisar();

  if (encontrados.length > 0) {
    console.error('\nAcento grave dentro de un comentario de una plantilla en línea:\n');
    for (const donde of encontrados) console.error(`  ${donde}`);
    console.error('\nQuítalo: cierra el literal de la plantilla y nada compila.\n');
    process.exit(1);
  }
}
