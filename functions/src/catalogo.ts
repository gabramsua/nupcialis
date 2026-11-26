/**
 * Los catálogos del superadmin (tareas, presupuesto y preguntas sugeridas).
 *
 * Viven en `catalog/{tipo}/items/{id}`. Se escriben **solo desde aquí**, con el
 * dato validado y dejando rastro en el log de auditoría; se leen directamente
 * (superadmin siempre, y las parejas las sugerencias del quiz). Ver
 * `dominio/catalogo.ts` para qué es cada uno y cómo se copian a las bodas.
 */

import { FieldValue } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import {
  MAX_ELEMENTOS_CATALOGO,
  PARTIDAS_DE_FABRICA,
  TAREAS_DE_FABRICA,
  deFabrica,
  esTipoCatalogo,
  partidasVolcables,
  tareasVolcables,
  validarElemento,
  type PartidaDeCatalogo,
  type TareaDeCatalogo,
  type TipoCatalogo,
} from './dominio/catalogo';
import { EXIGIR_APP_CHECK, REGION, db } from './firebase';
import { auditar } from './infra/auditoria';
import { exigirSuperadmin } from './infra/permisos';

const items = (tipo: TipoCatalogo) => db().collection('catalog').doc(tipo).collection('items');

function tipoDe(valor: unknown): TipoCatalogo {
  if (!esTipoCatalogo(valor)) throw new HttpsError('invalid-argument', 'Catálogo desconocido.');
  return valor;
}

export const saveCatalogItem = onCall(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK },
  async (peticion): Promise<{ id: string }> => {
    const superadmin = exigirSuperadmin(peticion);
    const datos = (peticion.data ?? {}) as Record<string, unknown>;
    const tipo = tipoDe(datos['tipo']);

    const resultado = validarElemento(tipo, datos['elemento']);
    if (!resultado.ok) {
      throw new HttpsError('invalid-argument', 'Los datos no son válidos.', {
        motivo: resultado.motivo,
      });
    }

    const idRecibido = datos['id'];
    const esEdicion = typeof idRecibido === 'string' && idRecibido !== '';
    if (esEdicion && (idRecibido as string).includes('/')) {
      throw new HttpsError('invalid-argument', 'Identificador no válido.');
    }

    let ref;
    if (esEdicion) {
      ref = items(tipo).doc(idRecibido as string);
      if (!(await ref.get()).exists) throw new HttpsError('not-found', 'Ese elemento no existe.');
    } else {
      const total = (await items(tipo).count().get()).data().count;
      if (total >= MAX_ELEMENTOS_CATALOGO) {
        throw new HttpsError('resource-exhausted', 'El catálogo está lleno.');
      }
      ref = items(tipo).doc();
    }

    await ref.set({ ...resultado.datos, updatedAt: FieldValue.serverTimestamp() });

    await auditar({
      actorUid: superadmin.uid,
      actorRole: 'superadmin',
      action: esEdicion ? 'updateCatalogItem' : 'createCatalogItem',
      weddingId: null,
      payload: { tipo, itemId: ref.id },
    });

    return { id: ref.id };
  },
);

export const deleteCatalogItem = onCall(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK },
  async (peticion): Promise<{ ok: true }> => {
    const superadmin = exigirSuperadmin(peticion);
    const datos = (peticion.data ?? {}) as Record<string, unknown>;
    const tipo = tipoDe(datos['tipo']);
    const id = datos['id'];
    if (typeof id !== 'string' || id === '' || id.includes('/')) {
      throw new HttpsError('invalid-argument', 'Identificador no válido.');
    }

    await items(tipo).doc(id).delete();

    await auditar({
      actorUid: superadmin.uid,
      actorRole: 'superadmin',
      action: 'deleteCatalogItem',
      weddingId: null,
      payload: { tipo, itemId: id },
    });

    return { ok: true };
  },
);

/**
 * Carga los originales de fábrica en un catálogo **vacío**.
 *
 * Con elementos ya dentro no hace nada: mezclarlos con los de fábrica
 * duplicaría lo que Gabriel ya ha ido editando.
 */
export const loadFactoryCatalog = onCall(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK },
  async (peticion): Promise<{ creados: number }> => {
    const superadmin = exigirSuperadmin(peticion);
    const tipo = tipoDe((peticion.data as Record<string, unknown> | undefined)?.['tipo']);

    const existentes = (await items(tipo).limit(1).get()).size;
    if (existentes > 0) return { creados: 0 };

    const lote = db().batch();
    for (const elemento of deFabrica(tipo)) {
      lote.set(items(tipo).doc(), { ...elemento, updatedAt: FieldValue.serverTimestamp() });
    }
    await lote.commit();

    await auditar({
      actorUid: superadmin.uid,
      actorRole: 'superadmin',
      action: 'loadFactoryCatalog',
      weddingId: null,
      payload: { tipo, creados: deFabrica(tipo).length },
    });

    return { creados: deFabrica(tipo).length };
  },
);

/**
 * Lo que recibe una boda nueva.
 *
 * Catálogo **sin tocar nunca** (ningún documento): se usan los de fábrica, para
 * que el alta funcione desde el primer día sin que nadie tenga que cargarlos.
 * Con documentos, manda el catálogo —también si están todos apagados: es la
 * forma de decir «que no se vuelque nada»—.
 */
export async function plantillasParaAlta(): Promise<{
  readonly tareas: readonly TareaDeCatalogo[];
  readonly partidas: readonly PartidaDeCatalogo[];
}> {
  const [tareas, partidas] = await Promise.all([items('tasks').get(), items('budget').get()]);

  return {
    tareas: tareas.empty ? TAREAS_DE_FABRICA : tareasVolcables(tareas.docs.map((d) => d.data())),
    partidas: partidas.empty
      ? PARTIDAS_DE_FABRICA
      : partidasVolcables(partidas.docs.map((d) => d.data())),
  };
}
