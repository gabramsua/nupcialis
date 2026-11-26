/**
 * Subir y quitar la foto de portada de una boda.
 *
 * **Se guardan dos cosas: la ruta y la URL.** La ruta hace falta para poder
 * borrar el fichero después; la URL, para que la web pública la pinte sin
 * cargar el SDK de Storage. Resolver una URL de descarga exige ese SDK, y
 * meterlo en el bundle que abre el invitado desde el móvil son kilobytes
 * cobrados a doscientas personas para averiguar algo que ya sabíamos al subir.
 *
 * Las reglas de Storage son la seguridad: `weddings/{wid}/hero/` solo lo
 * escribe el owner de esa boda, solo imágenes y hasta 10 MB.
 */

import { inject } from '@angular/core';
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
  type UploadMetadata,
} from 'firebase/storage';

import { TIPO_SALIDA, reducir } from '../../shared/imagen';
import { FIREBASE_STORAGE } from './storage.providers';

export interface Portada {
  readonly path: string;
  readonly url: string;
}

export interface AlmacenPortada {
  subir(weddingId: string, fichero: File): Promise<Portada>;
  borrar(path: string): Promise<void>;
}

export function crearAlmacenPortada(): AlmacenPortada {
  const storage = inject(FIREBASE_STORAGE);

  return {
    async subir(weddingId: string, fichero: File): Promise<Portada> {
      const blob = await reducir(fichero);

      // Nombre nuevo en cada subida, no un `hero.jpg` fijo. Reutilizar el
      // nombre deja la foto vieja en la caché del navegador y en la CDN, y la
      // pareja ve la anterior durante horas creyendo que no se ha guardado.
      const path = `weddings/${weddingId}/hero/${Date.now()}.jpg`;

      const metadatos: UploadMetadata = {
        contentType: blob.type || TIPO_SALIDA,
        // Un año de caché: el nombre cambia en cada subida, así que nunca se
        // sirve una foto caducada.
        cacheControl: 'public, max-age=31536000, immutable',
      };

      const destino = ref(storage, path);
      await uploadBytes(destino, blob, metadatos);

      return { path, url: await getDownloadURL(destino) };
    },

    async borrar(path: string): Promise<void> {
      // Que el borrado falle no puede impedir quitar la foto de la web: lo que
      // ve el invitado es el documento, no el fichero. Un huérfano en Storage
      // es basura; una portada que no se puede quitar es un problema.
      await deleteObject(ref(storage, path)).catch(() => undefined);
    },
  };
}
