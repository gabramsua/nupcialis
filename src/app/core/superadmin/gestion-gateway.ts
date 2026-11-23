import { InjectionToken } from '@angular/core';

import type {
  ClaveRecordatorio,
  DatosDeFinanzas,
  FichaDeBoda,
  Pago,
  PagoEnEdicion,
  Recordatorio,
} from '../../features/superadmin/gestion/gestion';

/**
 * Puerto de la gestión por boda del superadmin: ficha, cobros y recordatorios.
 *
 * Del otro lado hay siete Cloud Functions (`functions/src/superadmin-boda.ts`).
 * De este, una interfaz que se dobla en un test sin red.
 */

export type FalloGestion =
  | { readonly tipo: 'sin-permiso' }
  | { readonly tipo: 'sin-verificar' }
  | { readonly tipo: 'red' }
  | { readonly tipo: 'no-existe' }
  | { readonly tipo: 'sin-correo' }
  /** El servidor rechazó un cobro; `motivo` dice qué campo. */
  | { readonly tipo: 'invalido'; readonly motivo: string }
  | { readonly tipo: 'error'; readonly mensaje: string };

export type Resultado<T> =
  { readonly ok: true; readonly datos: T } | { readonly ok: false; readonly fallo: FalloGestion };

export interface EnlaceDeRestablecimiento {
  readonly email: string;
  readonly enlace: string;
}

export interface CorreoDeAccesoEnviado extends EnlaceDeRestablecimiento {
  /** Si quedó en la cola de envío; el enlace sirve igual para copiarlo. */
  readonly enviado: boolean;
}

export interface PuertaGestion {
  ficha(weddingId: string): Promise<Resultado<FichaDeBoda>>;
  /** Genera el enlace; **no envía nada**. Quien lo pide se lo pasa a la pareja. */
  enlaceDeRestablecimiento(
    weddingId: string,
    uid: string,
  ): Promise<Resultado<EnlaceDeRestablecimiento>>;

  /** Manda el correo de acceso con la plantilla editable y devuelve el enlace. */
  enviarCorreoDeAcceso(weddingId: string, uid: string): Promise<Resultado<CorreoDeAccesoEnviado>>;

  finanzas(): Promise<Resultado<DatosDeFinanzas>>;
  /** Con `id` edita; con `null` crea. */
  guardarPago(id: string | null, pago: PagoEnEdicion): Promise<Resultado<Pago>>;
  borrarPago(id: string): Promise<Resultado<null>>;

  recordatorios(): Promise<Resultado<readonly Recordatorio[]>>;
  marcarRecordatorio(
    weddingId: string,
    key: ClaveRecordatorio,
    enviado: boolean,
  ): Promise<Resultado<null>>;
}

export const PUERTA_GESTION = new InjectionToken<PuertaGestion>('PUERTA_GESTION');
