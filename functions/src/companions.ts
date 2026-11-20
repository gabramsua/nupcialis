/**
 * `addCompanion` y `deleteCompanion`: el invitado trae a quien le dejan traer.
 *
 * Son dos funciones del invitado, no de la pareja, y de ahí lo que llevan:
 *
 * - **El cupo se cuenta aquí**, contando los documentos que ya existen. El
 *   cliente no manda cuántos lleva: dos pestañas abiertas mandarían el mismo
 *   alta dos veces y la pareja se encontraría comensales de más el día del
 *   banquete.
 * - **La boda y el titular salen del token** (regla 1). Con el `guestId` como
 *   parámetro, cualquiera podría apuntar acompañantes a nombre de otro.
 * - **El acompañante hereda los grupos del titular** (§5.5). Los grupos deciden
 *   quién ve qué fotos, así que esto no es comodidad.
 * - Un acompañante solo puede borrar... nada. Quien borra es **el titular**, y
 *   solo a los que él mismo añadió: borrar al primo de otro no es asunto suyo.
 *
 * `allowGuestAddedCompanions` es de la boda y lo pone la pareja. Mientras esté
 * apagado, estas funciones no dejan añadir nada.
 */

import { FieldValue } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import { esModoAcceso, type ModoAcceso } from './dominio/acceso';
import { plazoAbierto } from './dominio/formulario';
import {
  heredarDelTitular,
  puedeAnadir,
  validarAcompanante,
  type Titular,
} from './dominio/acompanantes';
import { normalizarNombre, normalizarTelefono, ultimos4 } from './dominio/invitados';
import { EXIGIR_APP_CHECK, REGION, db } from './firebase';
import { limiteDe } from './infra/boda';
import { exigirInvitado, exigirVerificado } from './infra/permisos';

export interface EntradaAcompanante {
  readonly fullName?: unknown;
  readonly phone?: unknown;
  readonly ageGroup?: unknown;
}

interface Contexto {
  readonly weddingId: string;
  readonly titular: Titular;
  readonly modulo: boolean;
  readonly modo: ModoAcceso;
  readonly limite: Date | null;
}

async function contexto(weddingId: string, guestId: string): Promise<Contexto> {
  const base = db();
  const [bodaSnap, invitadoSnap] = await Promise.all([
    base.doc(`weddings/${weddingId}`).get(),
    base.doc(`weddings/${weddingId}/guests/${guestId}`).get(),
  ]);

  const boda = bodaSnap.data();
  if (!bodaSnap.exists || boda?.['status'] !== 'active') {
    throw new HttpsError('not-found', 'Esta boda no está disponible.');
  }

  const invitado = invitadoSnap.data();
  if (!invitadoSnap.exists || !invitado) {
    throw new HttpsError('not-found', 'No estás en la lista de esta boda.');
  }

  const modo = boda['guestAccessMode'];
  const grupos = invitado['groupIds'];

  return {
    weddingId,
    titular: {
      id: guestId,
      isCompanion: invitado['isCompanion'] === true,
      maxCompanions:
        typeof invitado['maxCompanions'] === 'number' ? Math.floor(invitado['maxCompanions']) : 0,
      groupIds: Array.isArray(grupos)
        ? grupos.filter((g): g is string => typeof g === 'string')
        : [],
      active: invitado['active'] !== false,
    },
    modulo: boda['allowGuestAddedCompanions'] === true,
    modo: esModoAcceso(modo) ? modo : 'open',
    limite: limiteDe(boda),
  };
}

/** Los que ya ha añadido, contados en el servidor y no en el navegador. */
async function cuantosLleva(weddingId: string, guestId: string): Promise<number> {
  const snap = await db()
    .collection(`weddings/${weddingId}/guests`)
    .where('invitedById', '==', guestId)
    .count()
    .get();

  return snap.data().count;
}

export const addCompanion = onCall<EntradaAcompanante>(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK },
  async (peticion) => {
    const quien = exigirInvitado(peticion);
    const { weddingId, guestId } = quien;
    const ctx = await contexto(weddingId, guestId);

    // Apuntar a alguien es dar datos de un tercero: hace falta haberse
    // identificado, no solo tener el enlace (D-34).
    exigirVerificado(quien, ctx.modo);

    // El plazo cierra también esto. La fecha límite existe para que la pareja
    // pueda cerrar la cuenta de comensales: dejar añadir a alguien después
    // sería dar un número al catering y luego cambiarlo.
    if (!plazoAbierto(ctx.limite, new Date())) {
      throw new HttpsError('failed-precondition', 'El plazo para confirmar ya ha terminado.', {
        motivo: 'plazo-cerrado',
      });
    }

    const permiso = puedeAnadir(ctx.modulo, ctx.titular, await cuantosLleva(weddingId, guestId));
    if (!permiso.puede) {
      // Con detalle: «no puedes» sin decir por qué, delante de un formulario que
      // se acaba de rellenar, acaba en un WhatsApp a los novios.
      throw new HttpsError('failed-precondition', 'No puedes añadir acompañantes.', {
        motivo: permiso.motivo,
      });
    }

    const validacion = validarAcompanante(peticion.data ?? {}, ctx.modo, normalizarTelefono);
    if (!validacion.ok) {
      throw new HttpsError('invalid-argument', 'Faltan datos del acompañante.', {
        motivos: validacion.motivos,
      });
    }

    const { fullName, phone, ageGroup } = validacion.datos;
    const ref = db().collection(`weddings/${weddingId}/guests`).doc();

    await ref.set({
      fullName,
      normalizedName: normalizarNombre(fullName),
      nickname: '',
      phone,
      phoneLast4: ultimos4(phone),
      // El lado y los grupos son del titular: ni el lado ni la audiencia de las
      // fotos los elige un invitado.
      side: 'both',
      ageGroup,
      ...heredarDelTitular(ctx.titular),
      isCompanion: true,
      invitedById: guestId,
      addedBy: 'guest',
      // Un acompañante no trae acompañantes: ver `puedeAnadir`.
      maxCompanions: 0,
      rsvpStatus: 'pending',
      rsvpAt: null,
      rsvpAnswers: {},
      menu: '',
      allergies: '',
      tableId: null,
      active: true,
      loginCount: 0,
      firstLoginAt: null,
      lastLoginAt: null,
      isOwnerGuest: false,
      notes: '',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { ok: true as const, id: ref.id, quedan: permiso.quedan - 1 };
  },
);

export interface EntradaBorrado {
  readonly id?: unknown;
}

export const deleteCompanion = onCall<EntradaBorrado>(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK },
  async (peticion) => {
    const quien = exigirInvitado(peticion);
    const { weddingId, guestId } = quien;
    exigirVerificado(quien, (await contexto(weddingId, guestId)).modo);

    const id = typeof peticion.data?.id === 'string' ? peticion.data.id : '';
    if (id === '') throw new HttpsError('invalid-argument', 'Falta el acompañante.');

    const ref = db().doc(`weddings/${weddingId}/guests/${id}`);
    const snap = await ref.get();
    const acompanante = snap.data();

    // Solo a los suyos. Y el mismo «no existe» para «no es tuyo»: saber que
    // existe un invitado con ese id ya es más de lo que le toca.
    if (!snap.exists || !acompanante || acompanante['invitedById'] !== guestId) {
      throw new HttpsError('not-found', 'Ese acompañante no es tuyo.');
    }

    // Si ya ha entrado en la web tiene sesión propia, su confirmación y puede
    // tener fotos subidas. Borrarlo entonces es cosa de la pareja, que ve el
    // conjunto; el titular ya no puede deshacer su alta.
    if (typeof acompanante['loginCount'] === 'number' && acompanante['loginCount'] > 0) {
      throw new HttpsError('failed-precondition', 'Ese acompañante ya ha entrado en la web.', {
        motivo: 'ya-entro',
      });
    }

    await ref.delete();

    return { ok: true as const };
  },
);
