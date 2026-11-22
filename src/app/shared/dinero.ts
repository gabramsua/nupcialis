/**
 * Dinero: de lo que escribe una persona a céntimos y de vuelta.
 *
 * Siempre en céntimos enteros: con euros en coma flotante, 0,1 + 0,2 no suma 0,3.
 */

/**
 * De lo que escribe una persona a céntimos.
 *
 * Acepta `299`, `299,5`, `299.50` y `1.299,50` (miles con punto, decimales con
 * coma). Rechaza más de dos decimales y todo lo que no sea un número: redondear
 * en silencio un importe de dinero es peor que pedir que se corrija.
 */
export function eurosACentimos(entrada: unknown): number | null {
  if (typeof entrada !== 'string') return null;
  let t = entrada.replace(/[\s€]/g, '');
  if (t === '') return null;

  if (t.includes(',')) {
    // Con coma decimal, los puntos son separadores de miles.
    t = t.replace(/\./g, '').replace(',', '.');
  } else if ((t.match(/\./g) ?? []).length > 1 || /^\d{1,3}\.\d{3}$/.test(t)) {
    // Sin coma, `1.299` son mil doscientos noventa y nueve —un punto con tres
    // cifras detrás es un separador de miles—, y `299.50` son dos decimales.
    t = t.replace(/\./g, '');
  }

  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
  const [enteros = '0', decimales = ''] = t.split('.');
  const centimos = Number(enteros) * 100 + Number(decimales.padEnd(2, '0'));
  return Number.isSafeInteger(centimos) && centimos > 0 ? centimos : null;
}

export function centimosAEuros(centimos: number, locale = 'es-ES'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(
    centimos / 100,
  );
}

/** Para volver a poner un importe en el campo de edición: `299,50`. */
export function centimosATexto(centimos: number): string {
  const euros = Math.floor(centimos / 100);
  const resto = centimos % 100;
  return resto === 0 ? String(euros) : `${euros},${String(resto).padStart(2, '0')}`;
}

/**
 * Como `eurosACentimos`, pero para campos donde **vacío o cero son válidos**
 * (un real que aún no se conoce): vacío y `0` dan `0`; lo ilegible, `null`.
 */
export function eurosACentimosOCero(entrada: unknown): number | null {
  if (typeof entrada !== 'string') return null;
  const limpio = entrada.replace(/[\s€]/g, '');
  if (limpio === '' || /^0+([.,]0{1,2})?$/.test(limpio)) return 0;
  return eurosACentimos(limpio);
}
