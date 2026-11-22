import { InjectionToken } from '@angular/core';

/**
 * Puerto del alta de bodas.
 *
 * Del otro lado hay una Cloud Function invocable. De este lado, una interfaz de
 * cuatro métodos que se puede doblar en un test sin red, que es lo
 * que permite probar la pantalla del superadmin —la parte que de verdad se
 * equivoca— sin levantar medio Firebase.
 */

export type PlanContratado = 'basic' | 'extended';

export type TipoDeCeremonia = 'civil' | 'religious';

/** Un sitio del alta. Sin pin, `lat` y `lng` van a `null`. */
export interface LugarParaAlta {
  readonly name: string;
  readonly address: string;
  readonly lat: number | null;
  readonly lng: number | null;
}

export interface DatosDeAlta {
  readonly slug: string;
  readonly partnerA: string;
  readonly partnerB: string;
  /** ISO 8601. La función valida que no esté en el pasado. */
  readonly weddingDate: string;
  readonly emails: readonly string[];
  readonly plan: PlanContratado;
  readonly ceremonyType: TipoDeCeremonia;
  /** `null`: aún no se sabe; la pareja lo pone después desde el mapa. */
  readonly ceremonyPlace: LugarParaAlta | null;
  readonly receptionPlace: LugarParaAlta | null;
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
  /**
   * La llamada llegó sin credencial válida.
   *
   * En la práctica es casi siempre App Check: la función lo exige fuera del
   * App Check y el navegador no mandó token. Confundirlo con «no tienes permiso»
   * manda a buscar el fallo al sitio equivocado — a los claims, que están
   * bien— y cuesta media tarde.
   */
  | { readonly tipo: 'sin-verificar' }
  | { readonly tipo: 'error'; readonly mensaje: string };

export type ResultadoAlta =
  | { readonly ok: true; readonly alta: AltaCreada }
  | { readonly ok: false; readonly fallo: FalloAlta };

/** Estados de una boda. El servidor es quien los mueve (regla 6). */
export type EstadoBoda = 'draft' | 'active' | 'archived';

/**
 * Por qué no se pudo publicar.
 *
 * `motivos` viene de `motivosParaNoPublicar` en la función y son claves, no
 * frases: la traducción vive en los ficheros de i18n, como todo lo visible.
 */
export type ResultadoEstado =
  | { readonly ok: true; readonly status: EstadoBoda; readonly cambiado: boolean }
  | { readonly ok: false; readonly motivos: readonly string[]; readonly mensaje: string };

/** Lo que hizo «poner al día las bodas»: cuántas se tocaron y qué se añadió. */
export type ResultadoCompletar =
  | {
      readonly ok: true;
      readonly revisadas: number;
      readonly actualizadas: number;
      readonly modulosAnadidos: number;
      readonly seccionesAnadidas: number;
    }
  | { readonly ok: false; readonly mensaje: string };

export interface PuertaAlta {
  crearBoda(datos: DatosDeAlta): Promise<ResultadoAlta>;
  /** Reintento del alta del subdominio en Firebase Auth. Ver regla 8. */
  autorizarDominio(weddingId: string): Promise<{ readonly ok: boolean; readonly mensaje: string }>;
  /**
   * Publicar, despublicar o archivar.
   *
   * `status` es campo de sistema: no lo escribe ni el superadmin desde el
   * cliente, lo mueve `setWeddingStatus`. Por eso está aquí y no en un
   * `updateDoc`.
   */
  cambiarEstado(weddingId: string, status: EstadoBoda): Promise<ResultadoEstado>;
  /**
   * Añade a las bodas ya creadas los módulos y secciones que el producto ganó
   * después, sin tocar lo que la pareja ya decidió. Idempotente.
   */
  completarBodas(): Promise<ResultadoCompletar>;
}

export const PUERTA_ALTA = new InjectionToken<PuertaAlta>('PUERTA_ALTA');
