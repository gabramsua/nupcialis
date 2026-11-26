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

import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import { validarVinculo } from './dominio/acompanantes';
import { conGrupoPorDefecto, idGrupoPorDefecto, validarAsignacion } from './dominio/grupos';
import { MAX_INVITADOS } from './dominio/importacion';
import {
  duplicadoDe,
  validarInvitado,
  type EntradaInvitado,
  type Existente,
} from './dominio/invitados';
import { EXIGIR_APP_CHECK, REGION, db } from './firebase';
import { auditar } from './infra/auditoria';
import { leerGrupos } from './groups';
import { exigirPareja } from './infra/permisos';

/**
 * Lo que se devuelve al panel de la pareja.
 *
 * Se recorta a propósito: el panel no necesita `rsvpAnswers` en el listado, y
 * mandarlo multiplica por cinco lo que viaja para pintar una tabla.
 *
 * `menu`, `allergies` y `tableId` sí entran: son tres cadenas cortas y son
 * justo lo que la pareja exporta para el catering (§8.3). Pedirlas en otra
 * llamada obligaría a leer la colección entera por segunda vez.
 */
interface InvitadoEnLista {
  readonly id: string;
  readonly fullName: string;
  readonly nickname: string;
  readonly phone: string | null;
  readonly side: string;
  readonly ageGroup: string;
  readonly groupIds: readonly string[];
  readonly rsvpStatus: string;
  readonly isCompanion: boolean;
  readonly invitedById: string | null;
  readonly loginCount: number;
  readonly notes: string;
  readonly menu: string;
  readonly allergies: string;
  readonly tableId: string | null;
  /**
   * Si lo apuntó un invitado desde la web, no la pareja desde el panel.
   *
   * Hace falta en la lista para poder avisar: hasta ahora la pareja solo se
   * enteraba de un acompañante nuevo mirando la lista con atención (F1.5c).
   */
  readonly apuntadoPorInvitado: boolean;
  /** Cuándo se dio de alta, en ISO, o `null` si el documento es anterior. */
  readonly altaEn: string | null;
}

function aLista(id: string, d: Record<string, unknown>): InvitadoEnLista {
  const texto = (v: unknown) => (typeof v === 'string' ? v : '');
  const entero = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

  return {
    id,
    fullName: texto(d['fullName']),
    nickname: texto(d['nickname']),
    phone: typeof d['phone'] === 'string' ? d['phone'] : null,
    side: texto(d['side']) || 'both',
    ageGroup: texto(d['ageGroup']) || 'adult',
    groupIds: Array.isArray(d['groupIds'])
      ? d['groupIds'].filter((g): g is string => typeof g === 'string')
      : [],
    rsvpStatus: texto(d['rsvpStatus']) || 'pending',
    isCompanion: d['isCompanion'] === true,
    invitedById: typeof d['invitedById'] === 'string' ? d['invitedById'] : null,
    loginCount: entero(d['loginCount']),
    notes: texto(d['notes']),
    menu: texto(d['menu']),
    allergies: texto(d['allergies']),
    tableId: typeof d['tableId'] === 'string' ? d['tableId'] : null,
    apuntadoPorInvitado: d['addedBy'] === 'guest',
    altaEn: d['createdAt'] instanceof Timestamp ? d['createdAt'].toDate().toISOString() : null,
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
  /**
   * Con quién viene. Ausente: no se toca. Un id: viene con ese titular. `null`:
   * viene por su cuenta (deja de ser acompañante).
   */
  readonly invitedById?: unknown;
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

    // Los grupos se comprueban contra los de la boda: que existan, y que no
    // quede en dos restringidos (§8.5). Con el mismo error y el mismo formato
    // que el resto de campos, para que la pantalla lo cuente igual.
    const grupos = await leerGrupos(db(), weddingId);
    const motivosGrupo = validarAsignacion(validado.datos.groupIds, grupos);
    if (motivosGrupo.length > 0) {
      throw new HttpsError('invalid-argument', 'Revisa los grupos del invitado.', {
        motivos: motivosGrupo,
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

    // Con quién viene (F1.5d). Ausente: no se toca nada de la relación.
    const quiereVinculo = datos.invitedById !== undefined;
    const titularId =
      typeof datos.invitedById === 'string' && datos.invitedById !== '' ? datos.invitedById : null;

    let heredados: readonly string[] | null = null;
    let estadoDelTitular: 'pending' | 'confirmed' | 'declined' = 'pending';
    if (titularId !== null) {
      const [titularSnap, suyos] = await Promise.all([
        coleccion.doc(titularId).get(),
        id ? coleccion.where('invitedById', '==', id).limit(1).get() : Promise.resolve(null),
      ]);
      const t = titularSnap.data();
      const vinculo = validarVinculo(
        id,
        titularSnap.exists && t
          ? {
              id: titularId,
              isCompanion: t['isCompanion'] === true,
              groupIds: Array.isArray(t['groupIds'])
                ? t['groupIds'].filter((g): g is string => typeof g === 'string')
                : [],
              active: t['active'] !== false,
            }
          : null,
        suyos?.size ?? 0,
      );
      if (!vinculo.ok) {
        throw new HttpsError('failed-precondition', 'No se puede enlazar con ese titular.', {
          vinculo: vinculo.motivo,
        });
      }
      heredados = vinculo.groupIds;
      estadoDelTitular =
        t?.['rsvpStatus'] === 'confirmed' || t?.['rsvpStatus'] === 'declined'
          ? t['rsvpStatus']
          : 'pending';
    }

    // Lo que cambia en el documento por la relación. Un acompañante hereda los
    // grupos del titular.
    const relacion: Record<string, unknown> = !quiereVinculo
      ? {}
      : titularId === null
        ? { isCompanion: false, invitedById: null }
        : {
            isCompanion: true,
            invitedById: titularId,
            groupIds: heredados ?? [],
            // Viene como viene quien lo trae, salvo que se cambie a mano (D-51).
            rsvpStatus: estadoDelTitular,
            rsvpFollowsTitular: true,
            rsvpAt: estadoDelTitular === 'pending' ? null : FieldValue.serverTimestamp(),
          };

    if (id) {
      const ref = coleccion.doc(id);
      const actual = await ref.get();
      if (!actual.exists) throw new HttpsError('not-found', 'Ese invitado no existe.');

      // Solo los campos que la pareja edita. `rsvpStatus`, `loginCount` y los
      // contadores del quiz los mueve el servidor (regla 6) y un `set` entero
      // se los llevaría por delante.
      await ref.update({
        ...validado.datos,
        // También al editar: quitar a alguien del grupo de todos no es una
        // opción (D-47). Antes mandaba lo marcado, «también si lo quitó».
        groupIds: conGrupoPorDefecto(validado.datos.groupIds, idGrupoPorDefecto(grupos)),
        ...relacion,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { id, creado: false };
    }

    const creado = await coleccion.add({
      ...validado.datos,
      // Todo invitado entra en el grupo de todos (D-31), y no sale de él (D-47).
      groupIds: conGrupoPorDefecto(validado.datos.groupIds, idGrupoPorDefecto(grupos)),
      isCompanion: false,
      invitedById: null,
      addedBy: 'owner',
      // Si se crea ya como acompañante de alguien, manda la relación: los
      // grupos son los del titular.
      rsvpStatus: 'pending',
      rsvpAt: null,
      ...relacion,
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
