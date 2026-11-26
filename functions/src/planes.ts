/**
 * Los planes y sus módulos, desde el panel del superadmin (D-53).
 *
 * - `listPlans`: qué módulos trae cada plan y cuántas bodas lo tienen.
 * - `savePlanModules`: cambia los módulos de un plan y lo aplica a **todas** las
 *   bodas de ese plan.
 *
 * Añadir un módulo es inmediato. **Quitarlo avisa**: si alguna boda lo tiene
 * activo, la primera llamada no guarda nada y devuelve cuántas bodas lo usan;
 * solo con `confirmar: true` se aplica. Quitar **desactiva** el módulo, no borra
 * nada: la configuración y los datos de la pareja siguen donde estaban.
 *
 * La proyección pública se republica sola con cada escritura en la boda.
 */

import { FieldValue } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import {
  MODULOS,
  cambiosDeModulosEnBoda,
  diferenciaDePlan,
  leerModulosDePlan,
  modulosDelPlan,
  modulosPorDefecto,
  type Modulo,
  type Plan,
} from './dominio/planes';
import { EXIGIR_APP_CHECK, REGION, db } from './firebase';
import { auditar } from './infra/auditoria';
import { exigirSuperadmin } from './infra/permisos';

const PLANES: readonly Plan[] = ['basic', 'extended'];
const POR_LOTE = 400;

function planDe(valor: unknown): Plan {
  if (valor !== 'basic' && valor !== 'extended') {
    throw new HttpsError('invalid-argument', 'Ese plan no existe.');
  }
  return valor;
}

/** Los módulos de un plan: lo guardado, o los de por defecto. */
export async function leerModulosDePlanGuardados(plan: Plan): Promise<readonly Modulo[]> {
  const doc = await db().doc(`plans/${plan}`).get();
  return modulosDelPlan(plan, doc.data());
}

/** Los dos planes de una vez (para completar bodas sin leer en cada una). */
export async function leerModulosDeLosPlanes(): Promise<Record<Plan, readonly Modulo[]>> {
  const [basic, extended] = await Promise.all(PLANES.map((p) => leerModulosDePlanGuardados(p)));
  return {
    basic: basic ?? modulosPorDefecto('basic'),
    extended: extended ?? modulosPorDefecto('extended'),
  };
}

export const listPlans = onCall(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK },
  async (peticion) => {
    exigirSuperadmin(peticion);

    const planes = await Promise.all(
      PLANES.map(async (plan) => {
        const [guardado, bodas] = await Promise.all([
          db().doc(`plans/${plan}`).get(),
          db().collection('weddings').where('plan', '==', plan).count().get(),
        ]);
        const modulos = modulosDelPlan(plan, guardado.data());
        return {
          id: plan,
          modulos,
          porDefecto: leerModulosDePlan(guardado.data()?.['modules']) === null,
          bodas: bodas.data().count,
        };
      }),
    );

    return { planes, catalogo: MODULOS };
  },
);

export const savePlanModules = onCall<{ plan?: unknown; modules?: unknown; confirmar?: unknown }>(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK, timeoutSeconds: 300 },
  async (peticion) => {
    const superadmin = exigirSuperadmin(peticion);
    const plan = planDe(peticion.data?.plan);

    const nuevos = leerModulosDePlan(peticion.data?.modules);
    if (nuevos === null) {
      throw new HttpsError('invalid-argument', 'Un plan necesita al menos la web pública.', {
        motivo: 'sin-web-publica',
      });
    }

    const antes = await leerModulosDePlanGuardados(plan);
    const diferencia = diferenciaDePlan(antes, nuevos);

    const docs = (await db().collection('weddings').where('plan', '==', plan).get()).docs;

    // Cuántas bodas tienen activo cada módulo que se quita: es lo que se avisa.
    const afectadas = diferencia.quitados
      .map((modulo) => ({
        modulo,
        bodas: docs.filter((d) => d.data()['modules']?.[modulo]?.enabled === true).length,
      }))
      .filter((a) => a.bodas > 0);

    if (afectadas.length > 0 && peticion.data?.confirmar !== true) {
      return { aplicado: false as const, requiereConfirmacion: true as const, afectadas };
    }

    await db()
      .doc(`plans/${plan}`)
      .set({ modules: [...nuevos], updatedAt: FieldValue.serverTimestamp() });

    let bodasActualizadas = 0;
    for (let desde = 0; desde < docs.length; desde += POR_LOTE) {
      const lote = db().batch();
      let pendientes = 0;
      for (const doc of docs.slice(desde, desde + POR_LOTE)) {
        const cambios = cambiosDeModulosEnBoda(doc.data()['modules'], diferencia);
        if (Object.keys(cambios).length === 0) continue;
        lote.update(doc.ref, { ...cambios, updatedAt: FieldValue.serverTimestamp() });
        pendientes++;
      }
      if (pendientes > 0) await lote.commit();
      bodasActualizadas += pendientes;
    }

    await auditar({
      actorUid: superadmin.uid,
      actorRole: 'superadmin',
      action: 'savePlanModules',
      weddingId: null,
      payload: {
        plan,
        anadidos: [...diferencia.anadidos],
        quitados: [...diferencia.quitados],
        bodasActualizadas,
      },
    });

    return { aplicado: true as const, bodasActualizadas, ...diferencia };
  },
);
