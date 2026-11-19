/**
 * Los grupos de invitados con Firestore (lectura) y Cloud Functions (escritura).
 *
 * Frontera de confianza (D-19): lo que llega de Firestore se comprueba antes de
 * salir de aquí. Un color que no está en la paleta —un documento antiguo, uno
 * tocado a mano en la consola— se pinta con el primero en vez de reventar la
 * pantalla con una variable CSS que no existe.
 */

import { inject } from '@angular/core';
import { collection, getDocs } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

import { NP_CATEGORIAS, type NpCategoria } from '../../design-system/tokens/semantic.generated';
import {
  marcarPorDefecto,
  ordenarGrupos,
  type DatosGrupo,
  type FalloGrupo,
  type Grupo,
  type PuertaGrupos,
  type ResultadoBorradoGrupo,
  type ResultadoGrupos,
  type ResultadoGuardadoGrupo,
  type ResultadoOrdenGrupos,
} from '../invitados/grupos-gateway';
import type { Lado } from '../invitados/invitados-gateway';
import { FIRESTORE } from './firestore.providers';
import { FIREBASE_FUNCTIONS } from './functions.providers';

interface ErrorFirebase {
  readonly code?: string;
  readonly message?: string;
  readonly details?: unknown;
}

export function crearPuertaGruposFirebase(): PuertaGrupos {
  const db = inject(FIRESTORE);
  const functions = inject(FIREBASE_FUNCTIONS);

  return {
    async listar(weddingId: string): Promise<ResultadoGrupos> {
      try {
        const snap = await getDocs(collection(db, 'weddings', weddingId, 'guestGroups'));
        const grupos = snap.docs.map((d) => aGrupo(d.id, d.data()));
        return { ok: true, grupos: ordenarGrupos(marcarPorDefecto(grupos)) };
      } catch (error) {
        return { ok: false, fallo: traducirGrupo(error) };
      }
    },

    async guardar(datos: DatosGrupo): Promise<ResultadoGuardadoGrupo> {
      const upsertGroup = httpsCallable<DatosGrupo, { id: string; creado: boolean }>(
        functions,
        'upsertGroup',
      );
      try {
        const r = await upsertGroup(datos);
        return { ok: true, id: r.data.id, creado: r.data.creado };
      } catch (error) {
        return { ok: false, fallo: traducirGrupo(error) };
      }
    },

    async reordenar(ids: readonly string[]): Promise<ResultadoOrdenGrupos> {
      const reorderGroups = httpsCallable<{ ids: readonly string[] }, unknown>(
        functions,
        'reorderGroups',
      );

      try {
        await reorderGroups({ ids });
        return { ok: true };
      } catch (error) {
        return { ok: false, fallo: traducirGrupo(error) };
      }
    },

    async borrar(id: string): Promise<ResultadoBorradoGrupo> {
      const deleteGroup = httpsCallable<{ id: string }, { miembros: number }>(
        functions,
        'deleteGroup',
      );
      try {
        const r = await deleteGroup({ id });
        return { ok: true, miembros: r.data.miembros ?? 0 };
      } catch (error) {
        return { ok: false, fallo: traducirGrupo(error) };
      }
    },
  };
}

const COLORES = NP_CATEGORIAS.map((c) => c.id);
const LADOS: readonly Lado[] = ['A', 'B', 'both'];

export function aGrupo(id: string, d: Record<string, unknown>): Grupo {
  return {
    id,
    name: typeof d['name'] === 'string' ? d['name'] : '',
    side: LADOS.includes(d['side'] as Lado) ? (d['side'] as Lado) : 'both',
    photoAudience: d['photoAudience'] === 'restricted' ? 'restricted' : 'public',
    allowPublicOptIn: d['allowPublicOptIn'] === true,
    color: COLORES.includes(d['color'] as NpCategoria)
      ? (d['color'] as NpCategoria)
      : (COLORES[0] as NpCategoria),
    order: typeof d['order'] === 'number' ? d['order'] : 0,
    porDefecto: d['isDefault'] === true,
  };
}

/**
 * Convierte el error en un caso que la pantalla sabe contar.
 *
 * Exportada para probarla directamente, por la misma razón que la de
 * invitados: desde un test de pantalla la puerta viene doblada y esto no se
 * ejecuta nunca.
 *
 * Sirve para los dos lados: los errores de Firestore llegan sin prefijo
 * (`permission-denied`) y los de las funciones con él
 * (`functions/permission-denied`).
 */
export function traducirGrupo(error: unknown): FalloGrupo {
  const fallo = (error ?? {}) as ErrorFirebase;
  const detalles = (fallo.details ?? {}) as Record<string, unknown>;
  const codigo = (fallo.code ?? '').replace(/^functions\//, '');

  switch (codigo) {
    case 'invalid-argument': {
      const motivos = Array.isArray(detalles['motivos']) ? detalles['motivos'] : [];
      return {
        tipo: 'datos-invalidos',
        campos: motivos
          .map((m) => (m !== null && typeof m === 'object' ? (m as Record<string, unknown>) : {}))
          .filter((m) => typeof m['campo'] === 'string')
          .map((m) => ({
            campo: m['campo'] as string,
            motivo: typeof m['motivo'] === 'string' ? m['motivo'] : 'invalido',
          })),
      };
    }

    case 'failed-precondition':
      if (detalles['motivo'] === 'por-defecto') return { tipo: 'por-defecto' };
      return {
        tipo: 'con-conflictos',
        cuantos: typeof detalles['conflictos'] === 'number' ? detalles['conflictos'] : 0,
      };

    case 'permission-denied':
      return { tipo: 'sin-permiso' };

    case 'unauthenticated':
      return { tipo: 'sin-verificar' };

    default:
      return { tipo: 'error', mensaje: fallo.message ?? 'No se ha podido guardar el grupo.' };
  }
}
