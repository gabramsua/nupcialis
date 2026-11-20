import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  cuantosComentarios,
  ficheros,
  revisar,
  sospechosos,
} from '../../tools/comprueba-plantillas.mjs';

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

  /**
   * El fallo que tuvo el escáner: un `accept` con barra y asterisco en una
   * plantilla abría un comentario de CSS que no se cerraba nunca, y a partir
   * de ahí daba por «dentro de un comentario» el resto del fichero. Cada
   * bloque tiene su forma de comentar y solo esa.
   *
   * Los ejemplos se montan con `G` y no escritos tal cual: un fichero de
   * pruebas que contenga el fallo de verdad lo detectaría el propio escáner
   * al recorrer `src/app`, y esta prueba se delataría a sí misma.
   */
  const G = String.fromCharCode(96);

  it('no confunde una barra y un asterisco de un atributo con un comentario', () => {
    const codigo = [
      'const x = {',
      `  template: ${G}`,
      '    <input type="file" accept="image/*" />',
      `  ${G},`,
      `  styles: ${G}`,
      '    .a { color: red; }',
      `  ${G},`,
      '};',
    ].join('\n');

    expect(sospechosos(codigo)).toEqual([]);
  });

  it('sigue cazando el acento grave dentro de un comentario de verdad', () => {
    const conFallo = [
      'const x = {',
      `  template: ${G}`,
      `    <!-- usa ${G}esto${G} -->`,
      `  ${G},`,
      '};',
    ].join('\n');

    expect(sospechosos(conFallo).length).toBeGreaterThan(0);
  });

  it('encuentra comentarios que mirar (si no, la rota es esta prueba)', () => {
    const cuantos = ficheros('src/app').reduce(
      (total: number, f: string) => total + cuantosComentarios(readFileSync(f, 'utf8')),
      0,
    );

    expect(cuantos).toBeGreaterThan(20);
  });
});
