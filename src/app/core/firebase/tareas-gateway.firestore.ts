/**
 * Las tareas de la pareja, en Firestore.
 *
 * Frontera de confianza (D-19): lo que vuelve de Firestore se comprueba antes
 * de salir de aquí. Una tarea sembrada por el servidor y una escrita desde el
 * panel tienen que leerse igual, y un campo que falte no puede romper la lista.
 */

import { inject } from '@angular/core';
import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';

import type {
  DatosTarea,
  FalloTareas,
  PuertaTareas,
  ResultadoEscrituraTarea,
  ResultadoTareas,
} from '../checklist/tareas-gateway';
import {
  esPrioridad,
  esResponsable,
  iconoDeTarea,
  type TareaDelPanel,
} from '../../features/panel/checklist/tareas';
import { FIRESTORE } from './firestore.providers';

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor : '';
}

function fecha(valor: unknown): Date | null {
  return valor instanceof Timestamp ? valor.toDate() : null;
}

function enlace(valor: unknown): string | null {
  return typeof valor === 'string' && valor !== '' ? valor : null;
}

/** Exportada para probarla sin red, como las demás traducciones. */
export function aTarea(id: string, datos: Record<string, unknown>): TareaDelPanel {
  return {
    id,
    title: texto(datos['title']),
    description: texto(datos['description']),
    category: texto(datos['category']),
    dueDate: fecha(datos['dueDate']),
    done: datos['done'] === true,
    doneAt: fecha(datos['doneAt']),
    doneByUid: typeof datos['doneByUid'] === 'string' ? datos['doneByUid'] : null,
    doneByEmail: typeof datos['doneByEmail'] === 'string' ? datos['doneByEmail'] : null,
    // Ausente o raro es «los dos»: es lo que siembra el servidor y lo único que
    // no deja una tarea sin dueño por un dato corrupto.
    assignedTo: esResponsable(datos['assignedTo']) ? datos['assignedTo'] : 'both',
    vendorId: enlace(datos['vendorId']),
    budgetItemId: enlace(datos['budgetItemId']),
    priority: esPrioridad(datos['priority']) ? datos['priority'] : 'normal',
    icon: iconoDeTarea(datos['icon']),
    order:
      typeof datos['order'] === 'number' && Number.isFinite(datos['order']) ? datos['order'] : 0,
  };
}

export function crearPuertaTareasFirestore(): PuertaTareas {
  const db = inject(FIRESTORE);

  const ruta = (weddingId: string) => collection(db, 'weddings', weddingId, 'checklistItems');

  return {
    async listar(weddingId: string): Promise<ResultadoTareas> {
      try {
        const snap = await getDocs(ruta(weddingId));
        return { ok: true, tareas: snap.docs.map((d) => aTarea(d.id, d.data())) };
      } catch (error) {
        return { ok: false, fallo: traducirTarea(error) };
      }
    },

    async guardar(weddingId: string, datos: DatosTarea): Promise<ResultadoEscrituraTarea> {
      try {
        const campos = {
          title: datos.title.trim(),
          description: datos.description.trim(),
          category: datos.category.trim(),
          dueDate: datos.dueDate === null ? null : Timestamp.fromDate(datos.dueDate),
          assignedTo: datos.assignedTo,
          priority: datos.priority,
          // Los enlaces viajan con el resto: la pantalla siempre manda los que
          // tiene delante, y `null` es desenlazar.
          vendorId: datos.vendorId,
          budgetItemId: datos.budgetItemId,
        };

        if (datos.id) {
          // Al editar solo se tocan los campos que la pantalla edita: ni
          // `done` ni el icono.
          await updateDoc(doc(ruta(weddingId), datos.id), campos);
        } else {
          await addDoc(ruta(weddingId), {
            ...campos,
            done: false,
            doneAt: null,
            doneByUid: null,
            doneByEmail: null,
            icon: 'list-checks',
            color: null,
            order: datos.order,
            createdAt: serverTimestamp(),
          });
        }

        return { ok: true };
      } catch (error) {
        return { ok: false, fallo: traducirTarea(error) };
      }
    },

    async marcar(weddingId, id, hecha, por): Promise<ResultadoEscrituraTarea> {
      try {
        await updateDoc(doc(ruta(weddingId), id), {
          done: hecha,
          doneAt: hecha ? serverTimestamp() : null,
          doneByUid: hecha ? por.uid : null,
          doneByEmail: hecha ? por.email : null,
        });
        return { ok: true };
      } catch (error) {
        return { ok: false, fallo: traducirTarea(error) };
      }
    },

    async enlazar(weddingId, id, enlaces): Promise<ResultadoEscrituraTarea> {
      try {
        const campos: Record<string, string | null> = {};
        if (enlaces.vendorId !== undefined) campos['vendorId'] = enlaces.vendorId;
        if (enlaces.budgetItemId !== undefined) campos['budgetItemId'] = enlaces.budgetItemId;
        if (Object.keys(campos).length === 0) return { ok: true };
        await updateDoc(doc(ruta(weddingId), id), campos);
        return { ok: true };
      } catch (error) {
        return { ok: false, fallo: traducirTarea(error) };
      }
    },

    async borrar(weddingId, id): Promise<ResultadoEscrituraTarea> {
      try {
        await deleteDoc(doc(ruta(weddingId), id));
        return { ok: true };
      } catch (error) {
        return { ok: false, fallo: traducirTarea(error) };
      }
    },
  };
}

export function traducirTarea(error: unknown): FalloTareas {
  const fallo = (error ?? {}) as { code?: string; message?: string };

  switch (fallo.code) {
    case 'unavailable':
    case 'deadline-exceeded':
      return { tipo: 'red' };

    case 'permission-denied':
    case 'unauthenticated':
      return { tipo: 'sin-permiso' };

    default:
      return { tipo: 'error', mensaje: fallo.message ?? 'Error desconocido' };
  }
}
