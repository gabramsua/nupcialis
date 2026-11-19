import { InjectionToken } from '@angular/core';

import type { IconoFaq } from '../../features/public-site/faqs/faqs';

/**
 * Puerto de las preguntas frecuentes, del lado de la pareja (§8.9).
 *
 * El invitado **no** pasa por aquí: lee las publicables de la proyección
 * pública, que es lo que le deja ver una boda abierta sin sesión. Esto es la
 * pantalla donde la pareja las escribe, y por tanto ve también las apagadas y
 * las que están a medio escribir.
 */

export interface FaqDelPanel {
  readonly id: string;
  readonly question: string;
  /** HTML del editor. Se sanea en el servidor al publicarse (regla 5). */
  readonly answer: string;
  readonly category: string;
  readonly icon: IconoFaq;
  readonly order: number;
  readonly enabled: boolean;
}

/** Lo que la pareja puede escribir. El `id` ausente significa «nueva». */
export interface DatosFaq {
  readonly id?: string;
  readonly question: string;
  readonly answer: string;
  readonly category: string;
  readonly icon: IconoFaq;
  readonly order: number;
  readonly enabled: boolean;
}

export type FalloFaqs =
  | { readonly tipo: 'sin-permiso' }
  | { readonly tipo: 'red' }
  | { readonly tipo: 'error'; readonly mensaje: string };

export type ResultadoFaqs =
  | { readonly ok: true; readonly faqs: readonly FaqDelPanel[] }
  | { readonly ok: false; readonly fallo: FalloFaqs };

export type ResultadoEscrituraFaq =
  { readonly ok: true } | { readonly ok: false; readonly fallo: FalloFaqs };

export interface PuertaFaqs {
  /** El `weddingId` lo pone quien llama, sacado del claim (regla 1). */
  listar(weddingId: string): Promise<ResultadoFaqs>;
  guardar(weddingId: string, datos: DatosFaq): Promise<ResultadoEscrituraFaq>;
  borrar(weddingId: string, id: string): Promise<ResultadoEscrituraFaq>;
  reordenar(weddingId: string, ids: readonly string[]): Promise<ResultadoEscrituraFaq>;
}

export const PUERTA_FAQS = new InjectionToken<PuertaFaqs>('PUERTA_FAQS');

/** Ordenadas como se van a enseñar: por `order`, y el id decide los empates. */
export function ordenarFaqs(faqs: readonly FaqDelPanel[]): readonly FaqDelPanel[] {
  return faqs.slice().sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

/**
 * Las categorías que ya existen, para ofrecerlas al escribir una nueva.
 *
 * La categoría es texto libre a propósito —cada boda agrupa como quiere—, pero
 * sin esto la pareja escribiría «Cómo llegar», «como llegar» y «Cómo llegar »
 * y tendría tres grupos con un nombre casi igual.
 */
export function categoriasUsadas(faqs: readonly FaqDelPanel[]): readonly string[] {
  const vistas = new Map<string, string>();

  for (const faq of faqs) {
    const limpia = faq.category.trim();
    if (limpia === '') continue;
    const clave = limpia.toLowerCase();
    if (!vistas.has(clave)) vistas.set(clave, limpia);
  }

  return [...vistas.values()].sort((a, b) => a.localeCompare(b, 'es'));
}

/**
 * Mueve una pregunta y renumera. Botones, no arrastre (D-29).
 *
 * Devuelve la misma lista si no hay a dónde moverse, para que la pantalla no
 * escriba en Firestore un orden idéntico al que ya había.
 */
export function moverFaq(
  faqs: readonly FaqDelPanel[],
  id: string,
  direccion: -1 | 1,
): readonly FaqDelPanel[] {
  const desde = faqs.findIndex((f) => f.id === id);
  if (desde < 0) return faqs;

  const hasta = desde + direccion;
  if (hasta < 0 || hasta >= faqs.length) return faqs;

  const copia = [...faqs];
  [copia[desde], copia[hasta]] = [copia[hasta], copia[desde]];
  return copia.map((faq, indice) => ({ ...faq, order: indice + 1 }));
}

/**
 * ¿Está a medio escribir?
 *
 * Son las que la semilla de fábrica deja preparadas: la pregunta puesta y la
 * respuesta por escribir. No se publican (lo decide el servidor), y la pantalla
 * tiene que decirlo, porque si no la pareja cree que su web ya las enseña.
 */
export function aMedias(faq: FaqDelPanel): boolean {
  return faq.answer.trim() === '' || sinEtiquetas(faq.answer).trim() === '';
}

function sinEtiquetas(html: string): string {
  return html.replace(/<[^>]*>/g, ' ');
}
