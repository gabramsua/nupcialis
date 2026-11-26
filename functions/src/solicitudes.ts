/**
 * Las solicitudes de la HOME: el formulario por el que una pareja pide su web.
 *
 * - `createHomeRequest`: **pública** (la HOME no tiene sesión). App Check
 *   la protege de lo que no es nuestra web, y un límite por IP (5 a la hora) de
 *   un bucle torpe. Guarda la solicitud en `homeRequests` y, si hay un
 *   correo de aviso configurado, deja un aviso en la cola `mail`. El aviso es
 *   un extra: si falla, la solicitud ya está guardada y se ve en la bandeja.
 * - `listHomeRequests`, `updateHomeRequest`, `saveHomeRequestSettings`: la
 *   bandeja del superadmin y el correo al que avisar. Ese correo vive en
 *   `platform/homeRequests`, que **no** se puede leer desde el cliente (solo
 *   `platform/home` es público).
 *
 * Es el único dato personal de gente que no es cliente. Se guarda lo mínimo y
 * se borra a petición (de momento a mano; ver PENDIENTES D-68).
 */

import { FieldValue } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import {
  correoDeAviso,
  esEstadoDeSolicitud,
  lineasDeAviso,
  MAX_NOTA,
  registrarSolicitud,
  validarSolicitud,
  type ContadorDeSolicitudes,
} from './dominio/solicitudes';
import { esCorreoValido } from './dominio/correos';
import { EXIGIR_APP_CHECK, REGION, db } from './firebase';
import { auditar } from './infra/auditoria';
import { encolarAviso } from './infra/correo';
import { claveIntentos, ipDe } from './infra/ip';
import { exigirSuperadmin } from './infra/permisos';

const MAX_SOLICITUDES_LISTADAS = 300;

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor : '';
}

export const createHomeRequest = onCall<{ solicitud?: unknown }>(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK },
  async (peticion) => {
    const valida = validarSolicitud(peticion.data?.solicitud);
    if (!valida.ok) {
      throw new HttpsError('invalid-argument', 'La solicitud no es válida.', {
        motivo: valida.motivo,
      });
    }

    // El freno por IP, en transacción para que dos peticiones a la vez no se
    // cuelen las dos con el mismo contador.
    const refLimite = db().doc(`homeRequestLimits/${claveIntentos(ipDe(peticion))}`);
    const ahora = Date.now();
    const pasa = await db().runTransaction(async (tx) => {
      const snap = await tx.get(refLimite);
      const d = snap.data();
      const actual: ContadorDeSolicitudes | null = d
        ? { desde: Number(d['desde']) || 0, n: Number(d['n']) || 0 }
        : null;
      const r = registrarSolicitud(actual, ahora);
      if (r.permitido) tx.set(refLimite, r.contador);
      return r.permitido;
    });
    if (!pasa) {
      throw new HttpsError('resource-exhausted', 'Demasiadas solicitudes seguidas.', {
        motivo: 'limite',
      });
    }

    const ref = db().collection('homeRequests').doc();
    await ref.set({
      ...valida.solicitud,
      status: 'new',
      note: '',
      createdAt: FieldValue.serverTimestamp(),
    });

    const ajustes = await db().doc('platform/homeRequests').get();
    const para = correoDeAviso(ajustes.data()?.['notifyEmail']);
    if (para !== '') {
      await encolarAviso(
        para,
        `Nueva solicitud de web de boda: ${valida.solicitud.names}`,
        lineasDeAviso(valida.solicitud),
        'solicitudNueva',
      );
    }

    return { ok: true as const };
  },
);

export const listHomeRequests = onCall(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK },
  async (peticion) => {
    exigirSuperadmin(peticion);

    const [snap, ajustes] = await Promise.all([
      db()
        .collection('homeRequests')
        .orderBy('createdAt', 'desc')
        .limit(MAX_SOLICITUDES_LISTADAS)
        .get(),
      db().doc('platform/homeRequests').get(),
    ]);

    return {
      notifyEmail: correoDeAviso(ajustes.data()?.['notifyEmail']),
      solicitudes: snap.docs.map((d) => {
        const x = d.data();
        const creada = x['createdAt'] as { toMillis?: () => number } | undefined;
        return {
          id: d.id,
          names: texto(x['names']),
          email: texto(x['email']),
          phone: texto(x['phone']),
          weddingDate: texto(x['weddingDate']),
          plan: texto(x['plan']),
          message: texto(x['message']),
          status: texto(x['status']),
          note: texto(x['note']),
          createdAt: typeof creada?.toMillis === 'function' ? creada.toMillis() : 0,
        };
      }),
    };
  },
);

export const updateHomeRequest = onCall<{ id?: unknown; status?: unknown; note?: unknown }>(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK },
  async (peticion) => {
    const superadmin = exigirSuperadmin(peticion);

    const id = texto(peticion.data?.id);
    if (id === '' || id.includes('/'))
      throw new HttpsError('invalid-argument', 'Falta la solicitud.');
    if (!esEstadoDeSolicitud(peticion.data?.status)) {
      throw new HttpsError('invalid-argument', 'Ese estado no existe.', { motivo: 'estado' });
    }
    const nota = texto(peticion.data?.note).trim().slice(0, MAX_NOTA);

    const ref = db().doc(`homeRequests/${id}`);
    const antes = await ref.get();
    if (!antes.exists) throw new HttpsError('not-found', 'Esa solicitud no existe.');

    await ref.update({
      status: peticion.data.status,
      note: nota,
      updatedAt: FieldValue.serverTimestamp(),
    });

    await auditar({
      actorUid: superadmin.uid,
      actorRole: 'superadmin',
      action: 'updateHomeRequest',
      weddingId: null,
      payload: { requestId: id, status: peticion.data.status },
    });

    return { ok: true as const };
  },
);

export const saveHomeRequestSettings = onCall<{ notifyEmail?: unknown }>(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK },
  async (peticion) => {
    const superadmin = exigirSuperadmin(peticion);

    const correo = texto(peticion.data?.notifyEmail).trim().toLowerCase();
    // Vacío = sin aviso por correo (la bandeja sigue funcionando).
    if (correo !== '' && !esCorreoValido(correo)) {
      throw new HttpsError('invalid-argument', 'Ese correo no es válido.', { motivo: 'correo' });
    }

    await db()
      .doc('platform/homeRequests')
      .set({ notifyEmail: correo, updatedAt: FieldValue.serverTimestamp() }, { merge: true });

    await auditar({
      actorUid: superadmin.uid,
      actorRole: 'superadmin',
      action: 'saveHomeRequestSettings',
      weddingId: null,
      payload: { avisoActivo: correo !== '' },
    });

    return { ok: true as const, notifyEmail: correo };
  },
);
