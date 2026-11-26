/**
 * El enlace con el que una cuenta de la pareja elige contraseña, y los datos
 * que el correo de acceso necesita.
 *
 * Lo comparten `generateCoupleResetLink` (copiar el enlace), el alta (que
 * manda el correo de bienvenida) y `sendCoupleAccessEmail` (reenviarlo).
 */

import { Timestamp } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';

import type { Datos } from '../dominio/correos';
import { dominioDeBoda } from '../dominio/dominios';
import { DOMINIO_BASE, auth, db } from '../firebase';

export interface AccesoDePareja {
  readonly email: string;
  readonly enlace: string;
  readonly datos: Datos;
}

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor : '';
}

/** «Ana y Leo», o lo que haya si falta uno. */
export function nombresDeLosNovios(boda: Record<string, unknown>): string {
  const c = (boda['couple'] ?? {}) as Record<string, unknown>;
  return [texto(c['partnerA']), texto(c['partnerB'])].filter((n) => n !== '').join(' y ');
}

/** « el 12 de junio de 2027», con el espacio delante, o vacío si no hay fecha. */
export function fechaParaCorreo(valor: unknown): string {
  const fecha = valor instanceof Timestamp ? valor.toDate() : valor instanceof Date ? valor : null;
  if (!fecha) return '';
  const dia = new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(fecha);
  return ` el ${dia}`;
}

export function datosDeBoda(boda: Record<string, unknown>): Datos {
  return {
    novios: nombresDeLosNovios(boda),
    fecha: fechaParaCorreo(boda['weddingDate']),
    web: `https://${dominioDeBoda(texto(boda['slug']), DOMINIO_BASE)}`,
  };
}

/**
 * Genera el enlace de «elegir contraseña» de una cuenta **que sea de esa
 * boda**. Sin esa comprobación sería «el enlace de restablecimiento de cualquier
 * cuenta de Nupcialis», incluida la del propio superadmin.
 */
export async function generarAccesoDePareja(
  weddingId: string,
  uid: string,
): Promise<AccesoDePareja> {
  const boda = await db().doc(`weddings/${weddingId}`).get();
  if (!boda.exists) throw new HttpsError('not-found', 'Esa boda no existe.');
  const datos = boda.data() ?? {};

  const propietarios = Array.isArray(datos['ownerUids']) ? (datos['ownerUids'] as unknown[]) : [];
  if (!propietarios.includes(uid)) {
    throw new HttpsError('permission-denied', 'Esa cuenta no es de esta boda.');
  }

  const cuenta = await auth()
    .getUser(uid)
    .catch(() => null);
  if (!cuenta?.email) {
    throw new HttpsError('failed-precondition', 'Esa cuenta no tiene correo.', {
      motivo: 'sin-correo',
    });
  }

  const base = datosDeBoda(datos);
  const url = `${base.web}/panel/acceso`;

  let enlace: string;
  try {
    enlace = await auth().generatePasswordResetLink(cuenta.email, { url });
  } catch (error) {
    console.error('No se pudo generar el enlace de restablecimiento', uid, error);
    throw new HttpsError('internal', 'No se pudo generar el enlace.');
  }

  return {
    email: cuenta.email,
    enlace,
    datos: { ...base, enlace, correo: cuenta.email },
  };
}
