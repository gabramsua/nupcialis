/**
 * Lectura y escritura del documento de la boda desde su panel.
 *
 * El `weddingId` **sale del claim del token**, nunca de la URL ni de un campo
 * del cliente (regla 1 de CLAUDE.md). Quien llama aquí se lo pasa ya sacado de
 * la sesión; este fichero no lo adivina.
 *
 * Frontera de confianza (D-19): lo que llega de Firestore se comprueba antes de
 * salir de aquí.
 */

import { inject } from '@angular/core';
import { Timestamp, doc, getDoc, updateDoc } from 'firebase/firestore';

import { FIRESTORE } from '../../core/firebase/firestore.providers';
import { CLAVES_PALETA, type ColoresPaleta } from '../public-site/paletas/paletas';
import { sanearSecciones, type Seccion } from '../public-site/secciones/secciones';
import {
  MODULOS,
  type BodaDelPanel,
  type ConfigModulo,
  type Modulo,
  type Visibilidad,
} from './boda';

export interface FuenteBoda {
  leer(weddingId: string): Promise<BodaDelPanel | null>;
  cambiarPlantilla(weddingId: string, templateId: string): Promise<void>;
  /** `'17:00'`, o `null` para dejarla sin fijar. */
  guardarHora(weddingId: string, weddingTime: string | null): Promise<void>;
  guardarSecciones(weddingId: string, secciones: readonly Seccion[]): Promise<void>;
  /** `null` quita la paleta y devuelve la boda a los colores de su plantilla. */
  guardarPaleta(weddingId: string, colores: ColoresPaleta | null): Promise<void>;
  /** Ruta y URL de la foto de portada, o las dos a `null` para quitarla. */
  guardarPortada(weddingId: string, path: string | null, url: string | null): Promise<void>;
  /** Salir o no en buscadores. */
  guardarIndexable(weddingId: string, indexable: boolean): Promise<void>;
}

export function crearFuenteBodaFirestore(): FuenteBoda {
  const db = inject(FIRESTORE);

  return {
    async leer(weddingId: string): Promise<BodaDelPanel | null> {
      const snap = await getDoc(doc(db, 'weddings', weddingId));
      if (!snap.exists()) return null;
      return desdeDocumento(weddingId, snap.data());
    },

    async cambiarPlantilla(weddingId: string, templateId: string): Promise<void> {
      // Ruta anidada, no un objeto `theme` entero: escribir el mapa completo se
      // llevaría por delante la paleta y la foto de portada de la pareja.
      await updateDoc(doc(db, 'weddings', weddingId), { 'theme.templateId': templateId });
    },

    async guardarHora(weddingId: string, weddingTime: string | null): Promise<void> {
      // `weddingTime` no es campo de sistema (regla 6): lo escribe la pareja
      // directamente, sin pasar por una función. Las reglas ya lo permiten.
      await updateDoc(doc(db, 'weddings', weddingId), { weddingTime });
    },

    async guardarPaleta(weddingId: string, colores: ColoresPaleta | null): Promise<void> {
      // Ruta anidada: escribir `theme` entero se llevaría por delante la
      // plantilla elegida y la foto de portada.
      await updateDoc(doc(db, 'weddings', weddingId), { 'theme.palette': colores });
    },

    async guardarPortada(
      weddingId: string,
      path: string | null,
      url: string | null,
    ): Promise<void> {
      await updateDoc(doc(db, 'weddings', weddingId), {
        'theme.heroImagePath': path,
        'theme.heroImageUrl': url,
      });
    },

    async guardarIndexable(weddingId: string, indexable: boolean): Promise<void> {
      await updateDoc(doc(db, 'weddings', weddingId), { indexable });
    },

    async guardarSecciones(weddingId: string, secciones: readonly Seccion[]): Promise<void> {
      // Ruta anidada: `content` puede llegar a tener más cosas que `sections`,
      // y escribir el objeto entero se las llevaría por delante.
      await updateDoc(doc(db, 'weddings', weddingId), {
        // Se sanea también al salir. El servidor lo repetirá antes de publicar,
        // pero guardar basura en el documento de la boda y limpiarla después
        // deja a la pareja viendo en su panel algo distinto de lo que se
        // publica, que es la peor forma de descubrir un fallo.
        'content.sections': sanearSecciones(secciones) as Seccion[],
      });
    },
  };
}

/**
 * La paleta, solo si está completa.
 *
 * Misma regla que en la web pública: o están los seis colores o no hay paleta.
 * Media paleta mezcla tres colores de la pareja con tres de la plantilla.
 */
function paleta(valor: unknown): ColoresPaleta | null {
  if (valor === null || typeof valor !== 'object') return null;
  const p = valor as Record<string, unknown>;

  const completa = CLAVES_PALETA.every((c) => typeof p[c] === 'string' && p[c] !== '');
  if (!completa) return null;

  return Object.fromEntries(CLAVES_PALETA.map((c) => [c, p[c]])) as unknown as ColoresPaleta;
}

/** El array de secciones dentro de `content`, sin suponer que exista. */
function seccionesDe(valor: unknown): unknown {
  if (valor === null || typeof valor !== 'object') return null;
  return (valor as Record<string, unknown>)['sections'];
}

function visibilidad(valor: unknown): Visibilidad {
  return valor === 'visible' || valor === 'soon' ? valor : 'hidden';
}

function modulos(valor: unknown): Partial<Record<Modulo, ConfigModulo>> {
  const crudo =
    valor !== null && typeof valor === 'object' ? (valor as Record<string, unknown>) : {};
  const salida: Partial<Record<Modulo, ConfigModulo>> = {};

  for (const modulo of MODULOS) {
    const config = crudo[modulo];
    if (config === null || typeof config !== 'object') continue;
    const c = config as Record<string, unknown>;
    salida[modulo] = { enabled: c['enabled'] === true, visibility: visibilidad(c['visibility']) };
  }

  return salida;
}

function desdeDocumento(weddingId: string, datos: Record<string, unknown>): BodaDelPanel {
  const tema =
    datos['theme'] !== null && typeof datos['theme'] === 'object'
      ? (datos['theme'] as Record<string, unknown>)
      : {};
  const estado = datos['status'];

  return {
    weddingId,
    slug: typeof datos['slug'] === 'string' ? datos['slug'] : '',
    // Ante un estado desconocido, borrador: es el que menos promete.
    status: estado === 'active' || estado === 'archived' ? estado : 'draft',
    plan: datos['plan'] === 'extended' ? 'extended' : 'basic',
    weddingDate: datos['weddingDate'] instanceof Timestamp ? datos['weddingDate'].toDate() : null,
    weddingTime: typeof datos['weddingTime'] === 'string' ? datos['weddingTime'] : null,
    timezone: typeof datos['timezone'] === 'string' ? datos['timezone'] : 'Europe/Madrid',
    templateId: typeof tema['templateId'] === 'string' ? tema['templateId'] : '',
    indexable: datos['indexable'] === true,
    palette: paleta(tema['palette']),
    heroImagePath: typeof tema['heroImagePath'] === 'string' ? tema['heroImagePath'] : null,
    heroImageUrl: typeof tema['heroImageUrl'] === 'string' ? tema['heroImageUrl'] : null,
    secciones: sanearSecciones(seccionesDe(datos['content'])),
    modulos: modulos(datos['modules']),
  };
}
