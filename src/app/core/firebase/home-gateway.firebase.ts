/**
 * La HOME de `nupcialis.com` con Firebase.
 *
 * - **Lectura pública**: `platform/home`, legible por cualquiera (reglas de
 *   Firestore). Lo que vuelve se re-sanea con el mismo código que el servidor
 *   (D-19): un documento viejo o a medias no puede dejar la portada en blanco.
 * - **Escritura**: solo por `saveHome` / `resetHome`, que sanean el HTML. Las
 *   imágenes sí se suben directamente a `platform/home/`: las reglas de Storage
 *   solo dejan al superadmin, solo imágenes y hasta 10 MB.
 */

import { inject } from '@angular/core';
import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { sanearHome, type ContenidoHome, type ImagenHome } from '../../features/home/home';
import { TIPO_SALIDA, reducir } from '../../shared/imagen';
import type {
  FalloHome,
  PuertaHomeAdmin,
  PuertaHomePublica,
  ResultadoHome,
} from '../home/home-gateway';
import { FIREBASE_FUNCTIONS } from './functions.providers';
import { FIRESTORE } from './firestore.providers';
import { FIREBASE_STORAGE } from './storage.providers';

function objeto(valor: unknown): Record<string, unknown> {
  return valor !== null && typeof valor === 'object' ? (valor as Record<string, unknown>) : {};
}

/** El contenido guardado en el documento, o `null` si no hay documento. */
function contenidoDe(datos: unknown): ContenidoHome | null {
  const crudo = objeto(datos)['content'];
  return crudo === undefined ? null : sanearHome(crudo);
}

export function crearPuertaHomePublicaFirebase(): PuertaHomePublica {
  const db = inject(FIRESTORE);

  return {
    async leer() {
      try {
        const snap = await getDoc(doc(db, 'platform', 'home'));
        return snap.exists() ? contenidoDe(snap.data()) : null;
      } catch {
        // Sin red o sin permiso: la portada se pinta igual, con lo de fábrica.
        return null;
      }
    },
  };
}

function traducir(error: unknown): FalloHome {
  const e = objeto(error);
  const detalles = objeto(e['details']);
  const code = typeof e['code'] === 'string' ? e['code'] : '';

  if (detalles['motivo'] === 'largo') return { tipo: 'largo' };
  if (code.endsWith('permission-denied') || code.endsWith('unauthenticated')) {
    return { tipo: 'sin-permiso' };
  }
  if (code.endsWith('unavailable') || code.endsWith('deadline-exceeded')) return { tipo: 'red' };
  return { tipo: 'error', mensaje: typeof e['message'] === 'string' ? e['message'] : '' };
}

export function crearPuertaHomeAdminFirebase(): PuertaHomeAdmin {
  const db = inject(FIRESTORE);
  const functions = inject(FIREBASE_FUNCTIONS);
  const storage = inject(FIREBASE_STORAGE);

  async function envolver<T>(accion: () => Promise<T>): Promise<ResultadoHome<T>> {
    try {
      return { ok: true, datos: await accion() };
    } catch (error) {
      return { ok: false, fallo: traducir(error) };
    }
  }

  return {
    leer: () =>
      envolver(async () => {
        const snap = await getDoc(doc(db, 'platform', 'home'));
        return snap.exists() ? contenidoDe(snap.data()) : null;
      }),

    guardar: (contenido) =>
      envolver(async () => {
        const respuesta = await httpsCallable<unknown, unknown>(
          functions,
          'saveHome',
        )({ contenido });
        return sanearHome(objeto(respuesta.data)['contenido']);
      }),

    restaurar: () =>
      envolver(async () => {
        await httpsCallable<unknown, unknown>(functions, 'resetHome')();
        return null;
      }),

    subirImagen: (fichero) =>
      envolver(async (): Promise<ImagenHome> => {
        const blob = await reducir(fichero);
        // Nombre nuevo en cada subida: reutilizarlo deja la imagen vieja en la
        // caché del navegador y en la CDN.
        const path = `platform/home/${Date.now()}.jpg`;
        const destino = ref(storage, path);
        await uploadBytes(destino, blob, {
          contentType: blob.type || TIPO_SALIDA,
          cacheControl: 'public, max-age=31536000, immutable',
        });
        return { path, url: await getDownloadURL(destino), alt: '' };
      }),

    async borrarImagen(ruta) {
      if (!/^platform\/home\//.test(ruta)) return;
      await deleteObject(ref(storage, ruta)).catch(() => undefined);
    },
  };
}
