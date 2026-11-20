/**
 * Reconstruye `weddings/{id}/public/site`.
 *
 * Está aquí, y no dentro de un trigger, porque **son dos los triggers que la
 * reconstruyen**: el del documento de la boda y el de las preguntas
 * frecuentes, que viven en una subcolección aparte. Si cada uno construyera su
 * trozo, el documento público acabaría siendo la mezcla de dos despliegues
 * distintos, y el día que uno fallara nadie sabría qué parte está vieja.
 *
 * Qué sale y qué no lo decide `dominio/proyeccion.ts`, que es puro y está
 * probado. Aquí solo se lee, se compara y se escribe.
 */

import { FieldValue } from 'firebase-admin/firestore';

import { proyeccionPublica, type BodaParaProyectar } from '../dominio/proyeccion';
import { db } from '../firebase';

export async function reconstruirProyeccion(weddingId: string): Promise<void> {
  const base = db();
  const sitio = base.doc(`weddings/${weddingId}/public/site`);
  const boda = await base.doc(`weddings/${weddingId}`).get();

  // Boda borrada: se borra también su cara pública. Dejarla sería publicar una
  // boda que ya no existe.
  if (!boda.exists) {
    await sitio.delete();
    return;
  }

  const datos = boda.data() as BodaParaProyectar | undefined;
  if (!datos) return;

  const [faqs, cronologia, alojamientos, ubicaciones] = await Promise.all([
    base.collection(`weddings/${weddingId}/faqs`).get(),
    base.collection(`weddings/${weddingId}/timelineEvents`).get(),
    base.collection(`weddings/${weddingId}/accommodations`).get(),
    base.collection(`weddings/${weddingId}/locations`).get(),
  ]);

  const nueva = proyeccionPublica(
    datos,
    faqs.docs.map((d) => ({ id: d.id, ...d.data() })),
    cronologia.docs.map((d) => ({ id: d.id, ...d.data() })),
    alojamientos.docs.map((d) => ({ id: d.id, ...d.data() })),
    ubicaciones.docs.map((d) => ({ id: d.id, ...d.data() })),
  );
  const actual = (await sitio.get()).data();

  // Solo se escribe si algo cambia de verdad. La pareja edita su boda docenas
  // de veces al día y cada escritura aquí es una lectura menos de cuota y un
  // trigger menos en cadena.
  if (actual && igual(actual, nueva)) return;

  await sitio.set({ ...nueva, updatedAt: FieldValue.serverTimestamp() });
}

function igual(actual: Record<string, unknown>, nueva: object): boolean {
  // `updatedAt` lo pone el servidor en cada escritura, así que compararlo diría
  // "ha cambiado" siempre. Se quita de la copia, no del documento.
  const sinFecha = { ...actual };
  delete sinFecha['updatedAt'];
  return JSON.stringify(normalizar(sinFecha)) === JSON.stringify(normalizar(nueva));
}

/**
 * Ordena las claves antes de comparar.
 *
 * `JSON.stringify` respeta el orden de inserción, y el que vuelve de Firestore
 * no tiene por qué coincidir con el que acabamos de construir. Sin esto, la
 * comparación diría "ha cambiado" siempre y el ahorro no existiría.
 */
function normalizar(valor: unknown): unknown {
  if (Array.isArray(valor)) return valor.map(normalizar);
  if (valor === null || typeof valor !== 'object') return valor;

  // Los Timestamp de Firestore se comparan por su valor, no por su forma.
  const posibleFecha = valor as { toMillis?: () => number };
  if (typeof posibleFecha.toMillis === 'function') return posibleFecha.toMillis();

  const entradas = Object.entries(valor as Record<string, unknown>).sort(([a], [b]) =>
    a < b ? -1 : 1,
  );
  return entradas.map(([clave, v]) => [clave, normalizar(v)]);
}
