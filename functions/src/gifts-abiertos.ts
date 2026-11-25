/**
 * `getOpenGifts`: los regalos de una boda del plan básico, sin sesión (D-66).
 *
 * Ver `dominio/regalos-abiertos.ts` para el porqué y las condiciones. Aquí:
 *
 * - El `weddingId` se resuelve desde el slug, en servidor, como `recordWebVisit`
 *   y `guestLogin`: nunca se acepta uno a pelo.
 * - **Respuestas genéricas**: una boda que no existe, que no es básica, que está
 *   en borrador o sin el módulo contestan lo mismo, para no confirmar nada.
 * - Se devuelve la lista **sin reservas**: sin invitado no hay reserva, y lo que
 *   hubiera quedado de otra época no se enseña.
 */

import { HttpsError, onCall } from 'firebase-functions/v2/https';

import { sanearAportacion, sanearRegalos } from './dominio/regalos';
import { regalosAbiertosPermitidos } from './dominio/regalos-abiertos';
import { normalizarSlug } from './dominio/slug';
import { EXIGIR_APP_CHECK, REGION, db } from './firebase';

export const getOpenGifts = onCall<{ slug?: unknown }>(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK },
  async (peticion) => {
    const slug = typeof peticion.data?.slug === 'string' ? normalizarSlug(peticion.data.slug) : '';
    if (slug === '') throw new HttpsError('invalid-argument', 'Falta la dirección.');

    const noHay = () =>
      new HttpsError('not-found', 'No hay regalos que enseñar.', { motivo: 'no-disponible' });

    const registro = await db().doc(`slugs/${slug}`).get();
    const weddingId = registro.data()?.['weddingId'];
    if (typeof weddingId !== 'string' || weddingId === '') throw noHay();

    const [boda, lista] = await Promise.all([
      db().doc(`weddings/${weddingId}`).get(),
      db().collection(`weddings/${weddingId}/gifts`).get(),
    ]);
    if (!regalosAbiertosPermitidos(boda.data())) throw noHay();

    const contenido = (boda.data()?.['content'] ?? {}) as Record<string, unknown>;

    return {
      aportacion: sanearAportacion(contenido['gifts']),
      regalos: sanearRegalos(
        lista.docs.map((d) => ({ id: d.id, ...d.data() })),
        null,
      ).map((r) => ({ ...r, reservado: false, esMio: false })),
    };
  },
);
