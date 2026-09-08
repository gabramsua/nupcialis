import { inject } from '@angular/core';
import { Timestamp, doc, getDoc } from 'firebase/firestore';
import { EntradaSlug, FuenteTenant, SitioPublico } from '../tenant/tenant-source';
import { FIRESTORE } from './firestore.providers';

/**
 * Implementación del puerto de tenant con Firestore.
 *
 * Los datos que llegan de la base son `unknown` hasta que se comprueban. Este
 * fichero es la frontera: aquí se valida la forma y a partir de aquí el resto de
 * la aplicación trabaja con tipos en los que puede confiar. Hacer un `as` y
 * seguir es cómodo hasta el día que un documento viejo no tiene un campo.
 */
export function crearFuenteTenantFirestore(): FuenteTenant {
  const db = inject(FIRESTORE);

  return {
    async buscarSlug(slug: string): Promise<EntradaSlug | null> {
      const snap = await getDoc(doc(db, 'slugs', slug));
      if (!snap.exists()) return null;

      const datos = snap.data();
      const weddingId = datos['weddingId'];
      const status = datos['status'];

      if (typeof weddingId !== 'string' || !weddingId) return null;

      return {
        weddingId,
        // Cualquier valor que no sea exactamente 'active' se trata como
        // cuarentena. Ante un dato inesperado, no publicar.
        status: status === 'active' ? 'active' : 'quarantined',
      };
    },

    async leerSitio(weddingId: string): Promise<SitioPublico | null> {
      const snap = await getDoc(doc(db, 'weddings', weddingId, 'public', 'site'));
      if (!snap.exists()) return null;

      const datos = snap.data();
      const status = datos['status'];

      return {
        // Igual que arriba: si el estado no se reconoce, se queda en borrador.
        // Ante la duda, una web de boda no se publica sola.
        status: status === 'active' || status === 'archived' ? status : 'draft',
        coupleNames: typeof datos['coupleNames'] === 'string' ? datos['coupleNames'] : '',
        weddingDate:
          datos['weddingDate'] instanceof Timestamp ? datos['weddingDate'].toDate() : null,
        locale: typeof datos['locale'] === 'string' ? datos['locale'] : 'es',
      };
    },
  };
}
