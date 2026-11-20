import { InjectionToken } from '@angular/core';

/**
 * Puerto del registro de accesos (`guestAccessLog`), del lado de la pareja.
 *
 * Se pide aparte y solo desde su pantalla: es una lista que crece con cada
 * entrada de cada invitado y no tiene por qué viajar al pintar el panel.
 *
 * Lo que llega ya viene masticado del servidor: ni la IP ni el `user-agent`
 * entero salen de ahí. Ver `functions/src/access-log.ts`.
 */

export interface EntradaDeAcceso {
  readonly id: string;
  readonly guestId: string;
  /** Vacío si el invitado se borró después de entrar. */
  readonly nombre: string;
  readonly mote: string;
  /** `enlace`, `name_phone4`, `phone`… */
  readonly modo: string;
  /** «Android · Chrome», o vacío si no se pudo reconocer. */
  readonly dispositivo: string;
  /** Cuándo, en ISO. */
  readonly cuando: string;
}

export interface RegistroDeAccesos {
  readonly entradas: readonly EntradaDeAcceso[];
  /** Cuántas entradas como mucho devuelve el servidor. */
  readonly tope: number;
}

export type FalloAccesos =
  | { readonly tipo: 'sin-permiso' }
  | { readonly tipo: 'sin-verificar' }
  | { readonly tipo: 'red' }
  | { readonly tipo: 'error'; readonly mensaje: string };

export type ResultadoAccesos =
  | { readonly ok: true; readonly datos: RegistroDeAccesos }
  | { readonly ok: false; readonly fallo: FalloAccesos };

export interface PuertaAccesos {
  leer(): Promise<ResultadoAccesos>;
}

export const PUERTA_ACCESOS = new InjectionToken<PuertaAccesos>('PUERTA_ACCESOS');
