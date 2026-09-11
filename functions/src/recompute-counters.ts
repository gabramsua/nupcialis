/**
 * Mantiene `weddings/{id}.counters`.
 *
 * Se dispara con cada escritura sobre un invitado y recuenta la colección
 * entera. Recontar es más caro que incrementar, y es lo correcto: un contador
 * incremental se desincroniza a la primera importación masiva o al primer
 * reintento del trigger —que Firestore garantiza *al menos una* entrega, no
 * exactamente una— y, una vez desincronizado, no vuelve solo.
 *
 * El coste real es asumible: una boda son cientos de invitados, no millones, y
 * la escritura solo ocurre si algún número cambia.
 */

import { FieldValue } from 'firebase-admin/firestore';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';

import { contadoresIguales, recontar, type InvitadoParaContar } from './dominio/contadores';
import { REGION, db } from './firebase';

export const recomputeCounters = onDocumentWritten(
  { document: 'weddings/{weddingId}/guests/{guestId}', region: REGION },
  async (evento) => {
    const weddingId = evento.params['weddingId'];
    if (!weddingId) return;

    const bodaRef = db().doc(`weddings/${weddingId}`);
    const boda = await bodaRef.get();
    // La boda puede haberse borrado entera: no hay contadores que actualizar y
    // escribir aquí resucitaría el documento.
    if (!boda.exists) return;

    const invitados = await bodaRef.collection('guests').get();
    const contadores = recontar(invitados.docs.map((d) => d.data() as InvitadoParaContar));

    const actuales = boda.data()?.['counters'] as Record<string, number> | undefined;
    if (contadoresIguales(actuales, contadores)) return;

    // Actualización por campos y no `counters: {...}`: `photosPending` lo lleva
    // el módulo de galería y un objeto entero se lo llevaría por delante.
    await bodaRef.update({
      ...Object.fromEntries(
        Object.entries(contadores).map(([clave, valor]) => [`counters.${clave}`, valor]),
      ),
      updatedAt: FieldValue.serverTimestamp(),
    });
  },
);
