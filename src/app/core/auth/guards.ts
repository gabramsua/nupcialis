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
/**
 * Todo lo que necesita inyección, resuelto de una vez.
 *
 * **Se llama antes del primer `await` y no hay excepciones.** `inject()` solo
 * funciona dentro del contexto de inyección, y ese contexto se pierde en cuanto
 * la función cede el control: al volver del `await`, un `inject()` lanza
 * `NG0203`. Estaba pasando —la fuente de tenant se creaba después de esperar a
 * la sesión— y el panel de la pareja no llegaba a abrirse nunca, con un error
 * que no menciona ni el panel ni la sesión.
 *
 * Agrupar las dependencias aquí es lo que hace visible la regla: si alguien
 * añade una inyección, la añade en este sitio, que está antes del `await` por
 * construcción.
 */
function dependenciasDelPanel() {
  return {
    router: inject(Router),
    store: inject(SessionStore),
    hostname: inject(DOCUMENT).location.hostname,
    fuenteTenant: crearFuenteTenantFirestore(),
  };
}

export const guardaPanel: CanActivateFn = async () => {
  const { router, store, hostname, fuenteTenant } = dependenciasDelPanel();

  const sesion = await store.esperar();

  const destino = resolverTenant(hostname, environment.rootDomain);
  const boda =
    destino.superficie === 'boda' && destino.slug
      ? await cargarTenant(destino.slug, fuenteTenant)
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
      // A una pantalla que lo explica, no a la raíz: el acceso funcionó y lo
      // que falta es el claim. Mandar a la raíz dejaba un «no encontramos esta
      // boda» que no tiene nada que ver y hace perder media hora.
      return router.createUrlTree(['/superadmin/sin-permiso']);
  }
};
