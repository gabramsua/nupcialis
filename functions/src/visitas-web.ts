/**
 * `recordWebVisit`: cuenta cuántas veces se abre la web de una boda (D-55).
 *
 * Es un **contador agregado y nada más**: un número que sube y la fecha de la
 * última visita. No guarda IP, ni cookies, ni quién es ni de dónde viene; por eso
 * no hace falta aviso de cookies y no hay conversión (visita → confirmación),
 * que se decidió dejar para más adelante.
 *
 * Lo llama la web pública una vez por pestaña. Cualquiera puede llamarlo (la web
 * es pública), así que la cifra es orientativa: sirve para saber si la pareja
 * ha repartido su enlace y se abre, no para facturar.
 *
 * Escribe `access.webVisits` y `access.lastWebVisitAt`, campos de sistema.
 */

import { FieldValue } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import { normalizarSlug } from './dominio/slug';
import { EXIGIR_APP_CHECK, REGION, db } from './firebase';

export const recordWebVisit = onCall<{ slug?: unknown }>(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK },
  async (peticion) => {
    const slug = typeof peticion.data?.slug === 'string' ? normalizarSlug(peticion.data.slug) : '';
    if (slug === '') throw new HttpsError('invalid-argument', 'Falta la dirección.');

    const registro = await db().doc(`slugs/${slug}`).get();
    const weddingId = registro.data()?.['weddingId'];
    if (typeof weddingId !== 'string' || weddingId === '') return { ok: true as const };

    await db()
      .doc(`weddings/${weddingId}`)
      .update({
        'access.webVisits': FieldValue.increment(1),
        'access.lastWebVisitAt': FieldValue.serverTimestamp(),
      });

    return { ok: true as const };
  },
);
