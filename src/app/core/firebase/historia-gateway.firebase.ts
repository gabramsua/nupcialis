/**
 * «Nuestra historia» en Firebase: el texto y las rutas de las fotos en
 * `weddings/{id}.content.story`, y los ficheros en Storage.
 *
 * Frontera de confianza (D-19): lo que vuelve de Firestore pasa por
 * `sanearHistoria`, que siempre devuelve los cinco apartados.
 */

import { inject } from '@angular/core';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import {
  sanearHistoria,
  type ClaveHistoria,
  type FotoDeHistoria,
} from '../../features/public-site/historia/historia';
import { TIPO_SALIDA, reducir } from '../../shared/imagen';
import type {
  FalloHistoria,
  PuertaHistoria,
  ResultadoHistoria,
} from '../historia/historia-gateway';
import { FIRESTORE } from './firestore.providers';
import { FIREBASE_STORAGE } from './storage.providers';

export function traducirHistoria(error: unknown): FalloHistoria {
  const codigo =
    error !== null && typeof error === 'object' && 'code' in error
      ? String((error as { code: unknown }).code)
      : '';
  if (codigo.includes('permission-denied') || codigo.includes('unauthorized')) {
    return { tipo: 'sin-permiso' };
  }
  if (codigo.includes('unavailable') || codigo.includes('network') || codigo.includes('retry')) {
    return { tipo: 'red' };
  }
  return { tipo: 'error', mensaje: error instanceof Error ? error.message : String(error) };
}

export function crearPuertaHistoriaFirebase(): PuertaHistoria {
  const db = inject(FIRESTORE);
  const storage = inject(FIREBASE_STORAGE);

  const boda = (weddingId: string) => doc(db, 'weddings', weddingId);

  return {
    async leer(weddingId) {
      try {
        const snap = await getDoc(boda(weddingId));
        const content = snap.data()?.['content'];
        const story =
          content !== null && typeof content === 'object'
            ? (content as Record<string, unknown>)['story']
            : undefined;
        return { ok: true, valor: sanearHistoria(story) };
      } catch (error) {
        return { ok: false, fallo: traducirHistoria(error) };
      }
    },

    async guardarTexto(weddingId, clave: ClaveHistoria, html): Promise<ResultadoHistoria<null>> {
      try {
        // Ruta anidada: `content` guarda también las secciones y los demás
        // apartados, y escribir el objeto entero se los llevaría por delante.
        await updateDoc(boda(weddingId), { [`content.story.${clave}.html`]: html });
        return { ok: true, valor: null };
      } catch (error) {
        return { ok: false, fallo: traducirHistoria(error) };
      }
    },

    async subirFoto(weddingId, fichero): Promise<ResultadoHistoria<FotoDeHistoria>> {
      try {
        const blob = await reducir(fichero);
        // Nombre nuevo en cada subida (caché de un año, ver `portada.storage`);
        // el sufijo evita que dos subidas en el mismo milisegundo se pisen.
        const path = `weddings/${weddingId}/story/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
        const destino = ref(storage, path);
        await uploadBytes(destino, blob, {
          contentType: blob.type || TIPO_SALIDA,
          cacheControl: 'public, max-age=31536000, immutable',
        });
        return { ok: true, valor: { path, url: await getDownloadURL(destino) } };
      } catch (error) {
        return { ok: false, fallo: traducirHistoria(error) };
      }
    },

    async guardarFotos(weddingId, clave, fotos): Promise<ResultadoHistoria<null>> {
      try {
        await updateDoc(boda(weddingId), {
          [`content.story.${clave}.fotos`]: fotos.map((f) => ({ url: f.url, path: f.path })),
        });
        return { ok: true, valor: null };
      } catch (error) {
        return { ok: false, fallo: traducirHistoria(error) };
      }
    },

    async borrarFichero(path): Promise<void> {
      await deleteObject(ref(storage, path)).catch(() => undefined);
    },
  };
}
