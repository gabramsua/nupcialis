/**
 * El contrato que cumplen todas las plantillas.
 *
 * Una plantilla es un componente que recibe esto y pinta una portada. Nada más:
 * no consulta Firestore, no conoce el tenant, no decide qué módulos hay. Así,
 * añadir la décima plantilla es escribir HTML y CSS, no entender el producto
 * entero.
 */

import type { NombresPareja } from '../../../core/tenant/tenant-source';
import { instanteDeBoda } from '../../../shared/zona-horaria';
import type { Seccion } from '../secciones/secciones';

export interface DatosPortada {
  readonly nombres: NombresPareja;
  /** Medianoche UTC del día. Ver el invariante en `shared/zona-horaria.ts`. */
  readonly weddingDate: Date | null;
  /** `'17:00'`, o `null` si la pareja todavía no la ha fijado. */
  readonly weddingTime: string | null;
  /** Zona de la boda, no la del invitado: `'Europe/Madrid'`. */
  readonly timezone: string;
  readonly locale: string;
  /** Foto de portada, ya resuelta a URL. `null` si no han subido ninguna. */
  readonly heroImageUrl: string | null;
  /** Las secciones de esta boda, ya saneadas y en orden. */
  readonly secciones: readonly Seccion[];
}

/**
 * Las secciones que la plantilla tiene que pintar debajo de la portada.
 *
 * La portada se queda fuera porque cada plantilla la dibuja a su manera y no es
 * una sección más: es *la* plantilla. Y las apagadas no llegan aquí, para que
 * ninguna plantilla tenga que acordarse de mirar `enabled`.
 */
export function seccionesVisibles(datos: DatosPortada): readonly Seccion[] {
  return datos.secciones.filter((seccion) => seccion.enabled && seccion.type !== 'portada');
}

/**
 * Cuenta atrás hasta la boda.
 *
 * `conHora` es lo que distingue una cuenta atrás de verdad de una aproximación.
 * Mientras la pareja no fije la hora de la ceremonia, lo único que se sabe es
 * el día, y anunciar «199 días, 23 horas y 59 minutos» promete una precisión
 * que no existe: esas horas son las que quedan hasta la medianoche, no hasta la
 * boda. Con `conHora` en `false`, la plantilla enseña solo los días.
 */
export interface CuentaAtras {
  readonly dias: number;
  readonly horas: number;
  readonly minutos: number;
  readonly conHora: boolean;
}

export function cuentaAtras(datos: DatosPortada, ahora: Date): CuentaAtras | null {
  const boda = instanteDeBoda(datos.weddingDate, datos.weddingTime, datos.timezone);
  if (!boda) return null;

  const restante = boda.getTime() - ahora.getTime();
  // Ya pasó. Una portada que anuncia «faltan -12 días» es peor que una portada
  // sin cuenta atrás.
  if (restante <= 0) return null;

  const minutosTotales = Math.floor(restante / 60_000);
  return {
    dias: Math.floor(minutosTotales / 1440),
    horas: Math.floor((minutosTotales % 1440) / 60),
    minutos: minutosTotales % 60,
    conHora: datos.weddingTime !== null,
  };
}
