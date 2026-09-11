/**
 * Asignar y revocar el acceso de una persona a una boda.
 *
 * Los claims son **el** sistema de permisos del producto: las reglas de
 * Firestore no miran ninguna otra cosa. Por eso esta función es corta, solo la
 * puede llamar el superadmin, y todo lo que hace queda en el log de auditoría.
 */

import { FieldValue } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import { normalizarEmail } from './dominio/alta';
import { REGION, auth, db } from './firebase';
import { auditar } from './infra/auditoria';
import { exigirSuperadmin } from './infra/permisos';

export interface EntradaClaims {
  readonly email: string;
  readonly weddingId: string | null;
  readonly role: 'owner' | null;
}

export const setUserClaims = onCall<Partial<EntradaClaims>>(
  { region: REGION, enforceAppCheck: true },
  async (peticion) => {
    const superadmin = exigirSuperadmin(peticion);

    const email = normalizarEmail(peticion.data?.email);
    if (!email) throw new HttpsError('invalid-argument', 'Falta el email.');

    const weddingId = peticion.data?.weddingId ?? null;
    const role = peticion.data?.role ?? null;

    // O las dos cosas o ninguna. Un rol sin boda, o una boda sin rol, es un
    // token que la sesión del cliente descarta como anónimo (ver
    // `core/auth/session.ts`): daría un acceso que parece concedido y no lo
    // está, que es el peor de los fallos posibles en permisos.
    if ((weddingId === null) !== (role === null)) {
      throw new HttpsError('invalid-argument', 'weddingId y role van juntos o no van.');
    }
    if (role !== null && role !== 'owner') {
      throw new HttpsError('invalid-argument', 'Ese rol no existe.');
    }

    if (weddingId !== null) {
      const boda = await db().doc(`weddings/${weddingId}`).get();
      if (!boda.exists) throw new HttpsError('not-found', 'Esa boda no existe.');
    }

    const usuario = await auth()
      .getUserByEmail(email)
      .catch(() => {
        throw new HttpsError('not-found', 'No hay ninguna cuenta con ese email.');
      });

    // El claim de superadmin no se toca nunca desde aquí: se asigna fuera de
    // banda. Si esta función pudiera concederlo, quien se colase en una cuenta
    // de superadmin podría fabricar más. Y hay que conservarlo explícitamente,
    // porque `setCustomUserClaims` reemplaza el objeto entero.
    const claims: Record<string, unknown> = {};
    if (usuario.customClaims?.['superadmin'] === true) claims['superadmin'] = true;
    if (weddingId !== null && role !== null) {
      claims['weddingId'] = weddingId;
      claims['role'] = role;
    }

    await auth().setCustomUserClaims(usuario.uid, claims);

    if (weddingId !== null) {
      await db()
        .doc(`weddings/${weddingId}`)
        .update({ ownerUids: FieldValue.arrayUnion(usuario.uid) });
    }

    await auditar({
      actorUid: superadmin.uid,
      actorRole: 'superadmin',
      action: role === null ? 'revokeUserClaims' : 'setUserClaims',
      weddingId,
      payload: { email, uid: usuario.uid, role },
    });

    // Los claims viajan en el token, que dura una hora: el cambio no es
    // inmediato en una sesión ya abierta. El panel tiene que forzar refresco.
    return {
      uid: usuario.uid,
      claims,
      avisoPropagacion: 'El token tarda hasta 1 h en refrescarse.',
    };
  },
);
