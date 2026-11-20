import { describe, expect, it } from 'vitest';

import { sanearHtml, tieneContenido } from './html';

/**
 * Lo que se vigila aquí es lo único que importa de verdad en este fichero:
 * **que no salga nada ejecutable**. Lo abren doscientos invitados desde el
 * móvil y el navegador no sabe quién escribió qué.
 *
 * Los casos no son inventados: son las formas clásicas de colar un script
 * —etiqueta directa, atributo de evento, `javascript:` en un enlace, `svg` con
 * `onload`, etiqueta a medio cerrar— y todas tienen que acabar en texto o en
 * nada.
 */

const LARGO = 5000;

describe('sanearHtml: lo que no puede pasar', () => {
  it('un script no sale, ni su contenido', () => {
    const salida = sanearHtml('<p>Hola</p><script>alert(1)</script>', LARGO);

    expect(salida).toBe('<p>Hola</p>');
    expect(salida).not.toContain('alert');
  });

  it('los atributos de evento se caen y el texto se queda', () => {
    expect(sanearHtml('<p onclick="robar()">Nuestra historia</p>', LARGO)).toBe(
      '<p>Nuestra historia</p>',
    );
  });

  it('un enlace con javascript: pierde el enlace', () => {
    const salida = sanearHtml('<a href="javascript:alert(1)">pincha</a>', LARGO);

    expect(salida).not.toContain('javascript');
    expect(salida).toContain('pincha');
  });

  it('ni svg, ni iframe, ni img: no están en la lista', () => {
    for (const intento of [
      '<svg onload="alert(1)"></svg>',
      '<iframe src="https://ejemplo"></iframe>',
      '<img src=x onerror="alert(1)">',
      '<object data="x"></object>',
    ]) {
      const salida = sanearHtml(intento, LARGO);
      expect(salida).not.toContain('onload');
      expect(salida).not.toContain('onerror');
      expect(salida).not.toContain('<iframe');
      expect(salida).not.toContain('<img');
    }
  });

  it('un estilo no viaja: ni atributo ni etiqueta', () => {
    const salida = sanearHtml(
      '<p style="position:fixed">x</p><style>body{display:none}</style>',
      LARGO,
    );

    expect(salida).toBe('<p>x</p>');
  });

  it('una etiqueta a medio cerrar no se convierte en otra cosa', () => {
    const salida = sanearHtml('<p>hola<script>alert(1)', LARGO);

    expect(salida).not.toContain('alert');
  });
});

describe('sanearHtml: lo que sí tiene que pasar', () => {
  it('deja el formato que ofrece el editor', () => {
    const entrada =
      '<h3>Nuestra historia</h3><p><strong>Nos conocimos</strong> en <em>2019</em>.</p><ul><li>Uno</li><li>Dos</li></ul>';

    expect(sanearHtml(entrada, LARGO)).toBe(entrada);
  });

  it('un enlace de verdad se queda, y se abre fuera y sin ventana compartida', () => {
    const salida = sanearHtml('<a href="https://finca.example">La finca</a>', LARGO);

    expect(salida).toContain('href="https://finca.example"');
    expect(salida).toContain('target="_blank"');
    expect(salida).toContain('rel="noopener noreferrer"');
  });

  /** Una web de boda lleva el teléfono de la finca, y en el móvil se pulsa. */
  it('mailto y tel valen', () => {
    expect(sanearHtml('<a href="tel:+34666123456">Llamar</a>', LARGO)).toContain('tel:');
    expect(sanearHtml('<a href="mailto:hola@ejemplo.com">Escribir</a>', LARGO)).toContain(
      'mailto:',
    );
  });

  /** Pegar desde Word es lo que va a hacer media pareja. */
  it('lo pegado de un procesador de textos pierde la basura, no el texto', () => {
    const deWord =
      '<p class="MsoNormal"><span lang="ES" style="font-size:11pt">Nos casamos</span></p>';

    expect(sanearHtml(deWord, LARGO)).toBe('<p>Nos casamos</p>');
  });

  it('lo que no es una cadena, o está vacío, no revienta', () => {
    expect(sanearHtml(null, LARGO)).toBe('');
    expect(sanearHtml(undefined, LARGO)).toBe('');
    expect(sanearHtml(42, LARGO)).toBe('');
    expect(sanearHtml('   ', LARGO)).toBe('');
  });
});

describe('sanearHtml: el tope', () => {
  /**
   * El límite existe por dos motivos: lo descarga cada invitado desde el móvil
   * y un documento de Firestore se queda en 1 MiB.
   */
  it('recorta lo que pase del tope', () => {
    const largo = `<p>${'a'.repeat(500)}</p>`;

    expect(sanearHtml(largo, 100).length).toBeLessThanOrEqual(100);
  });

  it('al recortar no deja etiquetas abiertas', () => {
    const salida = sanearHtml(`<p>${'a'.repeat(500)}</p>`, 100);

    // Tantas aperturas como cierres: si el corte dejara una abierta, el resto
    // de la web se pintaría dentro del párrafo.
    expect((salida.match(/<p>/g) ?? []).length).toBe((salida.match(/<\/p>/g) ?? []).length);
  });

  it('lo que cabe se queda tal cual', () => {
    expect(sanearHtml('<p>corto</p>', LARGO)).toBe('<p>corto</p>');
  });
});

describe('tieneContenido', () => {
  /** Un editor vacío no deja una cadena vacía: deja `<p><br></p>`. */
  it('un párrafo vacío no es contenido', () => {
    expect(tieneContenido('<p><br></p>')).toBe(false);
    expect(tieneContenido('<p>   </p>')).toBe(false);
    expect(tieneContenido('')).toBe(false);
  });

  it('con texto dentro, sí', () => {
    expect(tieneContenido('<p>Hola</p>')).toBe(true);
  });
});

/**
 * Las secciones escritas antes de que existiera el editor llevan texto plano
 * con saltos de línea. Al pasar a pintarse como HTML se convertirían en un
 * ladrillo sin que la pareja haya tocado nada.
 */
describe('lo que ya estaba escrito en texto plano', () => {
  it('los párrafos se respetan', () => {
    expect(sanearHtml('Nos conocimos en 2019.\n\nY aquí estamos.', LARGO)).toBe(
      '<p>Nos conocimos en 2019.</p><p>Y aquí estamos.</p>',
    );
  });

  it('un salto suelto sigue siendo un salto', () => {
    expect(sanearHtml('Calle Mayor 1\nSevilla', LARGO)).toBe('<p>Calle Mayor 1<br />Sevilla</p>');
  });

  /** Y lo que parecía una etiqueta y no lo era, se ve tal cual. */
  it('un texto con símbolos de mayor y menor no se convierte en etiquetas', () => {
    const salida = sanearHtml('5 < 7 y 9 > 3', LARGO);

    expect(salida).toContain('5 &lt; 7');
    expect(salida).toContain('9 &gt; 3');
  });
});
