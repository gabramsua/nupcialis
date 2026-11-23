/**
 * `setMyWebStatus`: la pareja publica su web, o la vuelve a poner en borrador.
 *
 * `status` es campo de sistema (regla 6): ni la pareja puede escribirlo desde el
 * navegador. Lo hace esta función, que solo deja los dos pasos que le tocan a
 * ella (D-54):
 *
 * - **Publicar** (`draft` → `active`): exige el mínimo (nombres, fecha y
 *   dirección) y **borra los datos de prueba del quiz**. Es lo que la pareja
 *   hace cuando da la web por buena.
 * - **Volver a borrador** (`active` → `draft`): siempre se puede; es la salida
 *   de emergencia.
 *
 * Archivar y reactivar siguen siendo del superadmin: una boda archivada no la
 * toca la pareja. El `weddingId` sale del claim (regla 1).
 */

import { FieldValue } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import { esEstado, motivosParaNoPublicar, type EstadoBoda } from './dominio/estados';
import { EXIGIR_APP_CHECK, REGION, db } from './firebase';
import { auditar } from './infra/auditoria';
import { exigirPareja } from './infra/permisos';
import { borrarDatosDePruebaDelQuiz } from './infra/quiz-prueba';

/** El estado al que puede ir la pareja desde el actual, o `null` si no puede. */
export function destinoDePareja(actual: EstadoBoda, pedido: unknown): 'active' | 'draft' | null {
  if (actual === 'archived') return null;
  if (pedido === 'active' || pedido === 'draft') return pedido;
  return null;
}

export const setMyWebStatus = onCall<{ status?: unknown }>(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK, timeoutSeconds: 120 },
  async (peticion) => {
    const pareja = exigirPareja(peticion);
    const ref = db().doc(`weddings/${pareja.weddingId}`);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpsError('not-found', 'Esa boda no existe.');

    const datos = snap.data() ?? {};
    const actual: EstadoBoda = esEstado(datos['status']) ? datos['status'] : 'draft';
    const destino = destinoDePareja(actual, peticion.data?.status);

    if (destino === null) {
      throw new HttpsError(
        'failed-precondition',
        actual === 'archived'
          ? 'Esta boda está archivada: pídelo a soporte.'
          : 'Ese estado no existe.',
        { motivo: actual === 'archived' ? 'archivada' : 'estado' },
      );
    }

    if (destino === actual) return { status: actual, cambiado: false, motivos: [] };

    if (destino === 'active') {
      const motivos = motivosParaNoPublicar(datos);
      if (motivos.length > 0) {
        throw new HttpsError('failed-precondition', 'Le faltan datos a la boda.', { motivos });
      }
    }

    // Primero se limpia y después se publica: si lo segundo fallara, la boda
    // sigue en borrador y se puede reintentar. Al revés, el ranking nacería
    // con partidas de prueba a la vista de todos.
    const borrado =
      destino === 'active' ? await borrarDatosDePruebaDelQuiz(pareja.weddingId) : null;

    await ref.update({ status: destino, updatedAt: FieldValue.serverTimestamp() });

    await auditar({
      actorUid: pareja.uid,
      actorRole: 'owner',
      action: 'setMyWebStatus',
      weddingId: pareja.weddingId,
      payload: { de: actual, a: destino, ...(borrado ? { quizBorrado: borrado.resultados } : {}) },
    });

    return { status: destino, cambiado: true, motivos: [] };
  },
);
