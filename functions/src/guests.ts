/**
 * La lista de invitados: leer, crear, editar y borrar.
 *
 * **Todo pasa por aquí porque `guests` está cerrada a lectura directa** en las
 * reglas de Firestore (regla 2). No es ceremonia: dentro hay nombres, teléfonos
 * y alergias de cientos de personas que no han aceptado nada, y una colección
 * consultable desde el navegador es una colección descargable por cualquiera
 * que sepa abrir las herramientas de desarrollo.
 *
 * El `weddingId` sale del claim del token en todas ellas (regla 1). Ninguna lo
 * acepta como parámetro, ni siquiera para "comodidad": ese parámetro es
 * justamente el que convierte una sesión de una boda en un lector de las demás.
 */

import { FieldValue } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import {
  duplicadoDe,
  validarInvitado,
  type EntradaInvitado,
  type Existente,
} from './dominio/invitados';
import { EXIGIR_APP_CHECK, REGION, db } from './firebase';
import { auditar } from './infra/auditoria';
import { exigirPareja } from './infra/permisos';

/** Tope por boda. Una boda de más de mil invitados no es nuestro caso de uso. */
const MAX_INVITADOS = 1000;

/**
 * Lo que se devuelve al panel de la pareja.
 *
 * Se recorta a propósito: el panel no necesita `rsvpAnswers` en el listado, y
 * mandarlo multiplica por cinco lo que viaja para pintar una tabla.
 */
interface InvitadoEnLista {
  readonly id: string;
  readonly fullName: string;
  readonly nickname: string;
  readonly phone: string | null;
  readonly email: string | null;
  readonly side: string;
  readonly ageGroup: string;
  readonly groupIds: readonly string[];
  readonly rsvpStatus: string;
  readonly isCompanion: boolean;
  readonly invitedById: string | null;
  readonly maxCompanions: number;
  readonly loginCount: number;
  readonly notes: string;
}

function aLista(id: string, d: Record<string, unknown>): InvitadoEnLista {
  const texto = (v: unknown) => (typeof v === 'string' ? v : '');
  const entero = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

  return {
    id,
    fullName: texto(d['fullName']),
    nickname: texto(d['nickname']),
    phone: typeof d['phone'] === 'string' ? d['phone'] : null,
    email: typeof d['email'] === 'string' ? d['email'] : null,
    side: texto(d['side']) || 'both',
    ageGroup: texto(d['ageGroup']) || 'adult',
    groupIds: Array.isArray(d['groupIds'])
      ? d['groupIds'].filter((g): g is string => typeof g === 'string')
      : [],
    rsvpStatus: texto(d['rsvpStatus']) || 'pending',
    isCompanion: d['isCompanion'] === true,
    invitedById: typeof d['invitedById'] === 'string' ? d['invitedById'] : null,
    maxCompanions: entero(d['maxCompanions']),
    loginCount: entero(d['loginCount']),
    notes: texto(d['notes']),
  };
}

export const listGuests = onCall<unknown>(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK },
  async (peticion) => {
    const { weddingId } = exigirPareja(peticion);

    const snap = await db().collection(`weddings/${weddingId}/guests`).get();
    return { invitados: snap.docs.map((d) => aLista(d.id, d.data())) };
  },
);

export interface EntradaUpsert extends EntradaInvitado {
  /** Ausente para crear; presente para editar. */
  readonly id?: unknown;
  /** Crear aunque se parezca a uno que ya está. */
  readonly forzar?: unknown;
}

export const upsertGuest = onCall<EntradaUpsert>(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK },
  async (peticion) => {
    const { weddingId, uid } = exigirPareja(peticion);
    const datos = peticion.data ?? {};

    const validado = validarInvitado(datos);
    if (!validado.ok) {
      throw new HttpsError('invalid-argument', 'Revisa los datos del invitado.', {
        motivos: validado.motivos,
      });
    }

    const coleccion = db().collection(`weddings/${weddingId}/guests`);
    const id = typeof datos.id === 'string' && datos.id !== '' ? datos.id : null;

    // Se leen los existentes para detectar duplicados. Con cientos de invitados
    // es una lectura barata; con decenas de miles no lo sería, y por eso hay
    // tope. Ver MAX_INVITADOS.
    const existentesSnap = await coleccion.get();

    if (!id && existentesSnap.size >= MAX_INVITADOS) {
      throw new HttpsError('resource-exhausted', `El límite son ${MAX_INVITADOS} invitados.`);
    }

    const existentes: Existente[] = existentesSnap.docs
      // Uno no es duplicado de sí mismo al editarse.
      .filter((d) => d.id !== id)
      .map((d) => ({
        id: d.id,
        phone: typeof d.data()['phone'] === 'string' ? (d.data()['phone'] as string) : null,
        normalizedName:
          typeof d.data()['normalizedName'] === 'string'
            ? (d.data()['normalizedName'] as string)
            : '',
      }));

    const duplicado = duplicadoDe(validado.datos, existentes);
    if (duplicado && datos.forzar !== true) {
      // No se decide por la pareja: se le dice a quién se parece y ella elige.
      // Dos primos con el mismo nombre son un caso real, y negarse en redondo
      // haría imposible darlos de alta.
      throw new HttpsError('already-exists', 'Puede que este invitado ya esté.', {
        duplicadoDe: duplicado.id,
        motivo: duplicado.motivo,
      });
    }

    if (id) {
      const ref = coleccion.doc(id);
      const actual = await ref.get();
      if (!actual.exists) throw new HttpsError('not-found', 'Ese invitado no existe.');

      // Solo los campos que la pareja edita. `rsvpStatus`, `loginCount` y los
      // contadores del quiz los mueve el servidor (regla 6) y un `set` entero
      // se los llevaría por delante.
      await ref.update({ ...validado.datos, updatedAt: FieldValue.serverTimestamp() });
      return { id, creado: false };
    }

    const creado = await coleccion.add({
      ...validado.datos,
      isCompanion: false,
      invitedById: null,
      addedBy: 'owner',
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
      quizPlayCount: 0,
      quizBestPoints: null,
      isOwnerGuest: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Sin el nombre ni el teléfono: el log lo lee el superadmin, y no tiene por
    // qué llevarse los datos personales de cada invitado de cada boda.
    await auditar({
      actorUid: uid,
      actorRole: 'owner',
      action: 'createGuest',
      weddingId,
      payload: { guestId: creado.id },
    });

    return { id: creado.id, creado: true };
  },
);

export const deleteGuest = onCall<{ id?: unknown }>(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK },
  async (peticion) => {
    const { weddingId, uid } = exigirPareja(peticion);

    const id = peticion.data?.id;
    if (typeof id !== 'string' || id === '') {
      throw new HttpsError('invalid-argument', 'Falta el invitado.');
    }

    const coleccion = db().collection(`weddings/${weddingId}/guests`);
    const ref = coleccion.doc(id);
    if (!(await ref.get()).exists) throw new HttpsError('not-found', 'Ese invitado no existe.');

    // Un titular con acompañantes no se borra en silencio: los acompañantes se
    // quedarían huérfanos, invitados a una boda a la que ya no los trae nadie,
    // y apareciendo en el reparto de mesas. Se dice cuántos son y la pareja
    // decide.
    const acompanantes = await coleccion.where('invitedById', '==', id).get();
    if (!acompanantes.empty) {
      throw new HttpsError('failed-precondition', 'Ese invitado trae acompañantes.', {
        acompanantes: acompanantes.size,
      });
    }

    await ref.delete();

    await auditar({
      actorUid: uid,
      actorRole: 'owner',
      action: 'deleteGuest',
      weddingId,
      payload: { guestId: id },
    });

    return { id, borrado: true };
  },
);
