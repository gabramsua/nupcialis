/**
 * Estadísticas y límites por boda, para el superadmin (§8.18).
 *
 * Solo el superadmin, comprobado por claim (`exigirSuperadmin`). Y los límites
 * se **escriben aquí** y no desde la pantalla porque `limits` es un campo de
 * sistema: las reglas impiden que lo toque ni la pareja (regla de oro 6), y es
 * exactamente lo que se quiere, porque un tope que el dueño de la boda puede
 * subirse a sí mismo no es un tope.
 */

import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import {
  MAX_BODAS_EN_ESTADISTICAS,
  resumir,
  validarTopeDeFotos,
  type EstadoDeBoda,
  type FilaDeBoda,
} from './dominio/estadisticas';
import { TOPE_FOTOS_POR_DEFECTO, topeDeFotos } from './dominio/limites';
import { EXIGIR_APP_CHECK, REGION, db } from './firebase';
import { auditar } from './infra/auditoria';
import { exigirSuperadmin } from './infra/permisos';

function estado(valor: unknown): EstadoDeBoda {
  return valor === 'active' || valor === 'archived' ? valor : 'draft';
}

function entero(valor: unknown): number {
  return typeof valor === 'number' && Number.isFinite(valor) ? Math.max(0, Math.floor(valor)) : 0;
}

/** Cuántos documentos hay en una subcolección, sin leerlos. */
async function contar(ruta: string): Promise<number> {
  const snap = await db().collection(ruta).count().get();
  return snap.data().count;
}

/**
 * Una fila por boda, con su uso.
 *
 * Los tres conteos van en paralelo y **por agregación** (`count()`), que cobra
 * una lectura por cada mil documentos contados en vez de una por documento: es
 * la diferencia entre mirar las métricas por unos céntimos o por unos euros.
 */
async function filaDe(weddingId: string, datos: Record<string, unknown>): Promise<FilaDeBoda> {
  const base = `weddings/${weddingId}`;
  const [fotos, partidasQuiz, accesos] = await Promise.all([
    contar(`${base}/photos`),
    contar(`${base}/quizResults`),
    contar(`${base}/guestAccessLog`),
  ]);

  const contadores = (datos['counters'] ?? {}) as Record<string, unknown>;
  const creada = datos['createdAt'];
  const limites = (datos['limits'] ?? {}) as Record<string, unknown>;

  return {
    weddingId,
    slug: typeof datos['slug'] === 'string' ? datos['slug'] : '',
    status: estado(datos['status']),
    plan: typeof datos['plan'] === 'string' ? datos['plan'] : 'basic',
    invitados: entero(contadores['guestsTotal']),
    confirmados: entero(contadores['guestsConfirmed']),
    fotos,
    tope: topeDeFotos(datos),
    topeEsPropio: topeDeFotos(datos) !== TOPE_FOTOS_POR_DEFECTO || limites['maxPhotos'] != null,
    partidasQuiz,
    accesos,
    creadaEn: creada instanceof Timestamp ? creada.toDate().toISOString() : null,
  };
}

export const getAdminStats = onCall(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK, timeoutSeconds: 120 },
  async (peticion) => {
    exigirSuperadmin(peticion);

    const snap = await db()
      .collection('weddings')
      .limit(MAX_BODAS_EN_ESTADISTICAS + 1)
      .get();

    const recortado = snap.size > MAX_BODAS_EN_ESTADISTICAS;
    const docs = snap.docs.slice(0, MAX_BODAS_EN_ESTADISTICAS);
    const bodas = await Promise.all(docs.map((d) => filaDe(d.id, d.data())));

    return { resumen: resumir(bodas, new Date()), bodas, recortado };
  },
);

interface EntradaLimites {
  readonly weddingId?: unknown;
  /** Un entero en rango, o `null` para volver al tope por defecto. */
  readonly maxPhotos?: unknown;
}

/**
 * Fija el tope de fotos de una boda, o lo devuelve al de por defecto.
 *
 * Queda en el registro de auditoría con el valor anterior y el nuevo: subir el
 * tope de una boda es gastar almacenamiento de todos, y quien lo hizo y cuándo
 * tiene que poder consultarse.
 */
export const setWeddingLimits = onCall<EntradaLimites>(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK },
  async (peticion) => {
    const superadmin = exigirSuperadmin(peticion);

    const weddingId = peticion.data?.weddingId;
    if (typeof weddingId !== 'string' || weddingId.trim() === '') {
      throw new HttpsError('invalid-argument', 'Falta la boda.');
    }

    const tope = validarTopeDeFotos(peticion.data?.maxPhotos);
    if (!tope.ok) {
      throw new HttpsError('invalid-argument', 'El tope de fotos no es válido.', {
        motivo: 'tope-invalido',
      });
    }

    const ref = db().doc(`weddings/${weddingId}`);
    const boda = await ref.get();
    if (!boda.exists) throw new HttpsError('not-found', 'Esa boda no existe.');

    const antes = topeDeFotos(boda.data());

    await ref.update({
      // Con la ruta punteada solo se toca `maxPhotos`: el día que `limits` tenga
      // más topes, esto no los pisa.
      'limits.maxPhotos': tope.valor === null ? FieldValue.delete() : tope.valor,
      updatedAt: FieldValue.serverTimestamp(),
    });

    const despues = tope.valor ?? TOPE_FOTOS_POR_DEFECTO;

    await auditar({
      actorUid: superadmin.uid,
      actorRole: 'superadmin',
      action: 'setWeddingLimits',
      weddingId,
      payload: {
        maxPhotosAntes: antes,
        maxPhotosDespues: despues,
        porDefecto: tope.valor === null,
      },
    });

    return { weddingId, maxPhotos: despues, topeEsPropio: tope.valor !== null };
  },
);
