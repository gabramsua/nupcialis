import { inject } from '@angular/core';
import { Timestamp, doc, getDoc } from 'firebase/firestore';
import {
  EntradaSlug,
  FuenteTenant,
  NombresPareja,
  PaletaMarca,
  SitioPublico,
  TemaPublico,
} from '../tenant/tenant-source';
import { sanearSecciones } from '../../features/public-site/secciones/secciones';
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
        coupleNames: nombres(datos['coupleNames']),
        weddingDate:
          datos['weddingDate'] instanceof Timestamp ? datos['weddingDate'].toDate() : null,
        // Se deja pasar la cadena tal cual: quien sabe si «17:00» es una hora
        // válida es `horaDeReloj`, y una hora corrupta se comporta como sin
        // hora, no rompe la portada.
        weddingTime: typeof datos['weddingTime'] === 'string' ? datos['weddingTime'] : null,
        timezone: typeof datos['timezone'] === 'string' ? datos['timezone'] : 'Europe/Madrid',
        locale: typeof datos['locale'] === 'string' ? datos['locale'] : 'es',
        theme: tema(datos['theme']),
        // Se vuelve a sanear en el cliente aunque el servidor ya lo haya hecho.
        // No es desconfianza del servidor: es que este documento puede haber
        // sido escrito por una versión anterior de la función, y una web de
        // boda no puede romperse por un despliegue a medias.
        secciones: sanearSecciones(secciones(datos['content'])),
      };
    },
  };
}

/**
 * Los nombres de la pareja, tal como los escribe `syncPublicProjection`.
 *
 * Un documento a medio escribir no puede tumbar la portada: si falta un nombre
 * se queda vacío y la web sigue mostrando la fecha, que es lo que el invitado
 * ha venido a ver.
 */
/** El array de secciones dentro de `content`, sin suponer que exista. */
function secciones(valor: unknown): unknown {
  if (valor === null || typeof valor !== 'object') return null;
  return (valor as Record<string, unknown>)['sections'];
}

function nombres(valor: unknown): NombresPareja {
  const par = typeof valor === 'object' && valor !== null ? (valor as Record<string, unknown>) : {};
  return {
    partnerA: typeof par['partnerA'] === 'string' ? par['partnerA'] : '',
    partnerB: typeof par['partnerB'] === 'string' ? par['partnerB'] : '',
  };
}

/**
 * El tema de la boda.
 *
 * Un `templateId` desconocido no se corrige aquí: se deja pasar tal cual y lo
 * resuelve el catálogo de plantillas, que es quien sabe cuáles existen. Esta
 * capa comprueba formas, no reglas de negocio.
 */
function tema(valor: unknown): TemaPublico {
  const t = valor !== null && typeof valor === 'object' ? (valor as Record<string, unknown>) : {};
  return {
    templateId: typeof t['templateId'] === 'string' ? t['templateId'] : '',
    palette: paleta(t['palette']),
    heroImagePath: typeof t['heroImagePath'] === 'string' ? t['heroImagePath'] : null,
    heroImageUrl: typeof t['heroImageUrl'] === 'string' ? t['heroImageUrl'] : null,
  };
}

const CLAVES_PALETA = ['primary', 'secondary', 'background', 'surface', 'text', 'accent'] as const;

/**
 * La paleta solo vale si está completa.
 *
 * Media paleta produce una portada a medio pintar, con tres colores de la
 * pareja y tres de la plantilla, que es peor que la plantilla entera. O están
 * los seis o no hay paleta.
 */
function paleta(valor: unknown): PaletaMarca | null {
  if (valor === null || typeof valor !== 'object') return null;
  const p = valor as Record<string, unknown>;

  const completa = CLAVES_PALETA.every((clave) => typeof p[clave] === 'string' && p[clave] !== '');
  if (!completa) return null;

  return Object.fromEntries(CLAVES_PALETA.map((c) => [c, p[c]])) as unknown as PaletaMarca;
}
