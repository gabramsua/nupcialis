/**
 * `getOpenGifts` por invocable. Mismo saneado que `getGifts`: lo que vuelve se
 * limpia aquí con el código que usa el servidor (D-19).
 */

import { inject } from '@angular/core';
import { httpsCallable } from 'firebase/functions';

import {
  sanearAportacion,
  sanearRegalosServidos,
} from '../../features/public-site/regalos/regalos';
import type { PuertaRegalosAbiertos } from '../regalos/regalos-abiertos-gateway';
import { traducirRegalos } from './regalos-gateway.firebase';
import { FIREBASE_FUNCTIONS } from './functions.providers';

export function crearPuertaRegalosAbiertosFirebase(): PuertaRegalosAbiertos {
  const functions = inject(FIREBASE_FUNCTIONS);

  // La portada pregunta si hay regalos para decidir si enseña la sección, y la
  // sección vuelve a preguntar para pintarlos: una sola llamada por boda. Un
  // fallo de red no se guarda, para poder reintentar.
  const pedidas = new Map<string, ReturnType<PuertaRegalosAbiertos['listar']>>();

  async function pedir(slug: string): ReturnType<PuertaRegalosAbiertos['listar']> {
    try {
      const { data } = await httpsCallable(functions, 'getOpenGifts')({ slug });
      const respuesta = (data ?? {}) as Record<string, unknown>;
      return {
        ok: true,
        aportacion: sanearAportacion(respuesta['aportacion']),
        regalos: sanearRegalosServidos(respuesta['regalos']),
      };
    } catch (error) {
      return { ok: false, fallo: traducirRegalos(error) };
    }
  }

  return {
    listar(slug: string) {
      const guardada = pedidas.get(slug);
      if (guardada) return guardada;
      const nueva = pedir(slug).then((resultado) => {
        if (!resultado.ok && (resultado.fallo.tipo === 'red' || resultado.fallo.tipo === 'error')) {
          pedidas.delete(slug);
        }
        return resultado;
      });
      pedidas.set(slug, nueva);
      return nueva;
    },
  };
}
