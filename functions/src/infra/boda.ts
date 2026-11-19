/**
 * Lo que se lee del documento de la boda y usan varias funciones.
 *
 * Vive aquí y no en `dominio/` porque necesita `Timestamp` del Admin SDK, y
 * `dominio/` es código sin dependencias. Y no en una de las funciones, porque
 * importar un fichero de función desde otro arrastra sus `onCall` y los
 * despliega juntos sin que nadie lo haya pedido.
 */

import { Timestamp } from 'firebase-admin/firestore';

/**
 * La fecha límite del RSVP, enterrada en la configuración del módulo.
 *
 * Son cuatro saltos (`modules.rsvp.config.deadline`) sobre un documento que
 * puede no tener ninguno. Equivocarse aquí no da un error: da un formulario que
 * se cierra solo, o que no se cierra nunca.
 */
export function limiteDe(boda: Record<string, unknown> | undefined): Date | null {
  const nivel = (dato: unknown, clave: string): unknown =>
    dato !== null && typeof dato === 'object'
      ? (dato as Record<string, unknown>)[clave]
      : undefined;

  const limite = nivel(nivel(nivel(nivel(boda, 'modules'), 'rsvp'), 'config'), 'deadline');
  return limite instanceof Timestamp ? limite.toDate() : null;
}
