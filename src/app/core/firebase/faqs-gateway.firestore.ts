/**
 * Las preguntas frecuentes, escritas por la pareja desde su panel.
 *
 * Van por Firestore directamente, no por función: las reglas dejan a la pareja
 * escribir en `faqs` de su boda y no hay ninguna invariante que necesite mirar
 * a otra colección. Lo que publica la web lo decide el trigger de la
 * proyección, que sanea el HTML y se queda solo con las que están completas.
 *
 * El `weddingId` llega ya sacado del token (regla 1); este fichero no lo
 * adivina. Frontera de confianza (D-19): lo que vuelve de Firestore se
 * comprueba antes de salir de aquí, porque un documento lo pudo escribir una
 * versión anterior del panel.
 */

import { inject } from '@angular/core';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';

import {
  ordenarFaqs,
  type DatosFaq,
  type FalloFaqs,
  type FaqDelPanel,
  type PuertaFaqs,
  type ResultadoEscrituraFaq,
  type ResultadoFaqs,
} from '../faqs/faqs-gateway';
import { esIconoFaq } from '../../features/public-site/faqs/faqs';
import { FIRESTORE } from './firestore.providers';

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor : '';
}

function aFaq(id: string, datos: Record<string, unknown>): FaqDelPanel {
  const icono = datos['icon'];

  return {
    id,
    question: texto(datos['question']),
    answer: texto(datos['answer']),
    category: texto(datos['category']),
    icon: esIconoFaq(icono) ? icono : 'question',
    order: typeof datos['order'] === 'number' ? datos['order'] : 0,
    // Ausente es activa, igual que en el servidor.
    enabled: datos['enabled'] !== false,
  };
}

/**
 * El id de documento de una pregunta nueva.
 *
 * Legible y derivado de la pregunta, como las de fábrica: un listado de
 * Firestore con `parking` y `autobus` se lee sin un diccionario delante.
 */
export function idDeFaq(question: string, usados: readonly string[]): string {
  const base =
    question
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'pregunta';

  if (!usados.includes(base)) return base;

  for (let n = 2; n < 100; n++) {
    const probando = `${base}-${n}`;
    if (!usados.includes(probando)) return probando;
  }

  return `${base}-${Date.now()}`;
}

export function crearPuertaFaqsFirestore(): PuertaFaqs {
  const db = inject(FIRESTORE);

  const ruta = (weddingId: string) => collection(db, 'weddings', weddingId, 'faqs');

  return {
    async listar(weddingId: string): Promise<ResultadoFaqs> {
      try {
        const snap = await getDocs(ruta(weddingId));
        return { ok: true, faqs: ordenarFaqs(snap.docs.map((d) => aFaq(d.id, d.data()))) };
      } catch (error) {
        return { ok: false, fallo: traducirFaq(error) };
      }
    },

    async guardar(weddingId: string, datos: DatosFaq): Promise<ResultadoEscrituraFaq> {
      try {
        const campos = {
          question: datos.question,
          answer: datos.answer,
          category: datos.category,
          icon: datos.icon,
          order: datos.order,
          enabled: datos.enabled,
        };

        if (datos.id) {
          await updateDoc(doc(ruta(weddingId), datos.id), campos);
        } else {
          const snap = await getDocs(ruta(weddingId));
          const id = idDeFaq(
            datos.question,
            snap.docs.map((d) => d.id),
          );
          await setDoc(doc(ruta(weddingId), id), campos);
        }

        return { ok: true };
      } catch (error) {
        return { ok: false, fallo: traducirFaq(error) };
      }
    },

    async borrar(weddingId: string, id: string): Promise<ResultadoEscrituraFaq> {
      try {
        await deleteDoc(doc(ruta(weddingId), id));
        return { ok: true };
      } catch (error) {
        return { ok: false, fallo: traducirFaq(error) };
      }
    },

    /** El orden que se ve, escrito de una vez: media lista reordenada es peor que nada. */
    async reordenar(weddingId: string, ids: readonly string[]): Promise<ResultadoEscrituraFaq> {
      try {
        const lote = writeBatch(db);
        ids.forEach((id, indice) => lote.update(doc(ruta(weddingId), id), { order: indice + 1 }));
        await lote.commit();
        return { ok: true };
      } catch (error) {
        return { ok: false, fallo: traducirFaq(error) };
      }
    },
  };
}

/** Exportada para poder probarla sin red, como las demás traducciones. */
export function traducirFaq(error: unknown): FalloFaqs {
  const fallo = (error ?? {}) as { code?: string; message?: string };

  switch (fallo.code) {
    case 'unavailable':
    case 'deadline-exceeded':
      return { tipo: 'red' };

    case 'permission-denied':
    case 'unauthenticated':
      return { tipo: 'sin-permiso' };

    default:
      return { tipo: 'error', mensaje: fallo.message ?? 'Error desconocido' };
  }
}
