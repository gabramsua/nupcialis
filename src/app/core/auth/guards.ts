import { DOCUMENT, inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router, UrlTree } from '@angular/router';
import { environment } from '../../../environments/environment';
import { crearFuenteTenantFirestore } from '../firebase/tenant-source.firestore';
import { cargarTenant } from '../tenant/tenant-loader';
import { resolverTenant } from '../tenant/tenant-resolution';
import { accesoAlPanel, accesoAlPanelSinBoda, accesoAlSuperadmin } from './acceso';
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

  // Falla cerrado: si algo revienta al resolver la sesión o la boda (red,
  // App Check, una regla), el panel NO se abre. Una excepción en una guarda
  // deja el router a medias, que no es lo mismo que denegar.
  try {
    return await decidirAccesoAlPanel(router, store, hostname, fuenteTenant);
  } catch (error) {
    console.error('[Panel] No se pudo comprobar el acceso; se deniega.', error);
    return router.createUrlTree(['/panel/acceso']);
  }
};

/**
 * Se vuelve a comprobar la sesión en **cada** navegación dentro del panel, no
 * solo al entrar: si la sesión caduca o se cierra en otra pestaña mientras el
 * panel está abierto, el siguiente clic lleva al acceso en vez de enseñar
 * pantallas de alguien que ya no está.
 */
export const guardaHijosDelPanel: CanActivateChildFn = async () => {
  const router = inject(Router);
  const sesion = await inject(SessionStore).esperar();
  return accesoAlPanelSinBoda(sesion) ? true : router.createUrlTree(['/panel/acceso']);
};

async function decidirAccesoAlPanel(
  router: Router,
  store: SessionStore,
  hostname: string,
  fuenteTenant: ReturnType<typeof crearFuenteTenantFirestore>,
): Promise<boolean | UrlTree> {
  const sesion = await store.esperar();

  const destino = resolverTenant(hostname, environment.rootDomain);
  const boda =
    destino.superficie === 'boda' && destino.slug
      ? await cargarTenant(destino.slug, fuenteTenant)
      : null;

  // El panel se abre también con la boda en borrador o archivada: es donde la
  // pareja la prepara antes de publicar y la repasa después. Solo la web pública
  // se cierra en esos estados.
  const weddingId =
    boda?.tipo === 'ok' || boda?.tipo === 'no-publicada' || boda?.tipo === 'archivada'
      ? boda.weddingId
      : null;

  const resultado = accesoAlPanel(sesion, weddingId);

  // Solo en desarrollo: cuando el panel te echa, la pantalla no dice por qué y
  // la causa puede estar en tres sitios (sesión, claims, boda del host). Sin
  // datos personales: ni correo ni identificadores.
  if (!environment.production) {
    console.warn(
      `[Panel] Guarda del panel → ${resultado}.\n` +
        `  sesión: rol=${sesion.rol}, weddingId en el token=${sesion.weddingId ?? 'ninguno'}\n` +
        `  host: ${hostname} → boda=${boda?.tipo ?? 'no resuelta'}, weddingId del host=${weddingId ?? 'ninguno'}`,
    );
  }

  switch (resultado) {
    case 'ok':
      return true;
    case 'sin-sesion':
      return router.createUrlTree(['/panel/acceso']);
    case 'otra-boda':
      return router.createUrlTree(['/panel/otra-boda']);
    default:
      return router.createUrlTree(['/']);
  }
}

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
