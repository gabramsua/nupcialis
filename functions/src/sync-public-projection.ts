/**
 * Mantiene al día `weddings/{id}/public/site`.
 *
 * La pareja edita el documento de la boda y sus preguntas frecuentes, que están
 * cerrados al mundo; el invitado lee la proyección, que es pública. Estos dos
 * triggers son el puente entre las dos cosas, y por tanto el sitio por donde se
 * escaparía un dato interno si la proyección se construyera mal.
 *
 * Los dos hacen lo mismo —`reconstruirProyeccion`— porque el documento público
 * es uno: construir cada uno su trozo lo dejaría siendo la mezcla de dos
 * despliegues distintos. Ver `infra/proyeccion.ts`.
 */

import { onDocumentWritten } from 'firebase-functions/v2/firestore';

import { reconstruirProyeccion } from './infra/proyeccion';
import { REGION } from './firebase';

export const syncPublicProjection = onDocumentWritten(
  { document: 'weddings/{weddingId}', region: REGION },
  async (evento) => {
    const weddingId = evento.params['weddingId'];
    if (weddingId) await reconstruirProyeccion(weddingId);
  },
);

/**
 * Las preguntas frecuentes, la cronología y los alojamientos viven en
 * subcolecciones, así que escribir uno no dispara el trigger de la boda
 * (§8.9, §8.13, §8.10).
 *
 * Son un puñado de documentos y la pareja los toca en ratos: reconstruir la
 * proyección entera en cada cambio cuesta dos lecturas y evita tener dos
 * caminos distintos escribiendo el mismo documento.
 */
export const syncPublicAccommodations = onDocumentWritten(
  { document: 'weddings/{weddingId}/accommodations/{alojamientoId}', region: REGION },
  async (evento) => {
    const weddingId = evento.params['weddingId'];
    if (weddingId) await reconstruirProyeccion(weddingId);
  },
);

export const syncPublicTimeline = onDocumentWritten(
  { document: 'weddings/{weddingId}/timelineEvents/{hitoId}', region: REGION },
  async (evento) => {
    const weddingId = evento.params['weddingId'];
    if (weddingId) await reconstruirProyeccion(weddingId);
  },
);

export const syncPublicFaqs = onDocumentWritten(
  { document: 'weddings/{weddingId}/faqs/{faqId}', region: REGION },
  async (evento) => {
    const weddingId = evento.params['weddingId'];
    if (weddingId) await reconstruirProyeccion(weddingId);
  },
);
