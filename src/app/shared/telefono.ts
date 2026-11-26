/**
 * Cómo se enseña un teléfono.
 *
 * Se guarda siempre en formato internacional (`+34677000111`): es lo que
 * necesita el login del invitado y no se puede ambiguar. Pero en pantalla, en
 * las exportaciones y en los formularios el `+34` sobra: casi todos los números
 * son españoles y nadie lo escribe. Solo se quita el de España; el de otro país
 * (`+44…`, `+33…`) se enseña entero, que es justo para lo que sirve.
 *
 * Al volver a escribirlo no hace falta nada: el servidor entiende los nueve
 * dígitos sin prefijo como españoles y respeta cualquier otro con su `+`.
 */
export function telefonoVisible(valor: string | null | undefined): string {
  if (!valor) return '';
  const limpio = valor.trim();
  const m = /^\+34\s*([6789]\d{8})$/.exec(limpio.replace(/[\s.-]/g, ''));
  return m ? m[1] : limpio;
}
