import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { TIPOS_EDITABLES } from '../../public-site/secciones/catalogo-secciones';

/**
 * Que la barra del editor no ofrezca formato que el servidor vaya a tirar.
 *
 * El saneado de verdad vive en el servidor (`functions/src/dominio/html.ts`) y
 * su lista blanca es corta. Si el editor ofreciera un botón de tabla o de
 * color, la pareja lo usaría, le quedaría bonito en el panel y **desaparecería
 * al publicar**: lo peor de los dos mundos, porque el fallo aparece en la web
 * que ven los invitados y no donde se cometió.
 *
 * Así que esto se comprueba leyendo los dos ficheros, igual que `acceso.spec`
 * cruza los niveles de sesión del cliente con los del servidor. No es elegante
 * y es lo único que no se queda desfasado.
 */

const EDITOR = readFileSync('src/app/features/panel/web/editor-rico.ts', 'utf8');
const SANEADOR = readFileSync('functions/src/dominio/html.ts', 'utf8');

/** Qué etiqueta deja cada botón de la barra. Vacío: no deja ninguna. */
const ETIQUETA_DE_BOTON: Record<string, readonly string[]> = {
  bold: ['strong', 'b'],
  italic: ['em', 'i'],
  underline: ['u'],
  strikethrough: ['s'],
  ul: ['ul', 'li'],
  ol: ['ol', 'li'],
  paragraph: ['p', 'h3', 'h4', 'blockquote'],
  link: ['a'],
  eraser: [],
  undo: [],
  redo: [],
};

function botonesDeLaBarra(): string[] {
  const bloque = /buttons:\s*\[([\s\S]*?)\]/.exec(EDITOR);
  expect(bloque, 'no se encontró la lista de botones del editor').not.toBeNull();

  return [...bloque![1].matchAll(/'([^']+)'/g)]
    .map((encaje) => encaje[1])
    .filter((boton) => boton !== '|');
}

function etiquetasQueAdmiteElServidor(): string[] {
  const bloque = /ETIQUETAS: readonly string\[\] = \[([\s\S]*?)\]/.exec(SANEADOR);
  expect(bloque, 'no se encontró la lista de etiquetas del saneador').not.toBeNull();

  return [...bloque![1].matchAll(/'([^']+)'/g)].map((encaje) => encaje[1]);
}

describe('la barra del editor y el saneador del servidor', () => {
  const botones = botonesDeLaBarra();
  const permitidas = etiquetasQueAdmiteElServidor();

  it('encuentra lo que tiene que mirar', () => {
    expect(botones.length).toBeGreaterThan(5);
    expect(permitidas).toContain('strong');
  });

  it('cada botón de la barra deja etiquetas que el servidor publica', () => {
    const traicioneros = botones.filter((boton) => {
      const etiquetas = ETIQUETA_DE_BOTON[boton];
      // Un botón que este test no conoce es sospechoso por definición: o se
      // añade aquí con lo que deja, o no debería estar en la barra.
      if (etiquetas === undefined) return true;
      return etiquetas.some((etiqueta) => !permitidas.includes(etiqueta));
    });

    expect(traicioneros).toEqual([]);
  });

  /**
   * Y al revés: el campo de texto de una sección se edita con el editor, no
   * con un área de texto. Si esto se rompiera, la pareja escribiría HTML a
   * mano sin saberlo.
   */
  it('el texto de una sección se edita con el editor enriquecido', () => {
    const campos = TIPOS_EDITABLES['texto'].campos;

    expect(campos.find((c) => c.nombre === 'texto')?.control).toBe('rico');
    expect(campos.find((c) => c.nombre === 'titulo')?.control).toBe('texto');
  });

  /** Un evento o una nota siguen siendo texto plano: ahí no hay formato. */
  it('los campos de un evento no llevan editor', () => {
    const controles = TIPOS_EDITABLES['evento'].campos.map((c) => c.control);

    expect(controles).not.toContain('rico');
  });
});
