/**
 * Las personas importantes de la pareja, en Firestore (`weddings/{id}/weddingParty`).
 *
 * Frontera de confianza (D-19): lo que vuelve pasa por `leerPersona`, que
 * descarta lo roto en vez de tumbar la lista. Las fotos van a Storage, en
 * `weddings/{id}/party/`, de lectura pública (las pinta la web) y de escritura
 * solo de la pareja.
 *
 * Las reglas de Firestore **no dejan guardar una foto sin `photoConsent`**.
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
  writeBatch,
} from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { leerPersona } from '../../features/panel/personas/personas';
import { TIPO_SALIDA, reducir } from '../../shared/imagen';
import type {
  AlmacenFotosPersonas,
  FalloPersonas,
  PuertaPersonas,
  ResultadoEscrituraPersona,
  ResultadoPersonas,
} from '../personas/personas-gateway';
import { FIRESTORE } from './firestore.providers';
import { FIREBASE_STORAGE } from './storage.providers';

export function crearPuertaPersonasFirestore(): PuertaPersonas {
  const db = inject(FIRESTORE);
  const ruta = (weddingId: string) => collection(db, 'weddings', weddingId, 'weddingParty');

  return {
    async listar(weddingId): Promise<ResultadoPersonas> {
      try {
        const snap = await getDocs(ruta(weddingId));
        const personas = snap.docs.flatMap((d) => {
          const leida = leerPersona(d.id, d.data(), weddingId);
          return leida ? [leida] : [];
        });
        return { ok: true, personas };
      } catch (error) {
        return { ok: false, fallo: traducirPersonas(error) };
      }
    },

    async guardar(
      weddingId,
      id,
      datos,
      orden,
      consentimientoNuevo,
    ): Promise<ResultadoEscrituraPersona> {
      try {
        // Ruta de campos concreta: al editar no se toca nada que no esté aquí.
        const campos = {
          displayName: datos.name,
          role: datos.role,
          side: datos.side,
          bio: datos.bio,
          phone: datos.phone,
          photoPath: datos.photoPath,
          photoUrl: datos.photoUrl,
          // Sin foto no hay consentimiento que guardar.
          photoConsent: datos.photoPath !== null && datos.photoConsent,
          visibleToGuests: datos.visible,
          // El vínculo con la lista de invitados: solo para el panel, la
          // proyección pública lo descarta.
          guestId: datos.guestId,
        };
        // La marca de cuándo solo se escribe al confirmar el consentimiento de
        // una foto nueva, y se borra si la foto se quita.
        const marca =
          datos.photoPath === null
            ? { photoConsentAt: null }
            : consentimientoNuevo
              ? { photoConsentAt: serverTimestamp() }
              : {};

        if (id) {
          await updateDoc(doc(ruta(weddingId), id), { ...campos, ...marca });
        } else {
          await addDoc(ruta(weddingId), {
            ...campos,
            ...(datos.photoPath === null ? { photoConsentAt: null } : marca),
            roleIcon: '',
            roleColor: null,
            order: orden,
            createdAt: serverTimestamp(),
          });
        }
        return { ok: true };
      } catch (error) {
        return { ok: false, fallo: traducirPersonas(error) };
      }
    },

    async borrar(weddingId, id): Promise<ResultadoEscrituraPersona> {
      try {
        await deleteDoc(doc(ruta(weddingId), id));
        return { ok: true };
      } catch (error) {
        return { ok: false, fallo: traducirPersonas(error) };
      }
    },

    async reordenar(weddingId, cambios): Promise<ResultadoEscrituraPersona> {
      try {
        const lote = writeBatch(db);
        for (const c of cambios) lote.update(doc(ruta(weddingId), c.id), { order: c.order });
        await lote.commit();
        return { ok: true };
      } catch (error) {
        return { ok: false, fallo: traducirPersonas(error) };
      }
    },
  };
}

export function crearAlmacenFotosPersonas(): AlmacenFotosPersonas {
  const storage = inject(FIREBASE_STORAGE);

  return {
    async subir(weddingId, fichero) {
      const blob = await reducir(fichero);
      // Nombre nuevo en cada subida: reutilizarlo deja la foto vieja en la
      // caché y la pareja cree que no se ha guardado.
      const path = `weddings/${weddingId}/party/${Date.now()}.jpg`;
      const destino = ref(storage, path);
      await uploadBytes(destino, blob, {
        contentType: blob.type || TIPO_SALIDA,
        cacheControl: 'public, max-age=31536000, immutable',
      });
      return { path, url: await getDownloadURL(destino) };
    },

    async borrar(path) {
      await deleteObject(ref(storage, path)).catch(() => undefined);
    },
  };
}

/** Exportada para poder probarla sin red, como las demás traducciones. */
export function traducirPersonas(error: unknown): FalloPersonas {
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
