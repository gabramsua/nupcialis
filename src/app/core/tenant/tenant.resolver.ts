import { DOCUMENT, inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { environment } from '../../../environments/environment';
import { crearFuenteTenantFirestore } from '../firebase/tenant-source.firestore';
import { ResultadoTenant, cargarTenant } from './tenant-loader';
import { resolverTenant } from './tenant-resolution';

/**
 * Resuelve la boda antes de pintar nada.
 *
 * Va en la ruta y no en el componente para que la pantalla no llegue a
 * montarse con el tenant a medias. Una web de boda que parpadea entre "no
 * encontrada" y el contenido real da muy mala impresión al invitado.
 */
export const tenantResolver: ResolveFn<ResultadoTenant> = async () => {
  const { hostname } = inject(DOCUMENT).location;
  const destino = resolverTenant(hostname, environment.rootDomain);

  if (destino.superficie !== 'boda' || !destino.slug) {
    return { tipo: 'no-encontrada' } as const;
  }

  return cargarTenant(destino.slug, crearFuenteTenantFirestore());
};
