/**
 * El banco de preguntas, por Firestore directamente.
 *
 * `quizQuestions` está abierta a la pareja y **cerrada al invitado**, que es
 * exactamente lo que protege el juego: las preguntas llevan dentro la respuesta
 * correcta, y un invitado que pudiera leer la colección no necesitaría hacer
 * trampa, le bastaría con mirar (regla de oro 4).
 *
 * Frontera de confianza (D-19): lo que vuelve se comprueba antes de salir.
 */

import { inject } from '@angular/core';
import { collection, deleteDoc, doc, getDocs, setDoc, updateDoc } from 'firebase/firestore';

import { completa, type PreguntaDelPanel } from '../../features/public-site/quiz/quiz';
import {
  type DatosPregunta,
  type FalloQuizPanel,
  type PuertaPreguntasQuiz,
  type ResultadoEscritura,
  type ResultadoPreguntas,
} from '../quiz/quiz-admin-gateway';
import { FIRESTORE } from './firestore.providers';

export function crearPuertaPreguntasQuizFirestore(): PuertaPreguntasQuiz {
  const db = inject(FIRESTORE);
  const ruta = (weddingId: string) => collection(db, 'weddings', weddingId, 'quizQuestions');

  return {
    async listar(weddingId: string): Promise<ResultadoPreguntas> {
      try {
        const snap = await getDocs(ruta(weddingId));

        // `completa` devuelve `null` para las que están a medio escribir, y
        // aquí **sí** se quieren: la pantalla de la pareja es el único sitio
        // donde se ven, y es donde se arreglan.
        const preguntas = snap.docs.map((d) => aPregunta(d.id, d.data()));
        return { ok: true, preguntas: preguntas.sort((a, b) => a.order - b.order) };
      } catch (error) {
        return { ok: false, fallo: traducir(error) };
      }
    },

    async guardar(weddingId: string, datos: DatosPregunta): Promise<ResultadoEscritura> {
      try {
        const campos = {
          text: datos.text,
          correctAnswer: datos.correctAnswer,
          wrongAnswers: [...datos.wrongAnswers],
          difficulty: datos.difficulty,
          hint: datos.hint,
          enabled: datos.enabled,
          order: datos.order,
        };

        if (datos.id) {
          await updateDoc(doc(ruta(weddingId), datos.id), campos);
        } else {
          await setDoc(doc(ruta(weddingId)), campos);
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
  };
}

/**
 * Lo que hay en el documento, completo o a medias.
 *
 * `completa` del dominio es la que decide si una pregunta se puede jugar; esta
 * se queda con lo que haya para poder pintarlo y arreglarlo.
 */
function aPregunta(id: string, datos: Record<string, unknown>): PreguntaDelPanel {
  const entera = completa(id, datos);
  if (entera) return entera;

  const falsas = Array.isArray(datos['wrongAnswers']) ? datos['wrongAnswers'] : [];
  const dificultad = datos['difficulty'];

  return {
    id,
    text: typeof datos['text'] === 'string' ? datos['text'] : '',
    correctAnswer: typeof datos['correctAnswer'] === 'string' ? datos['correctAnswer'] : '',
    wrongAnswers: falsas.map((f) => (typeof f === 'string' ? f : '')),
    difficulty: dificultad === 2 || dificultad === 3 ? dificultad : 1,
    hint: typeof datos['hint'] === 'string' && datos['hint'] !== '' ? datos['hint'] : null,
    enabled: datos['enabled'] !== false,
    order: typeof datos['order'] === 'number' ? datos['order'] : 0,
  };
}

export function traducir(error: unknown): FalloQuizPanel {
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
