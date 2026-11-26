/**
 * Lo que se lee del documento de la boda y usan varias funciones.
 *
 * Vive aquí y no en `dominio/` porque necesita `Timestamp` del Admin SDK, y
 * `dominio/` es código sin dependencias. Y no en una de las funciones, porque
 * importar un fichero de función desde otro arrastra sus `onCall` y los
 * despliega juntos sin que nadie lo haya pedido.
 */

import { Timestamp } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { db } from '../firebase';
import { esModoAcceso, type ModoAcceso } from '../dominio/acceso';
import { plazoPorDefecto } from '../dominio/formulario';

/**
 * La fecha límite del RSVP, enterrada en la configuración del módulo.
 *
 * Son cuatro saltos (`modules.rsvp.config.deadline`) sobre un documento que
 * puede no tener ninguno; si no lo tiene, una semana antes de la boda. Equivocarse aquí no da un error: da un formulario que
 * se cierra solo, o que no se cierra nunca.
 */
export function limiteDe(boda: Record<string, unknown> | undefined): Date | null {
  const nivel = (dato: unknown, clave: string): unknown =>
    dato !== null && typeof dato === 'object'
      ? (dato as Record<string, unknown>)[clave]
      : undefined;

  const limite = nivel(nivel(nivel(nivel(boda, 'modules'), 'rsvp'), 'config'), 'deadline');
  if (limite instanceof Timestamp) return limite.toDate();

  // Sin plazo puesto por la pareja, una semana antes de la boda (D-66). Sin
  // fecha de boda tampoco hay plazo: no hay desde dónde contar.
  const fechaBoda = nivel(boda, 'weddingDate');
  return fechaBoda instanceof Timestamp ? plazoPorDefecto(fechaBoda.toDate()) : null;
}

/**
 * El modo de acceso de una boda, para `exigirVerificado`.
 *
 * Vive aquí y no en cada función porque ya lo necesitan el quiz, la galería y
 * los acompañantes, y una copia por función es una copia que algún día dirá
 * otra cosa. Ante un valor corrupto, `open`: es el que no deja a nadie fuera,
 * y la decisión de qué puede hacer cada nivel la toma `puedeHacer`.
 */
export async function modoDeAcceso(weddingId: string): Promise<ModoAcceso> {
  const snap = await db().doc(`weddings/${weddingId}`).get();
  const modo = snap.data()?.['guestAccessMode'];
  return esModoAcceso(modo) ? modo : 'open';
}

/**
 * Si un módulo está **activo** en esta boda, es decir, si su plan lo incluye.
 *
 * Es lo que impide que una boda del plan básico use la galería o el quiz
 * entrando por la URL o llamando a la función a mano: ocultar el módulo en el
 * panel no basta, porque lo que manda es lo que el servidor deja hacer.
 */
export function moduloActivo(boda: Record<string, unknown> | undefined, modulo: string): boolean {
  const modulos = boda?.['modules'];
  if (modulos === null || typeof modulos !== 'object') return false;
  const config = (modulos as Record<string, unknown>)[modulo];
  return (
    config !== null &&
    typeof config === 'object' &&
    (config as Record<string, unknown>)['enabled'] === true
  );
}

/** Corta la petición de un invitado si el módulo no está en el plan de la boda. */
export async function exigirModulo(weddingId: string, modulo: string): Promise<void> {
  const snap = await db().doc(`weddings/${weddingId}`).get();
  if (!moduloActivo(snap.data(), modulo)) {
    throw new HttpsError('failed-precondition', 'Esta boda no tiene ese módulo.', {
      motivo: 'modulo-desactivado',
    });
  }
}
