/**
 * Reintento manual del alta del subdominio en Firebase Auth.
 *
 * `provisionWedding` ya lo intenta, pero no puede tumbar un alta correcta
 * porque el Identity Toolkit haya dado un 503. Cuando eso pasa, la boda queda
 * con `setup.authDomain: 'pending'`, el panel de superadmin lo pinta en rojo, y
 * desde ahí se llama aquí.
 *
 * Es la contrapartida de la regla 8 de CLAUDE.md: el fallo existe, así que
 * tiene que ser visible y tener un botón.
 */

import { HttpsError, onCall } from 'firebase-functions/v2/https';

import { dominioDeBoda } from './dominio/dominios';
import { DOMINIO_BASE, REGION, db } from './firebase';
import { auditar } from './infra/auditoria';
import { autorizarDominio, hayEmuladorDeAuth } from './infra/identity-toolkit';
import { exigirSuperadmin } from './infra/permisos';

export const authorizeWeddingDomain = onCall<{ weddingId?: string }>(
  { region: REGION, enforceAppCheck: true },
  async (peticion) => {
    const superadmin = exigirSuperadmin(peticion);

    const weddingId = peticion.data?.weddingId;
    if (!weddingId) throw new HttpsError('invalid-argument', 'Falta el weddingId.');

    const bodaRef = db().doc(`weddings/${weddingId}`);
    const boda = await bodaRef.get();
    if (!boda.exists) throw new HttpsError('not-found', 'Esa boda no existe.');

    const slug = boda.data()?.['slug'];
    if (typeof slug !== 'string' || slug === '') {
      throw new HttpsError('failed-precondition', 'Esa boda no tiene slug.');
    }

    const dominio = dominioDeBoda(slug, DOMINIO_BASE);

    if (hayEmuladorDeAuth()) {
      // El emulador no tiene lista de dominios autorizados: no hay nada que
      // reintentar y decir "hecho" sería mentir sobre producción.
      throw new HttpsError('failed-precondition', 'El emulador de Auth no autoriza dominios.');
    }

    const { cambiado, total, aviso } = await autorizarDominio(dominio);
    await bodaRef.update({ 'setup.authDomain': 'ok' });

    await auditar({
      actorUid: superadmin.uid,
      actorRole: 'superadmin',
      action: 'authorizeWeddingDomain',
      weddingId,
      payload: { dominio, cambiado, total },
    });

    return { dominio, cambiado, total, aviso, estado: 'ok' as const };
  },
);
