/**
 * La HOME de `nupcialis.com`, gestionada desde el superadmin.
 *
 * - **Se lee sin función**: `platform/home` es legible por cualquiera (reglas de
 *   Firestore), porque es la portada pública del producto y no lleva ningún
 *   dato de nadie. El cliente la vuelve a sanear al leerla.
 * - `saveHome`: la escribe el superadmin. **Nada se escribe desde el cliente**:
 *   la función sanea el HTML del editor (regla de oro 5) y recorta cada campo
 *   antes de guardar, porque esto lo abre cualquiera que llegue a la web.
 * - `resetHome`: borra el documento y la HOME vuelve a lo de fábrica.
 */

import { FieldValue } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import { sanearHome } from './dominio/home';
import { sanearHtml } from './dominio/html';
import { EXIGIR_APP_CHECK, REGION, db } from './firebase';
import { auditar } from './infra/auditoria';
import { exigirSuperadmin } from './infra/permisos';

export const saveHome = onCall<{ contenido?: unknown }>(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK },
  async (peticion) => {
    const superadmin = exigirSuperadmin(peticion);

    const crudo = peticion.data?.contenido;
    if (crudo === null || typeof crudo !== 'object' || Array.isArray(crudo)) {
      throw new HttpsError('invalid-argument', 'Falta el contenido de la HOME.');
    }

    // El documento entero cabe de sobra en 1 MiB, pero un cuerpo absurdo no se
    // procesa: se corta antes de sanear nada.
    if (JSON.stringify(crudo).length > 200_000) {
      throw new HttpsError('invalid-argument', 'El contenido es demasiado grande.', {
        motivo: 'largo',
      });
    }

    const contenido = sanearHome(crudo, sanearHtml);

    await db().doc('platform/home').set({
      content: contenido,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: superadmin.uid,
    });

    await auditar({
      actorUid: superadmin.uid,
      actorRole: 'superadmin',
      action: 'saveHome',
      weddingId: null,
      payload: { template: contenido.template },
    });

    return { ok: true as const, contenido };
  },
);

export const resetHome = onCall(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK },
  async (peticion) => {
    const superadmin = exigirSuperadmin(peticion);

    await db().doc('platform/home').delete();

    await auditar({
      actorUid: superadmin.uid,
      actorRole: 'superadmin',
      action: 'resetHome',
      weddingId: null,
    });

    return { ok: true as const };
  },
);
