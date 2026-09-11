/**
 * Inicialización del Admin SDK y ajustes comunes a todas las funciones.
 *
 * Se inicializa una sola vez por instancia: las Cloud Functions reutilizan el
 * proceso entre invocaciones, y un `initializeApp` repetido lanza.
 */

import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

/**
 * Región de despliegue.
 *
 * Los datos de las bodas son datos personales de cientos de invitados —nombres,
 * teléfonos, alergias—, así que ni las funciones ni Firestore salen de la UE.
 */
export const REGION = 'europe-west1';

/** Dominio bajo el que vive cada boda. Ver `dominioDeBoda`. */
export const DOMINIO_BASE = process.env['NUPCIALIS_DOMINIO'] ?? 'nupcialis.com';

/** Subdominio del panel de superadmin. */
export const DOMINIO_ADMIN = `admin.${DOMINIO_BASE}`;

export function app() {
  return getApps().length > 0 ? getApps()[0]! : initializeApp();
}

export function db(): Firestore {
  return getFirestore(app());
}

export function auth(): Auth {
  return getAuth(app());
}

/**
 * Identificador del proyecto de Firebase.
 *
 * Hace falta para llamar al Identity Toolkit por HTTP, que no pasa por el SDK.
 * En producción lo pone el runtime; en el emulador, la CLI.
 */
export function projectId(): string {
  const id =
    process.env['GCLOUD_PROJECT'] ?? process.env['GOOGLE_CLOUD_PROJECT'] ?? app().options.projectId;
  if (!id) throw new Error('No se ha podido determinar el proyecto de Firebase.');
  return id;
}
