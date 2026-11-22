/**
 * Pone al día las bodas ya creadas con los módulos y secciones nuevos.
 *
 * Solo superadmin. Añade lo que falta y nunca pisa lo que la pareja ya
 * decidió (ver `dominio/completar-boda`). Es idempotente: una segunda llamada
 * no cambia nada. Pensada para la fase de desarrollo y para cada vez que el
 * producto gane un módulo; la proyección pública se republica sola con la
 * escritura (`syncPublicProjection`).
 */

import { FieldValue } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import { cambiosPendientes, hayCambios } from './dominio/completar-boda';
import { EXIGIR_APP_CHECK, REGION, db } from './firebase';
import { auditar } from './infra/auditoria';
import { exigirSuperadmin } from './infra/permisos';

export interface ResultadoCompletar {
  readonly revisadas: number;
  readonly actualizadas: number;
  readonly modulosAnadidos: number;
  readonly seccionesAnadidas: number;
}

export const completeWeddings = onCall<{ weddingId?: string }>(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK, timeoutSeconds: 120 },
  async (peticion): Promise<ResultadoCompletar> => {
    const superadmin = exigirSuperadmin(peticion);

    const id = peticion.data?.weddingId;
    if (id !== undefined && (typeof id !== 'string' || id.trim() === '')) {
      throw new HttpsError('invalid-argument', 'La boda no es válida.');
    }

    const docs = id
      ? [await db().doc(`weddings/${id}`).get()].filter((d) => d.exists)
      : (await db().collection('weddings').get()).docs;
    if (id && docs.length === 0) throw new HttpsError('not-found', 'Esa boda no existe.');

    let actualizadas = 0;
    let modulosAnadidos = 0;
    let seccionesAnadidas = 0;

    for (const doc of docs) {
      const cambios = cambiosPendientes(doc.data() ?? {});
      if (!hayCambios(cambios)) continue;

      const escritura: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
      for (const [modulo, config] of Object.entries(cambios.modulos)) {
        escritura[`modules.${modulo}`] = config;
        modulosAnadidos++;
      }
      if (cambios.secciones) {
        escritura['content.sections'] = cambios.secciones;
        seccionesAnadidas++;
      }

      await doc.ref.update(escritura);
      actualizadas++;
    }

    const resultado = { revisadas: docs.length, actualizadas, modulosAnadidos, seccionesAnadidas };
    await auditar({
      actorUid: superadmin.uid,
      actorRole: 'superadmin',
      action: 'completeWeddings',
      weddingId: id ?? null,
      payload: { ...resultado },
    });
    return resultado;
  },
);
