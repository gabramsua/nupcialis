/**
 * Las preguntas frecuentes de la boda (§8.9).
 *
 * **Copia literal** de `functions/src/dominio/faqs.ts`, de la línea marcadora
 * de ahí abajo hasta el final. No se edita solo este fichero: se editan los
 * dos, o el test de las funciones falla al compararlos.
 *
 * El cliente lo necesita para pintarlas en la web pública y para editarlas en
 * el panel. El servidor, para construir la proyección. Ninguno de los dos
 * puede importar del otro: son dos paquetes npm distintos.
 */

// === COPIA LITERAL: de aquí al final, idéntico en cliente y funciones ===

/**
 * Cuántas preguntas se publican como mucho.
 *
 * No es un límite de producto: es que esto viaja en el documento que descarga
 * cada invitado desde el móvil. Con cuarenta hay de sobra; la pareja que
 * escriba la cuarenta y una tiene un problema distinto.
 */
export const MAX_FAQS = 40;
export const MAX_PREGUNTA = 200;
/** La respuesta lleva HTML del editor, así que necesita más sitio. */
export const MAX_RESPUESTA = 3000;
export const MAX_CATEGORIA = 40;

/**
 * Los iconos que puede llevar una pregunta.
 *
 * Lista cerrada y **presente en los dos sprites**, el del panel y el público:
 * un icono que solo esté en el del panel se pintaría como un hueco en la web
 * del invitado. Lo que no esté aquí cae en `question`, que es el genérico.
 */
export const ICONOS_FAQ = [
  'question',
  'car-simple',
  'bus',
  'baby',
  't-shirt',
  'clock',
  'leaf',
  'map-pin',
  'camera',
  'gift',
  'bed',
  'wheelchair',
  'music-notes',
  'fork-knife',
] as const;

export type IconoFaq = (typeof ICONOS_FAQ)[number];

export function esIconoFaq(valor: unknown): valor is IconoFaq {
  return typeof valor === 'string' && (ICONOS_FAQ as readonly string[]).includes(valor);
}

/** Una pregunta tal y como llega a la web pública. */
export interface FaqPublica {
  readonly id: string;
  readonly question: string;
  /** HTML ya saneado en el servidor (regla de oro 5). */
  readonly answer: string;
  readonly category: string;
  readonly icon: IconoFaq;
  readonly order: number;
}

function texto(valor: unknown, maximo: number): string {
  if (typeof valor !== 'string') return '';
  return valor.replace(/\r\n/g, '\n').trim().slice(0, maximo);
}

/**
 * Deja la lista publicable. Nunca lanza.
 *
 * Qué se cae y por qué:
 *
 * - Las **apagadas**, que es como la pareja esconde una pregunta sin borrarla.
 * - Las que **no tienen pregunta escrita**: una tarjeta con la respuesta y sin
 *   el título no se entiende.
 * - Las que **no tienen respuesta**: la semilla de fábrica nace así, con la
 *   pregunta puesta y la respuesta por escribir, y publicarla sería prometerle
 *   al invitado una respuesta que no está.
 *
 * El orden sale de `order`, y a igualdad, del id: dos preguntas con el mismo
 * número no pueden bailar de sitio en cada recarga.
 */
export function sanearFaqs(valor: unknown): readonly FaqPublica[] {
  if (!Array.isArray(valor)) return [];

  const salida: FaqPublica[] = [];
  const vistos = new Set<string>();

  for (const crudo of valor) {
    if (crudo === null || typeof crudo !== 'object') continue;

    const f = crudo as Record<string, unknown>;
    const id = texto(f['id'], 60);
    const question = texto(f['question'], MAX_PREGUNTA);
    const answer = texto(f['answer'], MAX_RESPUESTA);

    if (id === '' || vistos.has(id)) continue;
    if (question === '' || answer === '') continue;
    if (f['enabled'] === false) continue;

    vistos.add(id);
    salida.push({
      id,
      question,
      answer,
      category: texto(f['category'], MAX_CATEGORIA),
      icon: esIconoFaq(f['icon']) ? f['icon'] : 'question',
      order: typeof f['order'] === 'number' && Number.isFinite(f['order']) ? f['order'] : 0,
    });
  }

  return salida.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id)).slice(0, MAX_FAQS);
}

export interface GrupoDeFaqs {
  /** El nombre que escribió la pareja, o vacío para las que no tienen. */
  readonly categoria: string;
  readonly preguntas: readonly FaqPublica[];
}

/**
 * Agrupa por categoría, **en el orden en que aparecen**.
 *
 * No alfabético: la pareja ordena las preguntas y ese orden decide también el
 * de los grupos. «Cómo llegar» primero porque su primera pregunta va primera,
 * que es lo que ella ha dicho arrastrando.
 *
 * Las que no tienen categoría van juntas al final: son las que ha añadido con
 * prisa, y separarlas una a una sería peor.
 */
export function agrupadas(faqs: readonly FaqPublica[]): readonly GrupoDeFaqs[] {
  const grupos = new Map<string, FaqPublica[]>();

  for (const faq of faqs) {
    const suyo = grupos.get(faq.category);
    if (suyo) suyo.push(faq);
    else grupos.set(faq.category, [faq]);
  }

  const sinCategoria = grupos.get('');
  grupos.delete('');

  const salida = [...grupos.entries()].map(([categoria, preguntas]) => ({
    categoria,
    preguntas,
  }));

  if (sinCategoria) salida.push({ categoria: '', preguntas: sinCategoria });

  return salida;
}

/** A partir de cuántas preguntas tiene sentido un buscador (§8.9). */
export const FAQS_PARA_BUSCADOR = 10;

/**
 * Filtra por lo que escribe el invitado.
 *
 * Busca en la pregunta, en la categoría **y en la respuesta**, ignorando
 * acentos y etiquetas: quien busca «autobus» escribe eso, y la palabra puede
 * estar en el texto de la respuesta y no en el título.
 */
export function filtrarFaqs(faqs: readonly FaqPublica[], texto: string): readonly FaqPublica[] {
  const aguja = sinAcentos(texto);
  if (aguja === '') return faqs;

  return faqs.filter((faq) => {
    const pajar = sinAcentos(`${faq.question} ${faq.category} ${sinEtiquetas(faq.answer)}`);
    return pajar.includes(aguja);
  });
}

function sinEtiquetas(html: string): string {
  return html.replace(/<[^>]*>/g, ' ');
}

function sinAcentos(valor: string): string {
  return valor.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}
