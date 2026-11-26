/**
 * Los proveedores de la pareja, en Firestore (`weddings/{id}/vendors`).
 *
 * Frontera de confianza (D-19): lo que vuelve pasa por `leerProveedor`, que
 * descarta lo roto en vez de tumbar la lista. Los contratos van a Storage, en
 * `weddings/{id}/vendors/{vendorId}/`, que solo lee y escribe la pareja.
 */

import { inject } from '@angular/core';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import {
  leerProveedor,
  nombreSeguroDeContrato,
} from '../../features/panel/proveedores/proveedores';
import type {
  AlmacenContratos,
  FalloProveedores,
  PuertaProveedores,
  ResultadoEscrituraProveedor,
  ResultadoProveedores,
} from '../proveedores/proveedores-gateway';
import { FIRESTORE } from './firestore.providers';
import { FIREBASE_STORAGE } from './storage.providers';

export function crearPuertaProveedoresFirestore(): PuertaProveedores {
  const db = inject(FIRESTORE);
  const ruta = (weddingId: string) => collection(db, 'weddings', weddingId, 'vendors');

  return {
    async listar(weddingId): Promise<ResultadoProveedores> {
      try {
        const snap = await getDocs(ruta(weddingId));
        const proveedores = snap.docs.flatMap((d) => {
          const leido = leerProveedor(d.id, d.data(), weddingId);
          return leido ? [leido] : [];
        });
        return { ok: true, proveedores };
      } catch (error) {
        return { ok: false, fallo: traducirProveedores(error) };
      }
    },

    async guardar(weddingId, id, datos, orden): Promise<ResultadoEscrituraProveedor> {
      try {
        // Ruta de campos concreta: al editar no se toca nada que no esté aquí.
        const campos = {
          name: datos.name,
          category: datos.category,
          contactName: datos.contactName,
          phone: datos.phone,
          email: datos.email,
          website: datos.website,
          quotedPrice: datos.quotedCents,
          agreedPrice: datos.agreedCents,
          status: datos.status,
          payments: datos.payments.map((p) => ({
            amountCents: p.amountCents,
            on: p.on,
            concept: p.concept,
          })),
          contractPaths: [...datos.contractPaths],
          rating: datos.rating,
          notes: datos.notes,
        };

        if (id) {
          await updateDoc(doc(ruta(weddingId), id), campos);
          return { ok: true, id };
        }
        const creado = await addDoc(ruta(weddingId), {
          ...campos,
          color: null,
          icon: '',
          order: orden,
          createdAt: serverTimestamp(),
        });
        return { ok: true, id: creado.id };
      } catch (error) {
        return { ok: false, fallo: traducirProveedores(error) };
      }
    },

    async borrar(weddingId, id): Promise<ResultadoEscrituraProveedor> {
      try {
        await deleteDoc(doc(ruta(weddingId), id));
        return { ok: true, id };
      } catch (error) {
        return { ok: false, fallo: traducirProveedores(error) };
      }
    },
  };
}

export function crearAlmacenContratos(): AlmacenContratos {
  const storage = inject(FIREBASE_STORAGE);

  return {
    async subir(weddingId, proveedorId, fichero): Promise<string> {
      // Sello de hora delante: dos contratos con el mismo nombre no se pisan.
      const path = `weddings/${weddingId}/vendors/${proveedorId}/${Date.now()}-${nombreSeguroDeContrato(fichero.name)}`;
      await uploadBytes(ref(storage, path), fichero, { contentType: 'application/pdf' });
      return path;
    },

    async url(path): Promise<string> {
      return getDownloadURL(ref(storage, path));
    },

    async borrar(path): Promise<void> {
      await deleteObject(ref(storage, path)).catch(() => undefined);
    },
  };
}

/** Exportada para poder probarla sin red, como las demás traducciones. */
export function traducirProveedores(error: unknown): FalloProveedores {
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
