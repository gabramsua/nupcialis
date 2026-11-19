import { RulesTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

import { WEDDING_A, WEDDING_B, anonymous, createTestEnv, guestOf, ownerOf } from './helpers';

/**
 * El quiz: las tres colecciones están cerradas al invitado.
 *
 * Esta batería existe por el agujero que tenían las reglas antes de escribirla:
 * `quizQuestions` dejaba leer a cualquier invitado con sesión, y **cada
 * pregunta lleva dentro su respuesta correcta**. Con eso, la corrección en
 * servidor (regla de oro 4) no protegía nada: el tramposo no necesitaba
 * falsear la puntuación, le bastaba con leer las respuestas antes de contestar
 * desde la consola del navegador.
 *
 * Lo que el invitado necesita para jugar se lo dan las funciones: `startQuiz`
 * le manda las opciones barajadas sin decir cuál es la buena, `submitQuiz`
 * corrige, y `listQuizRanking` devuelve la tabla con los nombres ya acortados
 * a «Pepe G.» (`D-11`).
 */

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await createTestEnv();
});
afterAll(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    for (const wid of [WEDDING_A, WEDDING_B]) {
      await setDoc(doc(db, 'weddings', wid), { slug: wid, status: 'active' });
      await setDoc(doc(db, 'weddings', wid, 'quizQuestions', 'donde'), {
        text: '¿Dónde se conocieron?',
        correctAnswer: 'En Cádiz',
        wrongAnswers: ['En Madrid', 'En Oviedo', 'En Bilbao'],
        difficulty: 1,
        enabled: true,
        order: 1,
      });
      await setDoc(doc(db, 'weddings', wid, 'quizGames', 'partida-1'), {
        guestId: 'invitado-a1',
        preguntas: [{ id: 'donde', correctAnswer: 'En Cádiz' }],
        submitted: false,
      });
      await setDoc(doc(db, 'weddings', wid, 'quizResults', 'r1'), {
        guestId: 'invitado-a1',
        fullName: 'Pepe García Fernández',
        points: 120,
        elapsedMs: 45000,
      });
    }
  });
});

describe('quizQuestions: la respuesta correcta no sale de la pareja', () => {
  it('la pareja las lee y las escribe', async () => {
    const db = ownerOf(env, WEDDING_A);
    await assertSucceeds(getDocs(collection(db, 'weddings', WEDDING_A, 'quizQuestions')));
    await assertSucceeds(
      setDoc(doc(db, 'weddings', WEDDING_A, 'quizQuestions', 'nueva'), { text: '¿Y?' }),
    );
  });

  /** El test que importa de este fichero. */
  it('un invitado NO puede leer las preguntas, porque traen la respuesta', async () => {
    const db = guestOf(env, WEDDING_A, 'invitado-a1');

    await assertFails(getDocs(collection(db, 'weddings', WEDDING_A, 'quizQuestions')));
    await assertFails(getDoc(doc(db, 'weddings', WEDDING_A, 'quizQuestions', 'donde')));
  });

  it('un anónimo tampoco', async () => {
    const db = anonymous(env);
    await assertFails(getDocs(collection(db, 'weddings', WEDDING_A, 'quizQuestions')));
  });

  it('la pareja de otra boda no ve las preguntas de esta', async () => {
    const db = ownerOf(env, WEDDING_B);
    await assertFails(getDocs(collection(db, 'weddings', WEDDING_A, 'quizQuestions')));
  });
});

describe('quizGames: una partida en curso no es de nadie más que de la función', () => {
  it('ni el invitado que la juega puede leerla', async () => {
    const db = guestOf(env, WEDDING_A, 'invitado-a1');
    await assertFails(getDoc(doc(db, 'weddings', WEDDING_A, 'quizGames', 'partida-1')));
  });

  it('ni la pareja, ni para escribirla', async () => {
    const db = ownerOf(env, WEDDING_A);
    await assertFails(getDoc(doc(db, 'weddings', WEDDING_A, 'quizGames', 'partida-1')));
    await assertFails(
      setDoc(doc(db, 'weddings', WEDDING_A, 'quizGames', 'inventada'), { guestId: 'x' }),
    );
  });

  /** Marcarla como no entregada sería poder reenviarla corrigiendo fallos. */
  it('nadie puede desmarcar una partida ya entregada', async () => {
    const db = guestOf(env, WEDDING_A, 'invitado-a1');
    await assertFails(
      updateDoc(doc(db, 'weddings', WEDDING_A, 'quizGames', 'partida-1'), { submitted: false }),
    );
  });
});

describe('quizResults: la puntuación la escribe el servidor', () => {
  it('la pareja lee el historial de su boda', async () => {
    const db = ownerOf(env, WEDDING_A);
    await assertSucceeds(getDocs(collection(db, 'weddings', WEDDING_A, 'quizResults')));
  });

  /** Guardan el nombre completo; el ranking del invitado lo acorta (D-11). */
  it('un invitado NO lee los resultados a pelo', async () => {
    const db = guestOf(env, WEDDING_A, 'invitado-a1');
    await assertFails(getDocs(collection(db, 'weddings', WEDDING_A, 'quizResults')));
  });

  it('nadie escribe una puntuación, ni la pareja ni el invitado', async () => {
    for (const db of [ownerOf(env, WEDDING_A), guestOf(env, WEDDING_A, 'invitado-a1')]) {
      await assertFails(
        setDoc(doc(db, 'weddings', WEDDING_A, 'quizResults', 'trampa'), {
          guestId: 'invitado-a1',
          points: 99999,
        }),
      );
      await assertFails(
        updateDoc(doc(db, 'weddings', WEDDING_A, 'quizResults', 'r1'), { points: 99999 }),
      );
    }
  });

  it('la pareja de otra boda no ve estos resultados', async () => {
    const db = ownerOf(env, WEDDING_B);
    await assertFails(getDocs(collection(db, 'weddings', WEDDING_A, 'quizResults')));
  });
});
