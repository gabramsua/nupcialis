/**
 * Editar y borrar una boda desde el superadmin (D-53).
 *
 * - `updateWedding`: corrige nombres, fecha, ceremonia, plan, teléfono o la
 *   dirección de la web (D-55). La escritura en
 *   `weddings/{id}` republica la web pública sola (`syncPublicProjection`), así
 *   que el cambio se ve en ella. Cambiar de plan aplica a la boda los módulos
 *   del plan nuevo (los añadidos se activan; los que ya no incluye se
 *   desactivan sin borrar sus datos).
 * - `deleteWedding`: **borrado definitivo e inmediato**, sin papelera. Para que
 *   no se haga por error hay que escribir la dirección de la boda. Se llevan el
 *   documento y todo lo que cuelga de él, los ficheros de Storage, el registro
 *   de la dirección y el dominio autorizado en Auth, y las cuentas de la pareja
 *   si no tienen otra boda. **No se tocan** los cobros ni el registro de
 *   auditoría: son contabilidad y rastro, no datos de la boda.
 */

import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import { validarEdicion } from './dominio/edicion-boda';
import { dominioDeBoda } from './dominio/dominios';
import { cambiosDeModulosEnBoda, diferenciaDePlan, layoutDePlan } from './dominio/planes';
import { DOMINIO_BASE, EXIGIR_APP_CHECK, REGION, auth, bucket, db } from './firebase';
import { auditar } from './infra/auditoria';
import { autorizarDominio, desautorizarDominio, hayEmuladorDeAuth } from './infra/identity-toolkit';
import { exigirSuperadmin } from './infra/permisos';
import { leerModulosDeLosPlanes } from './planes';

function idDe(valor: unknown): string {
  if (typeof valor !== 'string' || valor.trim() === '' || valor.includes('/')) {
    throw new HttpsError('invalid-argument', 'La boda no es válida.');
  }
  return valor;
}

export const updateWedding = onCall<{ weddingId?: unknown; cambios?: unknown }>(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK },
  async (peticion) => {
    const superadmin = exigirSuperadmin(peticion);
    const weddingId = idDe(peticion.data?.weddingId);

    const valida = validarEdicion(peticion.data?.cambios);
    if (!valida.ok) {
      throw new HttpsError('invalid-argument', 'Los datos no son válidos.', {
        motivo: valida.motivo,
      });
    }
    const { cambios } = valida;

    const ref = db().doc(`weddings/${weddingId}`);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpsError('not-found', 'Esa boda no existe.');
    const boda = snap.data() ?? {};

    const escritura: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
    if (cambios.partnerA !== undefined) escritura['couple.partnerA'] = cambios.partnerA;
    if (cambios.partnerB !== undefined) escritura['couple.partnerB'] = cambios.partnerB;
    if (cambios.weddingDate) escritura['weddingDate'] = Timestamp.fromDate(cambios.weddingDate);
    if (cambios.ceremonyType) escritura['ceremonyType'] = cambios.ceremonyType;
    if (cambios.contactPhone !== undefined) escritura['contactPhone'] = cambios.contactPhone;

    if (cambios.plan && cambios.plan !== boda['plan']) {
      const antes = boda['plan'] === 'extended' ? 'extended' : 'basic';
      const porPlan = await leerModulosDeLosPlanes();
      escritura['plan'] = cambios.plan;
      escritura['layout'] = layoutDePlan(cambios.plan);
      Object.assign(
        escritura,
        cambiosDeModulosEnBoda(
          boda['modules'],
          diferenciaDePlan(porPlan[antes], porPlan[cambios.plan]),
        ),
      );
    }

    // El precio acordado es contabilidad de Gabriel: **no vive en la boda**, que
    // la pareja lee, sino en `billing/{weddingId}`, que solo lee el superadmin
    // (las reglas la dejan cerrada por defecto). Se conserva al borrar la boda,
    // igual que los cobros.
    if (cambios.agreedPriceCents !== undefined) {
      await db()
        .doc(`billing/${weddingId}`)
        .set(
          { agreedPriceCents: cambios.agreedPriceCents, updatedAt: FieldValue.serverTimestamp() },
          { merge: true },
        );
    }

    const slugAntiguo = typeof boda['slug'] === 'string' ? boda['slug'] : '';
    const cambiaSlug = cambios.slug !== undefined && cambios.slug !== slugAntiguo;
    const avisos: string[] = [];

    if (cambiaSlug && cambios.slug !== undefined) {
      const nuevo = cambios.slug;
      escritura['slug'] = nuevo;
      // Hasta que Auth autorice la dirección nueva, la ficha la marca pendiente.
      if (!hayEmuladorDeAuth()) escritura['setup.authDomain'] = 'pending';

      // Reservar la nueva y soltar la vieja es **una sola transacción**: si no,
      // dos bodas podrían quedarse con la misma dirección, o ninguna con la suya.
      await db().runTransaction(async (t) => {
        const nuevaRef = db().doc(`slugs/${nuevo}`);
        const ocupada = await t.get(nuevaRef);
        if (ocupada.exists) {
          throw new HttpsError('invalid-argument', 'Esa dirección ya está ocupada.', {
            motivo: 'slug-ocupado',
          });
        }
        t.create(nuevaRef, {
          weddingId,
          status: 'active',
          createdAt: FieldValue.serverTimestamp(),
        });
        if (slugAntiguo !== '') t.delete(db().doc(`slugs/${slugAntiguo}`));
        t.update(ref, escritura);
      });

      // El subdominio nuevo se autoriza en Auth y el viejo se retira. Un fallo
      // aquí no deshace el cambio: se cuenta, y el botón de reintento existe.
      if (!hayEmuladorDeAuth()) {
        try {
          await autorizarDominio(dominioDeBoda(nuevo, DOMINIO_BASE));
          await ref.update({ 'setup.authDomain': 'ok' });
        } catch (error) {
          console.error('No se pudo autorizar el dominio nuevo', nuevo, error);
          await ref.update({ 'setup.authDomain': 'pending' });
          avisos.push('No se ha podido autorizar la dirección nueva en Firebase Auth.');
        }
        if (slugAntiguo !== '') {
          try {
            await desautorizarDominio(dominioDeBoda(slugAntiguo, DOMINIO_BASE));
          } catch (error) {
            console.error('No se pudo retirar el dominio antiguo', slugAntiguo, error);
            avisos.push('No se ha podido retirar la dirección antigua de Firebase Auth.');
          }
        }
      }
    } else {
      await ref.update(escritura);
    }

    await auditar({
      actorUid: superadmin.uid,
      actorRole: 'superadmin',
      action: 'updateWedding',
      weddingId,
      payload: {
        campos: Object.keys(cambios),
        ...(cambiaSlug ? { slugAntiguo, slugNuevo: cambios.slug } : {}),
        avisos,
      },
    });

    return { ok: true as const, avisos };
  },
);

export const deleteWedding = onCall<{ weddingId?: unknown; confirmarSlug?: unknown }>(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK, timeoutSeconds: 540 },
  async (peticion) => {
    const superadmin = exigirSuperadmin(peticion);
    const weddingId = idDe(peticion.data?.weddingId);

    const ref = db().doc(`weddings/${weddingId}`);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpsError('not-found', 'Esa boda no existe.');
    const boda = snap.data() ?? {};

    const slug = typeof boda['slug'] === 'string' ? boda['slug'] : '';
    if (slug === '' || peticion.data?.confirmarSlug !== slug) {
      throw new HttpsError('failed-precondition', 'Hay que escribir la dirección de la boda.', {
        motivo: 'confirmacion',
      });
    }

    const propietarios = Array.isArray(boda['ownerUids'])
      ? (boda['ownerUids'] as unknown[]).filter((u): u is string => typeof u === 'string')
      : [];

    // 1. La boda y todo lo que cuelga de ella (invitados, fotos, secciones…).
    await db().recursiveDelete(ref);

    // 2. La dirección, que queda libre para otra boda.
    await db().doc(`slugs/${slug}`).delete();

    // 3. Los ficheros. Un fallo aquí no deshace el borrado: se cuenta y ya.
    const avisos: string[] = [];
    try {
      await bucket().deleteFiles({ prefix: `weddings/${weddingId}/`, force: true });
    } catch (error) {
      console.error('No se pudieron borrar los ficheros de la boda', weddingId, error);
      avisos.push('No se han podido borrar todos los ficheros de Storage.');
    }

    // 4. El dominio autorizado en Auth: es un recurso limitado (CLAUDE.md §11).
    try {
      await desautorizarDominio(dominioDeBoda(slug, DOMINIO_BASE));
    } catch (error) {
      console.error('No se pudo retirar el dominio', slug, error);
      avisos.push('No se ha podido retirar el dominio de Firebase Auth.');
    }

    // 5. Las cuentas de la pareja: fuera los claims, y la cuenta si no tiene más bodas.
    let cuentasBorradas = 0;
    for (const uid of propietarios) {
      try {
        const usuario = await auth().getUser(uid);
        if (usuario.customClaims?.['role'] === 'superadmin') continue;

        const otras = await db()
          .collection('weddings')
          .where('ownerUids', 'array-contains', uid)
          .limit(1)
          .get();
        if (otras.empty) {
          await auth().deleteUser(uid);
          cuentasBorradas++;
        } else {
          await auth().setCustomUserClaims(uid, null);
        }
      } catch (error) {
        console.error('No se pudo limpiar la cuenta', uid, error);
        avisos.push('No se han podido limpiar todas las cuentas de la pareja.');
      }
    }

    await auditar({
      actorUid: superadmin.uid,
      actorRole: 'superadmin',
      action: 'deleteWedding',
      weddingId,
      payload: { slug, cuentasBorradas, avisos },
    });

    return { ok: true as const, avisos, cuentasBorradas };
  },
);
