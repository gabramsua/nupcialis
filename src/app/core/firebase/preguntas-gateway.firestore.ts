/**
 * Las preguntas del formulario, escritas por la pareja desde su panel.
 *
 * Van por Firestore directamente, no por función: las reglas dejan a la pareja
 * escribir en `formQuestions` de su boda, y no hay ninguna invariante que
 * necesite mirar a los invitados —que es lo que obligó a cerrar los grupos
 * (D-31)—. Lo único que las reglas no permiten es borrar una de sistema, y ese
 * `permission-denied` se traduce aquí a algo que la pantalla sabe contar.
 *
 * El `weddingId` llega ya sacado del token (regla 1); este fichero no lo
 * adivina. Frontera de confianza (D-19): lo que vuelve de Firestore se
 * comprueba antes de salir de aquí.
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
  PREGUNTA_DE_ASISTENCIA,
  type DatosPregunta,
  type FalloPreguntas,
  type PreguntaDelPanel,
  type PuertaPreguntas,
  type ResultadoEscritura,
  type ResultadoPreguntas,
} from '../rsvp/preguntas-gateway';
import { TIPOS_PREGUNTA, type OpcionPregunta, type TipoPregunta } from '../rsvp/rsvp-gateway';
import { FIRESTORE } from './firestore.providers';

const DESTINOS = ['guest', 'companion', 'both'] as const;

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor : '';
}

function opciones(valor: unknown): readonly OpcionPregunta[] {
  if (!Array.isArray(valor)) return [];

  return valor.flatMap((cruda) => {
    if (cruda === null || typeof cruda !== 'object') return [];
    const o = cruda as Record<string, unknown>;
    const value = texto(o['value']);
    return value === '' ? [] : [{ value, label: texto(o['label']) || value }];
  });
}

function condicion(valor: unknown): PreguntaDelPanel['visibleIf'] {
  if (valor === null || typeof valor !== 'object') return null;
  const c = valor as Record<string, unknown>;
  const questionId = texto(c['questionId']);
  return questionId === '' ? null : { questionId, equals: c['equals'] ?? null };
}

function aPregunta(id: string, datos: Record<string, unknown>): PreguntaDelPanel {
  const tipo = datos['type'];
  const destino = datos['target'];

  return {
    id,
    label: texto(datos['label']),
    helpText: texto(datos['helpText']),
    type: TIPOS_PREGUNTA.includes(tipo as TipoPregunta) ? (tipo as TipoPregunta) : 'text',
    options: opciones(datos['options']),
    required: datos['required'] === true,
    target: DESTINOS.includes(destino as PreguntaDelPanel['target'])
      ? (destino as PreguntaDelPanel['target'])
      : 'both',
    mapsTo: texto(datos['mapsTo']) || null,
    visibleIf: condicion(datos['visibleIf']),
    order: typeof datos['order'] === 'number' ? datos['order'] : 0,
    // Ausente es activa, igual que en el servidor.
    enabled: datos['enabled'] !== false,
    isSystem: datos['isSystem'] === true,
  };
}

/** Ordenadas como se van a enseñar: por `order`, y el id decide los empates. */
export function ordenarPreguntas(
  preguntas: readonly PreguntaDelPanel[],
): readonly PreguntaDelPanel[] {
  return preguntas.slice().sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

/**
 * El id de documento de una pregunta nueva.
 *
 * Legible y derivado de la etiqueta, como las de fábrica: así `visibleIf` y las
 * respuestas guardadas se pueden leer sin un diccionario delante. Con sufijo si
 * ya existe, porque el id es la clave de las respuestas y reutilizarlo mezclaría
 * las de dos preguntas distintas.
 */
export function idDePregunta(label: string, usados: readonly string[]): string {
  const base =
    label
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

export function crearPuertaPreguntasFirestore(): PuertaPreguntas {
  const db = inject(FIRESTORE);

  const ruta = (weddingId: string) => collection(db, 'weddings', weddingId, 'formQuestions');

  return {
    async listar(weddingId: string): Promise<ResultadoPreguntas> {
      try {
        const snap = await getDocs(ruta(weddingId));
        return {
          ok: true,
          preguntas: ordenarPreguntas(snap.docs.map((d) => aPregunta(d.id, d.data()))),
        };
      } catch (error) {
        return { ok: false, fallo: traducir(error) };
      }
    },

    async guardar(weddingId: string, datos: DatosPregunta): Promise<ResultadoEscritura> {
      try {
        const campos = {
          label: datos.label,
          helpText: datos.helpText,
          type: datos.type,
          options: datos.options.map((o) => ({ value: o.value, label: o.label })),
          required: datos.required,
          target: datos.target,
          visibleIf: datos.soloSiViene
            ? { questionId: PREGUNTA_DE_ASISTENCIA, equals: true }
            : null,
          enabled: datos.enabled,
          order: datos.order,
        };

        if (datos.id) {
          // `update` y no `set`: una de sistema conserva su `mapsTo` y su
          // `isSystem`, que la pareja no edita y las reglas no dejan tocar.
          await updateDoc(doc(ruta(weddingId), datos.id), campos);
        } else {
          const snap = await getDocs(ruta(weddingId));
          const id = idDePregunta(
            datos.label,
            snap.docs.map((d) => d.id),
          );
          await setDoc(doc(ruta(weddingId), id), { ...campos, mapsTo: null, isSystem: false });
        }

        return { ok: true };
      } catch (error) {
        return { ok: false, fallo: traducir(error) };
      }
    },

    async borrar(weddingId: string, id: string): Promise<ResultadoEscritura> {
      try {
        await deleteDoc(doc(ruta(weddingId), id));
        return { ok: true };
      } catch (error) {
        return { ok: false, fallo: traducir(error) };
      }
    },

    /** El orden que se ve, escrito de una vez: media lista reordenada es peor que nada. */
    async reordenar(weddingId: string, ids: readonly string[]): Promise<ResultadoEscritura> {
      try {
        const lote = writeBatch(db);
        ids.forEach((id, indice) => lote.update(doc(ruta(weddingId), id), { order: indice + 1 }));
        await lote.commit();
        return { ok: true };
      } catch (error) {
        return { ok: false, fallo: traducir(error) };
      }
    },
  };
}

/**
 * El error de Firestore, traducido.
 *
 * Exportada para poder probarla: en los tests de la pantalla la puerta va
 * doblada y esto no se ejecuta, que es justo por donde una vez salió un código
 * del SDK a la cara de la pareja.
 */
export function traducir(error: unknown): FalloPreguntas {
  const fallo = (error ?? {}) as { code?: string; message?: string };

  switch (fallo.code) {
    // Las reglas no dejan borrar una pregunta de sistema ni quitarle el
    // `isSystem`. Es lo único que la pareja puede intentar y no poder.
    case 'permission-denied':
      return { tipo: 'de-sistema' };

    case 'unavailable':
    case 'deadline-exceeded':
      return { tipo: 'red' };

    case 'unauthenticated':
      return { tipo: 'sin-permiso' };

    default:
      return { tipo: 'error', mensaje: fallo.message ?? 'Error desconocido' };
  }
}
