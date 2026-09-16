import { InjectionToken } from '@angular/core';

/**
 * Puerto del alta de bodas.
 *
 * Del otro lado hay una Cloud Function invocable. De este lado, una interfaz de
 * cuatro métodos que se puede doblar en un test sin emulador ni red, que es lo
 * que permite probar la pantalla del superadmin —la parte que de verdad se
 * equivoca— sin levantar medio Firebase.
 */

export type PlanContratado = 'basic' | 'extended';

export interface DatosDeAlta {
  readonly slug: string;
  readonly partnerA: string;
  readonly partnerB: string;
  /** ISO 8601. La función valida que no esté en el pasado. */
  readonly weddingDate: string;
  readonly emails: readonly string[];
  readonly plan: PlanContratado;
}

export interface CuentaDeAlta {
  readonly email: string;
  readonly uid: string;
  readonly nueva: boolean;
  /**
   * Enlace para establecer la contraseña.
   *
   * **Da acceso al panel de esa boda.** Se enseña en pantalla para que el
   * superadmin lo reparta a mano mientras no haya proveedor de correo (D-05),
   * y por eso no se registra en ningún log ni se manda a ningún sitio.
   */
  readonly enlaceAcceso: string | null;
}

export interface AltaCreada {
  readonly weddingId: string;
  readonly slug: string;
  readonly siteUrl: string;
  readonly cuentas: readonly CuentaDeAlta[];
  /** Lo que hay que mirar antes de dar el alta por buena. Vacío es lo normal. */
  readonly avisos: readonly string[];
}

/** Por qué no se pudo dar de alta. Cada caso tiene su mensaje en pantalla. */
export type FalloAlta =
  | { readonly tipo: 'slug-ocupado'; readonly alternativas: readonly string[] }
  | { readonly tipo: 'datos-invalidos'; readonly campos: readonly string[] }
  | { readonly tipo: 'sin-permiso' }
  | { readonly tipo: 'error'; readonly mensaje: string };

export type ResultadoAlta =
  | { readonly ok: true; readonly alta: AltaCreada }
  | { readonly ok: false; readonly fallo: FalloAlta };

export interface PuertaAlta {
  crearBoda(datos: DatosDeAlta): Promise<ResultadoAlta>;
  /** Reintento del alta del subdominio en Firebase Auth. Ver regla 8. */
  autorizarDominio(weddingId: string): Promise<{ readonly ok: boolean; readonly mensaje: string }>;
}

export const PUERTA_ALTA = new InjectionToken<PuertaAlta>('PUERTA_ALTA');
