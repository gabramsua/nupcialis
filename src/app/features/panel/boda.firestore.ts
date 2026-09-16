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
  };
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
    modulos: modulos(datos['modules']),
  };
}
