import { DOCUMENT, inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { crearFuenteTenantFirestore } from '../firebase/tenant-source.firestore';
import { cargarTenant } from '../tenant/tenant-loader';
import { resolverTenant } from '../tenant/tenant-resolution';
import { accesoAlPanel, accesoAlSuperadmin } from './acceso';
import { SessionStore } from './session.store';

/**
 * Guarda del panel de la pareja.
 *
 * Resuelve la boda del host y la contrasta con la del token. **Esto no es la
 * seguridad**: si alguien manipula el navegador y se cuela, las reglas de
 * Firestore no le dejan leer nada. Esto evita enseñar un panel que no va a
 * poder cargar datos, y llevar a cada uno donde le corresponde.
 */
export const guardaPanel: CanActivateFn = async () => {
  const router = inject(Router);
  const store = inject(SessionStore);
  const { hostname } = inject(DOCUMENT).location;

  const sesion = await store.esperar();

  const destino = resolverTenant(hostname, environment.rootDomain);
  const boda =
    destino.superficie === 'boda' && destino.slug
      ? await cargarTenant(destino.slug, crearFuenteTenantFirestore())
      : null;

  const weddingId = boda?.tipo === 'ok' ? boda.weddingId : null;

  switch (accesoAlPanel(sesion, weddingId)) {
    case 'ok':
      return true;
    case 'sin-sesion':
      return router.createUrlTree(['/panel/acceso']);
    case 'otra-boda':
      return router.createUrlTree(['/panel/otra-boda']);
    default:
      return router.createUrlTree(['/']);
  }
};

/** Guarda del panel de superadmin. No necesita resolver ninguna boda. */
export const guardaSuperadmin: CanActivateFn = async () => {
  const router = inject(Router);
  const sesion = await inject(SessionStore).esperar();

  switch (accesoAlSuperadmin(sesion)) {
    case 'ok':
      return true;
    case 'sin-sesion':
      return router.createUrlTree(['/superadmin/acceso']);
    default:
      return router.createUrlTree(['/']);
  }
};
