/**
 * Contraste entre dos colores, según WCAG 2.
 *
 * Existe para que el catálogo de paletas no se pueda romper sin que un test se
 * entere. Una web de boda con el texto a 2:1 sobre el fondo es ilegible al sol,
 * que es exactamente donde la va a abrir media lista de invitados: de pie, en la
 * calle, mirando el móvil. Ver REQUISITOS §9.3.
 */

/** `#rrggbb` → [r, g, b] en 0..255. `null` si no es un color que entendamos. */
export function componentes(hex: string): readonly [number, number, number] | null {
  const limpio = hex.trim().replace(/^#/, '');
  const largo =
    limpio.length === 3
      ? limpio
          .split('')
          .map((c) => c + c)
          .join('')
      : limpio;

  if (!/^[0-9a-fA-F]{6}$/.test(largo)) return null;

  return [
    Number.parseInt(largo.slice(0, 2), 16),
    Number.parseInt(largo.slice(2, 4), 16),
    Number.parseInt(largo.slice(4, 6), 16),
  ];
}

/** Luminancia relativa (WCAG). 0 es negro, 1 es blanco. */
export function luminancia(hex: string): number | null {
  const rgb = componentes(hex);
  if (!rgb) return null;

  const [r, g, b] = rgb.map((valor) => {
    const canal = valor / 255;
    return canal <= 0.03928 ? canal / 12.92 : Math.pow((canal + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Razón de contraste entre dos colores: de 1 (idénticos) a 21 (negro y blanco).
 *
 * WCAG AA pide **4.5** para texto normal y **3** para texto grande y para
 * elementos de interfaz. Devuelve 0 si alguno de los dos no es un color, para
 * que un valor corrupto no pase por bueno.
 */
export function contraste(a: string, b: string): number {
  const la = luminancia(a);
  const lb = luminancia(b);
  if (la === null || lb === null) return 0;

  const claro = Math.max(la, lb);
  const oscuro = Math.min(la, lb);
  return (claro + 0.05) / (oscuro + 0.05);
}
