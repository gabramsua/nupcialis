import { describe, expect, it } from 'vitest';

import { ACENTOS_HOME, HOME_DE_FABRICA, PLANTILLAS_HOME, type ContenidoHome } from './home';
import { TEMAS_HOME, coloresDeHome, variablesDeHome } from './home-tema';

/** Contraste WCAG entre dos colores `#rrggbb`. */
function contraste(a: string, b: string): number {
  const luz = (hex: string): number => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    }) as [number, number, number];
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [x, y] = [luz(a), luz(b)].sort((p, q) => q - p) as [number, number];
  return (x + 0.05) / (y + 0.05);
}

const con = (template: ContenidoHome['template'], accent = ''): ContenidoHome => ({
  ...HOME_DE_FABRICA,
  template,
  accent,
});

describe('los temas de la HOME', () => {
  for (const id of PLANTILLAS_HOME) {
    const t = TEMAS_HOME[id];

    it(`${id}: el texto se lee sobre todos sus fondos`, () => {
      for (const fondo of [t.bg, t.bgAlt, t.surface]) {
        expect(contraste(t.text, fondo)).toBeGreaterThanOrEqual(7);
        expect(contraste(t.muted, fondo)).toBeGreaterThanOrEqual(4.5);
      }
    });

    for (const a of ACENTOS_HOME) {
      it(`${id} con ${a.id}: el texto del botón y el acento como texto se leen`, () => {
        const { accent, onAccent } = coloresDeHome(con(id, a.id));
        // El botón: texto sobre el color de acento.
        expect(contraste(onAccent, accent)).toBeGreaterThanOrEqual(4.5);
        // El acento usado como texto (etiquetas, números) sobre el fondo y las tarjetas.
        for (const fondo of [t.bg, t.bgAlt, t.surface]) {
          expect(contraste(accent, fondo)).toBeGreaterThanOrEqual(4.5);
        }
      });
    }
  }

  it('sin acento elegido usa el de la plantilla', () => {
    const luz = coloresDeHome(con('luz'));
    const rosa = coloresDeHome(con('luz', 'rosa'));
    expect(luz).toEqual(rosa);
  });

  it('las variables incluyen las fuentes y el acento resueltos', () => {
    const css = variablesDeHome({ ...con('editorial'), fontTitle: 'cinzel', fontBody: 'lato' });
    expect(css).toContain('--h-font-title:');
    expect(css).toMatch(/Cinzel/);
    expect(css).toMatch(/Lato/);
    expect(css).toContain(`--h-accent:${coloresDeHome(con('editorial')).accent}`);
  });
});
