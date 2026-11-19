import type { PaletaMarca } from './tenant-source';

/**
 * Los colores de la pareja como variables CSS.
 *
 * Vive aquí, y no dentro de una pantalla, porque lo necesitan todas las que se
 * pintan con la marca de la boda —la web, la puerta, el formulario de
 * confirmación— y porque los nombres de las variables tienen que ser los
 * mismos en todas: cada hoja de estilos las usa con un valor por defecto
 * (`var(--np-marca-text, var(--np-surface-text))`), así que una variable mal
 * escrita no falla, simplemente deja la pantalla con los colores del sistema y
 * nadie se entera hasta que lo ve una pareja.
 *
 * Sin paleta elegida devuelve un objeto vacío, que es justo lo que hace que los
 * valores por defecto entren en juego.
 */
export function variablesDeMarca(paleta: PaletaMarca | null): Record<string, string> {
  if (!paleta) return {};

  return {
    '--np-marca-primary': paleta.primary,
    '--np-marca-secondary': paleta.secondary,
    '--np-marca-background': paleta.background,
    '--np-marca-surface': paleta.surface,
    '--np-marca-text': paleta.text,
    '--np-marca-accent': paleta.accent,
  };
}
