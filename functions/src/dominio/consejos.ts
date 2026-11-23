/**
 * Los consejos de cada módulo del panel (D-53).
 *
 * Cada pantalla de la pareja lleva arriba un «Consejo» desplegable: una frase o
 * dos de alguien que sabe cómo se organiza una boda. El texto lo gestiona el
 * superadmin; si no ha tocado ninguno, vale el de fábrica.
 *
 * Es **texto plano**: lo pinta el panel con interpolación normal, nunca como
 * HTML, así que no hay nada que sanear. Los saltos de línea separan párrafos.
 */

import { MODULOS, type Modulo } from './planes';

export const MAX_CONSEJO = 800;

/** Los módulos que tienen pantalla en el panel y por tanto llevan consejo. */
export const MODULOS_CON_CONSEJO: readonly Modulo[] = [
  'publicSite',
  'guests',
  'rsvp',
  'tables',
  'map',
  'gallery',
  'quiz',
  'gifts',
  'playlist',
  'timeline',
  'faqs',
  'accommodation',
  'dressCode',
  'story',
  'budget',
  'checklist',
];

export const CONSEJOS_DE_FABRICA: Readonly<Record<string, string>> = {
  publicSite:
    'Publicad la web cuando tengáis fecha, lugar y horarios cerrados: es lo primero que va a buscar cualquier invitado. Lo demás se puede ir completando después sin avisar a nadie.',
  guests:
    'Empezad por la lista larga y recortad después. Marcad desde el principio a quién queréis sí o sí, y dejad un margen para los «ya veremos»: casi siempre hay un 10 % que al final no puede venir.',
  rsvp: 'Poned una fecha límite realista para confirmar, un mes antes del banquete como mínimo, y reclamad a quien no haya contestado una semana antes. El catering os pedirá cifras cerradas.',
  tables:
    'Sentad primero a quien es seguro y dejad los grupos conflictivos para el final. Mezclar edades en una misma mesa suele funcionar mejor de lo que parece.',
  map: 'Añadid siempre el aparcamiento y cómo llegar en transporte. Quien llega perdido a una ceremonia al aire libre no suele llegar a tiempo.',
  gallery:
    'Avisad en el banquete de que hay un sitio donde subir las fotos. Cuanto más pronto lo pidáis, más fotos tendréis al día siguiente.',
  quiz: 'Mezclad preguntas fáciles con alguna imposible, y nada que deje mal a alguien delante de su familia. Menos de diez preguntas se juega de un tirón.',
  gifts:
    'Si preferís dinero a objetos, decidlo con naturalidad y con una frase amable. La mayoría de invitados lo agradece: así no tiene que adivinar.',
  playlist:
    'Dejad que los invitados propongan, pero la última palabra es vuestra. Una lista de «canciones que no queremos oír» ahorra más de un disgusto.',
  timeline:
    'Contad con que todo se retrasa: poned los horarios como mucho a 15 minutos de margen y un colchón antes del banquete.',
  faqs: 'Pensad en las diez preguntas que más os harán por WhatsApp (aparcar, niños, regalos, cómo ir vestido) y contestadlas aquí una sola vez.',
  accommodation:
    'Si hay invitados de fuera, buscad opciones de varios precios y reservad un bloque de habitaciones con tiempo: las buenas fechas se agotan.',
  dressCode:
    'Cuanto más concreto, mejor: «traje oscuro, sin corbata» se entiende; «elegante» cada uno lo interpreta a su manera. Y avisad si hay césped y tacones.',
  story:
    'No hace falta contarlo todo. Tres o cuatro momentos con una foto buena cada uno se leen mejor que una cronología entera.',
  budget:
    'Apuntad todo lo que vais pagando, también las señales. Las bodas casi siempre cuestan entre un 10 y un 20 % más de lo previsto: dejad esa partida.',
  checklist:
    'Revisad la lista cada mes y no os agobiéis por lo que no toca todavía. Lo que sí merece prisa son los proveedores clave: sitio, fotografía y catering.',
};

export function esModuloConConsejo(valor: unknown): valor is Modulo {
  return (
    typeof valor === 'string' &&
    (MODULOS as readonly string[]).includes(valor) &&
    (MODULOS_CON_CONSEJO as readonly string[]).includes(valor)
  );
}

/** El texto limpio o `null` si no sirve. Vacío vale: es «sin consejo en este módulo». */
export function limpiarConsejo(valor: unknown): string | null {
  if (typeof valor !== 'string') return null;
  const texto = valor
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return texto.length > MAX_CONSEJO ? null : texto;
}

/**
 * El consejo de un módulo: lo guardado si hay documento (aunque esté vacío, que
 * es «ninguno»), y si no, el de fábrica.
 */
export function consejoEfectivo(modulo: Modulo, guardado: unknown): string {
  const doc = guardado !== null && typeof guardado === 'object' ? guardado : null;
  const texto = doc ? limpiarConsejo((doc as Record<string, unknown>)['text']) : null;
  return texto ?? CONSEJOS_DE_FABRICA[modulo] ?? '';
}
