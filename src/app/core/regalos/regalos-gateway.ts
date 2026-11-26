import { InjectionToken } from '@angular/core';

import type { AportacionPublica, RegaloPublico } from '../../features/public-site/regalos/regalos';

/**
 * Los regalos, del lado del invitado (§8.8).
 *
 * Todo pasa por invocables, y aquí el motivo no es solo la regla de oro 2: el
 * IBAN y el Bizum de la pareja **no viajan en la proyección pública**, que la
 * lee cualquiera que sepa el slug. Y la reserva es anónima para el resto de
 * invitados, cosa que una regla de lectura no sabe hacer.
 */

export type FalloRegalos =
  /** Le falta escribir sus cuatro dígitos (D-34). */
  | { readonly tipo: 'sin-verificar' }
  /** Alguien lo cogió mientras miraba. Llega con la lista al día. */
  | { readonly tipo: 'ya-reservado' }
  | { readonly tipo: 'no-es-tuyo' }
  /** El servidor dice que esta boda no tiene regalos que enseñar (plan básico, D-66). */
  | { readonly tipo: 'no-disponible' }
  | { readonly tipo: 'red' }
  | { readonly tipo: 'error' };

export type ResultadoRegalos =
  | {
      readonly ok: true;
      readonly aportacion: AportacionPublica;
      readonly regalos: readonly RegaloPublico[];
    }
  | { readonly ok: false; readonly fallo: FalloRegalos };

export interface PuertaRegalos {
  listar(): Promise<ResultadoRegalos>;
  /** Devuelven la lista entera: quien reserva ve de paso lo que han cogido. */
  reservar(giftId: string): Promise<ResultadoRegalos>;
  soltar(giftId: string): Promise<ResultadoRegalos>;
}

export const PUERTA_REGALOS = new InjectionToken<PuertaRegalos>('PUERTA_REGALOS');

export type { AportacionPublica, RegaloPublico };
