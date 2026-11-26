import { inject } from '@angular/core';
import { Timestamp, doc, getDoc } from 'firebase/firestore';
import {
  EntradaSlug,
  FuenteTenant,
  NombresPareja,
  PaletaMarca,
  SitioPublico,
  TemaPublico,
  type VisibilidadModulo,
} from '../tenant/tenant-source';
import { esModoAcceso } from '../acceso/acceso';
import { sanearSecciones } from '../../features/public-site/secciones/secciones';
import { sanearFaqs } from '../../features/public-site/faqs/faqs';
import { sanearCronologia } from '../../features/public-site/cronologia/cronologia';
import { sanearAlojamientos } from '../../features/public-site/alojamientos/alojamientos';
import { sanearAutobuses } from '../../features/public-site/autobuses/autobuses';
import { leerCortejoPublicado } from '../../features/public-site/cortejo/cortejo';
import { sanearUbicaciones } from '../../features/public-site/mapa/ubicaciones';
import { historiaPublicada } from '../../features/public-site/historia/historia-publicada';
import { dressCodePublicado } from '../../features/public-site/dress-code/dress-code';
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
        indexable: datos['indexable'] === true,
        modulos: modulos(datos['modules']),
        // Lo que no se reconozca es la web de una página: es el diseño que
        // siempre ha existido y el que no esconde nada.
        layout: datos['layout'] === 'multipage' ? 'multipage' : 'onepage',
        // Ante un valor que no reconocemos, abierta. Una boda que pidiera
        // identificarse por un dato corrupto dejaría fuera a sus invitados sin
        // que nadie lo hubiera decidido.
        guestAccessMode: esModoAcceso(datos['guestAccessMode']) ? datos['guestAccessMode'] : 'open',
        // Se vuelve a sanear en el cliente aunque el servidor ya lo haya hecho.
        // No es desconfianza del servidor: es que este documento puede haber
        // sido escrito por una versión anterior de la función, y una web de
        // boda no puede romperse por un despliegue a medias.
        secciones: sanearSecciones(secciones(datos['content'])),
        faqs: sanearFaqs(dentroDeContent(datos['content'], 'faqs')),
        cronologia: sanearCronologia(dentroDeContent(datos['content'], 'cronologia')),
        alojamientos: sanearAlojamientos(dentroDeContent(datos['content'], 'alojamientos')),
        autobuses: sanearAutobuses(dentroDeContent(datos['content'], 'buses')),
        cortejo: leerCortejoPublicado(dentroDeContent(datos['content'], 'cortejo')),
        ubicaciones: sanearUbicaciones(dentroDeContent(datos['content'], 'ubicaciones')),
        // El HTML de la descripción ya viene saneado del servidor: aquí solo
        // se comprueba la forma, como con todo lo que llega de Firestore.
        dressCode: dressCodePublicado(dentroDeContent(datos['content'], 'dressCode')),
        // Ya saneada por el servidor y sin rutas de Storage: aquí solo la forma.
        historia: historiaPublicada(dentroDeContent(datos['content'], 'historia')),
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
  return dentroDeContent(valor, 'sections');
}

function dentroDeContent(valor: unknown, clave: string): unknown {
  if (valor === null || typeof valor !== 'object') return null;
  return (valor as Record<string, unknown>)[clave];
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

/**
 * La visibilidad de cada módulo, sin creerse nada.
 *
 * Lo que no se reconozca es `hidden`: un módulo que apareciera por un dato
 * corrupto enseñaría al invitado una puerta que no lleva a ningún sitio.
 */
function modulos(valor: unknown): Readonly<Record<string, VisibilidadModulo>> {
  if (valor === null || typeof valor !== 'object') return {};

  const salida: Record<string, VisibilidadModulo> = {};
  for (const [modulo, estado] of Object.entries(valor as Record<string, unknown>)) {
    salida[modulo] = estado === 'visible' || estado === 'soon' ? estado : 'hidden';
  }
  return salida;
}
