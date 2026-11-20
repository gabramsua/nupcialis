/**
 * Saneado del texto enriquecido que escribe la pareja (regla de oro 5).
 *
 * Lo que la pareja escribe en «Nuestra historia» lo van a abrir doscientos
 * invitados desde el móvil, y el navegador no distingue entre el HTML que
 * escribió ella y el que le pegó alguien desde otro sitio. Por eso esto se
 * hace **en el servidor, antes de publicar**, y no en el panel: lo que decide
 * el cliente no protege a nadie.
 *
 * Sin escribir un parseador propio. `sanitize-html` es el que mantiene esto al
 * día frente a las cien formas de colar un `javascript:` en un atributo; un
 * `replace` con una expresión regular es exactamente la clase de código que
 * parece bien escrito hasta que alguien lo prueba de verdad.
 *
 * La lista de etiquetas es **corta a propósito**: es lo que cabe en la barra
 * del editor (D-03). Todo lo que no esté aquí se cae, pero su texto se queda:
 * una pareja que pegue algo desde Word pierde el formato raro, no el párrafo.
 */

import sanitizeHtml from 'sanitize-html';

/** Lo que la pareja puede escribir. Ni imágenes, ni tablas, ni estilos. */
export const ETIQUETAS: readonly string[] = [
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'a',
  'ul',
  'ol',
  'li',
  'h3',
  'h4',
  'blockquote',
];

/** Los enlaces son lo único con atributos, y solo los tres que hacen falta. */
const ATRIBUTOS = { a: ['href', 'target', 'rel'] };

/**
 * Esquemas permitidos en un enlace.
 *
 * `javascript:` fuera, evidentemente. `tel:` y `mailto:` dentro porque una web
 * de boda lleva el teléfono de la finca y el correo de los novios, y en el
 * móvil eso tiene que ser pulsable.
 */
const ESQUEMAS = ['http', 'https', 'mailto', 'tel'];

/**
 * Deja el HTML publicable. Nunca lanza.
 *
 * El recorte va **al final**, cuando ya está saneado: cortar antes dejaría una
 * etiqueta a medias que el navegador cierra por su cuenta y a saber dónde.
 * Y se corta por el final de una etiqueta, no por mitad de una palabra ni de
 * un atributo, pasando el resultado otra vez por el saneador.
 */
/**
 * Lo que ya había escrito antes de que existiera el editor.
 *
 * Esas secciones llevan texto plano con saltos de línea, y hasta ahora se
 * pintaban con `white-space: pre-line`. Al pasar a pintarse como HTML, los
 * saltos se perderían y la pareja vería su texto convertido en un ladrillo sin
 * haber tocado nada. Así que si no hay ni una etiqueta, se convierte: línea en
 * blanco es párrafo nuevo, salto suelto es salto.
 */
function deTextoPlano(valor: string): string {
  const escapado = valor
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  return escapado
    .split(/\n{2,}/)
    .map((parrafo) => `<p>${parrafo.replace(/\n/g, '<br />')}</p>`)
    .join('');
}

function llevaEtiquetas(valor: string): boolean {
  return /<[a-z][^>]*>/i.test(valor);
}

export function sanearHtml(valor: unknown, maximo: number): string {
  if (typeof valor !== 'string' || valor.trim() === '') return '';

  const entrada = llevaEtiquetas(valor) ? valor : deTextoPlano(valor.trim());

  const limpio = sanitizeHtml(entrada, {
    allowedTags: [...ETIQUETAS],
    allowedAttributes: ATRIBUTOS,
    allowedSchemes: ESQUEMAS,
    // Un enlace de la web de una boda se abre fuera, y `noopener` evita que la
    // página de destino pueda tocar la nuestra.
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer' }),
    },
    // Lo de dentro de un `<script>` o un `<style>` no se queda como texto: es
    // código, no es lo que la pareja quería decir.
    nonTextTags: ['script', 'style', 'textarea', 'option', 'noscript'],
  }).trim();

  if (limpio.length <= maximo) return limpio;

  // Cerrar las etiquetas que el corte deja abiertas **añade** caracteres, así
  // que se corta un poco más y se vuelve a medir. Un par de vueltas bastan; si
  // no cupiera, se cae a texto plano, que siempre cabe.
  let corte = maximo;
  for (let vuelta = 0; vuelta < 5 && corte > 0; vuelta += 1) {
    const recortado = sanitizeHtml(limpio.slice(0, corte), {
      allowedTags: [...ETIQUETAS],
      allowedAttributes: ATRIBUTOS,
      allowedSchemes: ESQUEMAS,
    }).trim();

    if (recortado.length <= maximo) return recortado;
    corte -= recortado.length - maximo + 8;
  }

  return sanitizeHtml(limpio, { allowedTags: [], allowedAttributes: {} }).trim().slice(0, maximo);
}

/**
 * ¿Tiene algo que enseñar?
 *
 * Un editor de texto enriquecido vacío no deja una cadena vacía: deja
 * `<p><br></p>`, que ocupa sitio en la web y no dice nada. Esto es lo que
 * distingue «no han escrito nada» de «han escrito algo».
 */
export function tieneContenido(html: string): boolean {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }).trim() !== '';
}
