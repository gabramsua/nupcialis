/**
 * La galería de la pareja, por invocables.
 *
 * Aquí no hay `canvas` ni nada que reducir: la pareja mira y borra. Lo que
 * vuelve se sanea igual que en la web pública (D-19), porque es la misma
 * frontera.
 */

import { inject } from '@angular/core';
import { httpsCallable } from 'firebase/functions';

import { sanearFotos } from '../../features/public-site/galeria/galeria';
import {
  type PuertaGaleriaPanel,
  type ResultadoBorradoPanel,
  type ResultadoFotosPanel,
  type ResultadoVaciadoGaleria,
} from '../galeria/galeria-panel-gateway';
import { traducirGaleria } from './galeria-gateway.firebase';
import { FIREBASE_FUNCTIONS } from './functions.providers';

export function crearPuertaGaleriaPanelFirebase(): PuertaGaleriaPanel {
  const functions = inject(FIREBASE_FUNCTIONS);

  return {
    async listar(cursor: string | null): Promise<ResultadoFotosPanel> {
      try {
        const llamar = httpsCallable(functions, 'listPhotos');
        const { data } = await llamar({ cursor });
        const datos = (data ?? {}) as Record<string, unknown>;

        return {
          ok: true,
          fotos: sanearFotos(datos['fotos']),
          cursor: typeof datos['cursor'] === 'string' ? datos['cursor'] : null,
        };
      } catch (error) {
        return { ok: false, fallo: traducirGaleria(error) };
      }
    },

    async borrar(photoId: string): Promise<ResultadoBorradoPanel> {
      try {
        const llamar = httpsCallable(functions, 'deletePhoto');
        await llamar({ photoId });
        return { ok: true };
      } catch (error) {
        return { ok: false, fallo: traducirGaleria(error) };
      }
    },

    async vaciar(): Promise<ResultadoVaciadoGaleria> {
      try {
        const llamar = httpsCallable(functions, 'clearGallery');
        const { data } = await llamar({});
        const datos = (data ?? {}) as Record<string, unknown>;

        return {
          ok: true,
          borradas: typeof datos['borradas'] === 'number' ? datos['borradas'] : 0,
        };
      } catch (error) {
        return { ok: false, fallo: traducirGaleria(error) };
      }
    },
  };
}
