/**
 * La galería, por invocables, con la foto reducida **en el navegador**.
 *
 * El SDK de Storage no entra aquí a propósito: son decenas de kilobytes en el
 * bundle de la web pública, que tiene 200 kB de presupuesto (§11) y la abre
 * cualquiera desde el móvil con datos. Y no hace falta: el navegador ya tiene
 * que abrir la foto para reducirla —si no, una foto de cámara son ocho megas
 * por la red de una finca—, así que mandarla por la invocable no cuesta nada
 * más.
 *
 * Frontera de confianza (D-19): lo que vuelve se comprueba antes de salir.
 */

import { inject } from '@angular/core';
import { httpsCallable } from 'firebase/functions';

import {
  CALIDAD_JPEG,
  LADO_MAXIMO,
  LADO_MINIATURA,
  sanearFotos,
  type AlbumFoto,
} from '../../features/public-site/galeria/galeria';
import {
  type FalloGaleria,
  type PuertaGaleria,
  type ResultadoBorrado,
  type ResultadoFotos,
  type ResultadoSubida,
} from '../galeria/galeria-gateway';
import { FIREBASE_FUNCTIONS } from './functions.providers';

export function crearPuertaGaleriaFirebase(): PuertaGaleria {
  const functions = inject(FIREBASE_FUNCTIONS);

  return {
    async listar(cursor: string | null, album: AlbumFoto): Promise<ResultadoFotos> {
      try {
        const llamar = httpsCallable(functions, 'listPhotos');
        const { data } = await llamar({ cursor, album });
        const datos = (data ?? {}) as Record<string, unknown>;

        return {
          ok: true,
          fotos: sanearFotos(datos['fotos']),
          cursor: typeof datos['cursor'] === 'string' ? datos['cursor'] : null,
          miGuestId: typeof datos['miGuestId'] === 'string' ? datos['miGuestId'] : null,
        };
      } catch (error) {
        return { ok: false, fallo: traducirGaleria(error) };
      }
    },

    async subir(archivo: File, pie: string, album: AlbumFoto): Promise<ResultadoSubida> {
      try {
        const [grande, miniatura] = await Promise.all([
          reducir(archivo, LADO_MAXIMO),
          reducir(archivo, LADO_MINIATURA),
        ]);

        const llamar = httpsCallable(functions, 'uploadPhoto');
        const { data } = await llamar({
          contenidoBase64: grande,
          miniaturaBase64: miniatura,
          contentType: 'image/jpeg',
          pie,
          album,
        });
        const datos = (data ?? {}) as Record<string, unknown>;

        return { ok: true, id: typeof datos['id'] === 'string' ? datos['id'] : '' };
      } catch (error) {
        return { ok: false, fallo: traducirGaleria(error) };
      }
    },

    async borrar(photoId: string): Promise<ResultadoBorrado> {
      try {
        const llamar = httpsCallable(functions, 'deletePhoto');
        await llamar({ photoId });
        return { ok: true };
      } catch (error) {
        return { ok: false, fallo: traducirGaleria(error) };
      }
    },
  };
}

/**
 * Reduce la foto a un lado máximo y la devuelve en base64, sin la cabecera.
 *
 * Siempre sale **JPEG**: para una foto de cámara no se nota frente al
 * original y deja un solo formato en todo el camino. De paso, resuelve el HEIC
 * del iPhone, que el canvas sí sabe pintar aunque no se pueda subir tal cual.
 */
async function reducir(archivo: File, lado: number): Promise<string> {
  if (!archivo.type.startsWith('image/')) {
    throw Object.assign(new Error('No es una imagen.'), { code: 'invalid-argument' });
  }

  const imagen = await cargar(archivo);
  const escala = Math.min(1, lado / Math.max(imagen.width, imagen.height));
  const ancho = Math.max(1, Math.round(imagen.width * escala));
  const alto = Math.max(1, Math.round(imagen.height * escala));

  const lienzo = document.createElement('canvas');
  lienzo.width = ancho;
  lienzo.height = alto;

  const contexto = lienzo.getContext('2d');
  if (!contexto) {
    throw Object.assign(new Error('El navegador no puede procesar la imagen.'), {
      code: 'internal',
    });
  }

  contexto.drawImage(imagen, 0, 0, ancho, alto);
  cerrar(imagen);

  const base64 = lienzo.toDataURL('image/jpeg', CALIDAD_JPEG).split(',')[1] ?? '';
  if (base64 === '') {
    throw Object.assign(new Error('No se ha podido preparar la imagen.'), { code: 'internal' });
  }

  return base64;
}

/**
 * La imagen, por `createImageBitmap` cuando se puede.
 *
 * Decodifica fuera del hilo principal, así que el móvil no se queda clavado
 * mientras prepara tres fotos. Con `Image` de reserva para quien no lo tenga.
 */
async function cargar(archivo: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(archivo);
    } catch {
      // Hay navegadores que no saben con según qué formato: se sigue abajo.
    }
  }

  return new Promise((resolver, rechazar) => {
    const url = URL.createObjectURL(archivo);
    const imagen = new Image();

    imagen.onload = () => {
      URL.revokeObjectURL(url);
      resolver(imagen);
    };
    imagen.onerror = () => {
      URL.revokeObjectURL(url);
      rechazar(Object.assign(new Error('No se ha podido leer la imagen.'), { code: 'formato' }));
    };
    imagen.src = url;
  });
}

function cerrar(imagen: ImageBitmap | HTMLImageElement): void {
  if ('close' in imagen) imagen.close();
}

export function traducirGaleria(error: unknown): FalloGaleria {
  const fallo = (error ?? {}) as { code?: string; message?: string; details?: unknown };
  const motivo = (fallo.details ?? {}) as { motivo?: unknown };

  if (motivo.motivo === 'sin-verificar') return { tipo: 'sin-verificar' };
  if (motivo.motivo === 'galeria-llena') return { tipo: 'llena' };

  switch (fallo.code) {
    case 'unavailable':
    case 'deadline-exceeded':
    case 'functions/unavailable':
      return { tipo: 'red' };

    case 'resource-exhausted':
    case 'functions/resource-exhausted':
      return { tipo: 'llena' };

    case 'permission-denied':
    case 'functions/permission-denied':
      return { tipo: 'no-es-tuya' };

    case 'invalid-argument':
    case 'functions/invalid-argument':
      return (fallo.message ?? '').includes('pesa')
        ? { tipo: 'pesa-demasiado' }
        : { tipo: 'formato' };

    default:
      return { tipo: 'error' };
  }
}
