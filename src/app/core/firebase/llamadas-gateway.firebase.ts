/**
 * El puerto de llamadas genéricas, con Cloud Functions.
 *
 * Los errores se traducen con la misma función que la gestión por boda
 * (`traducirGestion`): los códigos de Firebase son los mismos.
 */

import { inject } from '@angular/core';
import { httpsCallable } from 'firebase/functions';

import type { PuertaLlamadas } from '../llamadas/llamadas-gateway';
import { traducirGestion } from './gestion-gateway.firebase';
import { FIREBASE_FUNCTIONS } from './functions.providers';

export function crearPuertaLlamadasFirebase(): PuertaLlamadas {
  const functions = inject(FIREBASE_FUNCTIONS);

  return {
    async llamar(nombre, datos, leer) {
      try {
        const respuesta = await httpsCallable<unknown, unknown>(functions, nombre)(datos);
        const leido = leer(respuesta.data);
        return leido === null
          ? { ok: false, fallo: { tipo: 'error', mensaje: 'Respuesta ilegible.' } }
          : { ok: true, datos: leido };
      } catch (error) {
        return { ok: false, fallo: traducirGestion(error) };
      }
    },
  };
}
