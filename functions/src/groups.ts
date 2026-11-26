/**
 * Grupos de invitados: crear, editar y borrar.
 *
 * La pareja los **lee** directamente de Firestore —no hay nada sensible en
 * «Universidad» o «Familia de la novia»—, pero los **escribe** por aquí. Las
 * reglas cierran la escritura desde el cliente porque dos invariantes necesitan
 * mirar a la vez los grupos y los invitados, y los invitados están cerrados
 * (regla 2). Ver `dominio/grupos.ts`.
 *
 * El `weddingId` sale del claim (regla 1), igual que en todas las demás.
 */

import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import {
  MAX_GRUPOS,
  conflictosAlRestringir,
  idGrupoPorDefecto,
  ordenPedido,
  validarGrupo,
  type Audiencia,
  type EntradaGrupo,
  type GrupoExistente,
} from './dominio/grupos';
import { normalizarNombre } from './dominio/invitados';
import { EXIGIR_APP_CHECK, REGION, db } from './firebase';
import { auditar } from './infra/auditoria';
import { exigirPareja } from './infra/permisos';

/** Tope de escrituras por lote en Firestore, con margen. */
const POR_LOTE = 400;

/**
 * El id del grupo general («Invitados») de la boda, o `null` si no lo hay.
 *
 * Todo invitado pertenece a él siempre: no tiene sentido que alguien esté en la
 * lista de una boda y no en el grupo de todos. Lo usan los sitios que escriben
 * `groupIds` para garantizarlo.
 */
export async function grupoGeneral(base: Firestore, weddingId: string): Promise<string | null> {
  return idGrupoPorDefecto(await leerGrupos(base, weddingId));
}

/** Los grupos de una boda, en la forma que necesitan las validaciones. */
export async function leerGrupos(
  base: Firestore,
  weddingId: string,
): Promise<(GrupoExistente & { readonly order: number })[]> {
  const snap = await base.collection(`weddings/${weddingId}/guestGroups`).get();

  return snap.docs.map((d) => {
    const g = d.data();
    return {
      id: d.id,
      // Las bodas dadas de alta antes de F1.3 tienen su grupo «Invitados» sin
      // `normalizedName`. Se calcula del nombre para que no parezca otro.
      normalizedName:
        typeof g['normalizedName'] === 'string' && g['normalizedName'] !== ''
          ? g['normalizedName']
          : normalizarNombre(g['name']),
      photoAudience: (g['photoAudience'] === 'restricted' ? 'restricted' : 'public') as Audiencia,
      color: typeof g['color'] === 'string' ? g['color'] : undefined,
      isDefault: g['isDefault'] === true,
      order: typeof g['order'] === 'number' ? g['order'] : 0,
    };
  });
}

export const upsertGroup = onCall<EntradaGrupo>(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK },
  async (peticion) => {
    const { weddingId } = exigirPareja(peticion);
    const datos = peticion.data ?? {};
    const id = typeof datos.id === 'string' && datos.id !== '' ? datos.id : null;

    const base = db();
    const coleccion = base.collection(`weddings/${weddingId}/guestGroups`);
    const grupos = await leerGrupos(base, weddingId);

    if (id && !grupos.some((g) => g.id === id)) {
      throw new HttpsError('not-found', 'Ese grupo no existe.');
    }
    if (!id && grupos.length >= MAX_GRUPOS) {
      throw new HttpsError('resource-exhausted', `El límite son ${MAX_GRUPOS} grupos.`);
    }

    const validado = validarGrupo(datos, grupos, id);
    if (!validado.ok) {
      throw new HttpsError('invalid-argument', 'Revisa los datos del grupo.', {
        motivos: validado.motivos,
      });
    }

    // Pasar a restringido puede dejar a alguien en dos grupos restringidos sin
    // que nadie haya tocado a ese invitado. Se para aquí y se dice a cuántos
    // afecta, en vez de dejar a la galería un estado que no sabe resolver.
    const eraPublico = grupos.find((g) => g.id === id)?.photoAudience !== 'restricted';
    if (id && eraPublico && validado.datos.photoAudience === 'restricted') {
      const invitados = await base
        .collection(`weddings/${weddingId}/guests`)
        .where('groupIds', 'array-contains', id)
        .get();

      const conflictos = conflictosAlRestringir(
        id,
        invitados.docs.map((d) => ({
          groupIds: Array.isArray(d.data()['groupIds']) ? (d.data()['groupIds'] as string[]) : [],
        })),
        grupos,
      );

      if (conflictos > 0) {
        throw new HttpsError('failed-precondition', 'Hay invitados en otro grupo restringido.', {
          conflictos,
        });
      }
    }

    if (id) {
      await coleccion
        .doc(id)
        .update({ ...validado.datos, updatedAt: FieldValue.serverTimestamp() });
      return { id, creado: false };
    }

    const creado = await coleccion.add({
      ...validado.datos,
      // Al final: el grupo recién creado es el que la pareja está buscando.
      order: grupos.reduce((max, g) => Math.max(max, g.order), -1) + 1,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { id: creado.id, creado: true };
  },
);

/**
 * `reorderGroups`: el orden de los grupos lo decide la pareja (F1.3c).
 *
 * Hasta ahora salían por orden de creación, que no es ningún orden: el grupo
 * que más se usa —«Familia»— acababa el sexto porque se creó el sexto, y esa
 * lista se mira cada vez que se da de alta a alguien.
 *
 * Va aparte de `upsertGroup` a propósito: eso valida y escribe **un** grupo, y
 * reordenar es una sola operación sobre todos. Mezclarlo obligaría a mandar
 * cinco veces los datos de cinco grupos para mover uno.
 */
export const reorderGroups = onCall<{ ids?: unknown }>(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK },
  async (peticion) => {
    const { weddingId, uid } = exigirPareja(peticion);

    const pedidos = peticion.data?.ids;
    if (!Array.isArray(pedidos) || pedidos.length === 0) {
      throw new HttpsError('invalid-argument', 'Falta el orden.');
    }

    const base = db();
    const grupos = await leerGrupos(base, weddingId);
    const orden = ordenPedido(
      pedidos,
      grupos.map((g) => g.id),
    );

    const lote = base.batch();
    orden.forEach((id, indice) => {
      lote.update(base.doc(`weddings/${weddingId}/guestGroups/${id}`), {
        order: indice,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
    await lote.commit();

    await auditar({
      actorUid: uid,
      actorRole: 'owner',
      action: 'reorderGroups',
      weddingId,
      payload: { cuantos: orden.length },
    });

    return { ordenados: orden.length };
  },
);

export const deleteGroup = onCall<{ id?: unknown }>(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK },
  async (peticion) => {
    const { weddingId, uid } = exigirPareja(peticion);

    const id = peticion.data?.id;
    if (typeof id !== 'string' || id === '') {
      throw new HttpsError('invalid-argument', 'Falta el grupo.');
    }

    const base = db();
    const ref = base.doc(`weddings/${weddingId}/guestGroups/${id}`);
    if (!(await ref.get()).exists) throw new HttpsError('not-found', 'Ese grupo no existe.');

    // El grupo en el que entra todo invitado nuevo no se borra: sin él, los
    // siguientes que se añadan se quedan sin grupo (D-31).
    if (id === idGrupoPorDefecto(await leerGrupos(base, weddingId))) {
      throw new HttpsError('failed-precondition', 'Ese grupo no se puede borrar.', {
        motivo: 'por-defecto',
      });
    }

    // Primero se suelta a los miembros y después se borra el grupo. Al revés,
    // un fallo a medias deja invitados apuntando a un grupo que ya no existe,
    // y eso es justo lo que este borrado quiere evitar.
    const miembros = await base
      .collection(`weddings/${weddingId}/guests`)
      .where('groupIds', 'array-contains', id)
      .get();

    for (let desde = 0; desde < miembros.docs.length; desde += POR_LOTE) {
      const lote = base.batch();
      for (const miembro of miembros.docs.slice(desde, desde + POR_LOTE)) {
        lote.update(miembro.ref, {
          groupIds: FieldValue.arrayRemove(id),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
      await lote.commit();
    }

    await ref.delete();

    await auditar({
      actorUid: uid,
      actorRole: 'owner',
      action: 'deleteGroup',
      weddingId,
      payload: { groupId: id, miembros: miembros.size },
    });

    return { id, borrado: true, miembros: miembros.size };
  },
);
