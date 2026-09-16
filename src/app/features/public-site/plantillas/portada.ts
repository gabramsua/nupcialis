/**
 * El contrato que cumplen todas las plantillas.
 *
 * Una plantilla es un componente que recibe esto y pinta una portada. Nada más:
 * no consulta Firestore, no conoce el tenant, no decide qué módulos hay. Así,
 * añadir la décima plantilla es escribir HTML y CSS, no entender el producto
 * entero.
 */

import type { NombresPareja } from '../../../core/tenant/tenant-source';

export interface DatosPortada {
  readonly nombres: NombresPareja;
  readonly weddingDate: Date | null;
  readonly locale: string;
}

/**
 * Cuenta atrás hasta la boda.
 *
 * Devuelve `null` cuando ya pasó: una portada que anuncia «faltan -12 días» es
 * peor que una portada sin cuenta atrás.
 */
export interface CuentaAtras {
  readonly dias: number;
  readonly horas: number;
  readonly minutos: number;
}

export function cuentaAtras(fecha: Date | null, ahora: Date): CuentaAtras | null {
  if (!fecha) return null;

  const restante = fecha.getTime() - ahora.getTime();
  if (restante <= 0) return null;

  const minutosTotales = Math.floor(restante / 60_000);
  return {
    dias: Math.floor(minutosTotales / 1440),
    horas: Math.floor((minutosTotales % 1440) / 60),
    minutos: minutosTotales % 60,
  };
}
