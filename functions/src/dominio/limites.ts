/**
 * Los techos por boda, los que el producto pone y la pareja no toca.
 *
 * Viven en `weddings/{id}.limits`, que es un **campo de sistema**: lo mueve el
 * servidor (hoy a mano, mañana desde el panel de superadmin) y las reglas de
 * Firestore impiden que la pareja lo escriba (regla de oro 6). Una boda sin ese
 * campo —todas las que hay ahora— usa el valor por defecto de aquí.
 *
 * Es solo de servidor: el navegador no necesita saber el tope, le basta con que
 * la subida le diga «llena» cuando se alcanza.
 */

/** D-39: 500 fotos por boda, unos 150 MB con la grande y la miniatura. */
export const TOPE_FOTOS_POR_DEFECTO = 500;

/**
 * El tope de fotos de una boda: el suyo si lo tiene y es un entero positivo, y
 * si no, el de por defecto. Un dato corrupto no puede dejar una galería sin
 * techo —o con un techo de cero que impida subir— por un campo mal escrito.
 */
export function topeDeFotos(boda: unknown): number {
  const limites = (boda as { limits?: unknown } | null | undefined)?.limits;
  const valor = (limites as { maxPhotos?: unknown } | null | undefined)?.maxPhotos;
  return typeof valor === 'number' && Number.isInteger(valor) && valor > 0
    ? valor
    : TOPE_FOTOS_POR_DEFECTO;
}
