/**
 * Mantiene al día `weddings/{id}/public/site`.
 *
 * La pareja edita el documento de la boda, que está cerrado al mundo; el
 * invitado lee la proyección, que es pública. Este trigger es el puente entre
 * las dos, y por tanto el sitio por donde se escaparía un dato interno si la
 * proyección se construyera mal. Qué sale y qué no lo decide
 * `dominio/proyeccion.ts`, que es puro y está probado.
 */

import { FieldValue } from 'firebase-admin/firestore';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';

import { proyeccionPublica, type BodaParaProyectar } from './dominio/proyeccion';
import { REGION, db } from './firebase';

export const syncPublicProjection = onDocumentWritten(
  { document: 'weddings/{weddingId}', region: REGION },
  async (evento) => {
    const weddingId = evento.params['weddingId'];
    if (!weddingId) return;

    const despues = evento.data?.after;
    const sitio = db().doc(`weddings/${weddingId}/public/site`);

    // Boda borrada: se borra también su cara pública. Dejarla sería publicar
    // una boda que ya no existe.
    if (!despues?.exists) {
      await sitio.delete();
      return;
    }

    const boda = despues.data() as BodaParaProyectar | undefined;
    if (!boda) return;

    const nueva = proyeccionPublica(boda);
    const actual = (await sitio.get()).data();

    // Solo se escribe si algo cambia de verdad. La pareja edita su boda docenas
    // de veces al día y cada escritura aquí es una lectura menos de cuota y un
    // trigger menos en cadena.
    if (actual && igual(actual, nueva)) return;

    await sitio.set({ ...nueva, updatedAt: FieldValue.serverTimestamp() });
  },
);

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
