import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { cuantosComentarios, ficheros, revisar } from '../../tools/comprueba-plantillas.mjs';

/**
 * El mismo aviso que `tools/comprueba-plantillas.mjs`, aquí dentro.
 *
 * La comprobación de verdad es ese script, y corre **antes** de compilar: un
 * acento grave dentro de un comentario de plantilla rompe el fichero entero,
 * así que para cuando Vitest arrancara ya no habría nada que ejecutar. Esta
 * prueba existe para que el aviso salga también en la batería y para que el
 * script no se quede sin nadie que lo mire.
 */
describe('los comentarios de las plantillas en línea', () => {
  it('no llevan acentos graves, que cierran el literal de la plantilla', () => {
    expect(revisar('src/app')).toEqual([]);
  });

  it('encuentra comentarios que mirar (si no, la rota es esta prueba)', () => {
    const cuantos = ficheros('src/app').reduce(
      (total: number, f: string) => total + cuantosComentarios(readFileSync(f, 'utf8')),
      0,
    );

    expect(cuantos).toBeGreaterThan(20);
  });
});
