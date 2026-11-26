import { InjectionToken } from '@angular/core';

import type { ResultadoRegalos } from './regalos-gateway';

/**
 * Los regalos de una boda del plan básico, **sin sesión de invitado** (D-66).
 *
 * El plan básico no tiene lista de invitados, así que no hay nadie contra
 * quien identificar. Se pide por slug a `getOpenGifts`, que solo contesta para
 * bodas básicas publicadas con el módulo encendido. No hay reservas.
 */
export interface PuertaRegalosAbiertos {
  listar(slug: string): Promise<ResultadoRegalos>;
}

export const PUERTA_REGALOS_ABIERTOS = new InjectionToken<PuertaRegalosAbiertos>(
  'PUERTA_REGALOS_ABIERTOS',
);
