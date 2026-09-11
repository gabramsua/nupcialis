/**
 * Log de auditoría.
 *
 * Recoge lo que hace el superadmin sobre una boda y las entradas de la pareja
 * al panel. Es una colección raíz, solo legible por superadmin (ver
 * `firestore.rules`), y solo escribible desde el Admin SDK.
 *
 * Existe porque el superadmin puede ver los datos de cualquier boda: nombres,
 * teléfonos y alergias de cientos de personas. Un acceso así sin registro no es
 * defendible ante la pareja ni ante el RGPD.
 */

import { FieldValue } from 'firebase-admin/firestore';

import { db } from '../firebase';

export interface EntradaAuditoria {
  readonly actorUid: string;
  readonly actorRole: 'superadmin' | 'owner' | 'system';
  readonly action: string;
  readonly weddingId: string | null;
  readonly payload?: Record<string, unknown>;
}

/**
 * Registra una acción. **Nunca lanza.**
 *
 * Un fallo al escribir el log no puede tumbar el alta de una boda que ya se ha
 * creado: dejaría a la pareja sin web por un problema de trazabilidad. Se
 * registra en los logs de la función y se sigue.
 */
export async function auditar(entrada: EntradaAuditoria): Promise<void> {
  try {
    await db()
      .collection('auditLog')
      .add({ ...entrada, payload: entrada.payload ?? {}, createdAt: FieldValue.serverTimestamp() });
  } catch (error) {
    console.error('No se pudo escribir en el log de auditoría', entrada.action, error);
  }
}
