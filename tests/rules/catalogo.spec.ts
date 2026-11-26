import { RulesTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  GUEST_A1,
  WEDDING_A,
  anonymous,
  createTestEnv,
  guestOf,
  ownerOf,
  superadmin,
} from './helpers';

/**
 * Catálogos del superadmin: tareas, presupuesto y preguntas sugeridas.
 *
 * Tareas y presupuesto son de Gabriel. Las preguntas sugeridas las lee también
 * cualquier pareja (para el «Añadir a nuestro quiz»), pero nadie las escribe
 * desde el cliente, ni el propio superadmin: pasan por la función que valida.
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
    await setDoc(doc(db, 'catalog/tasks/items/t1'), { title: 'Reservar la finca' });
    await setDoc(doc(db, 'catalog/budget/items/b1'), { concept: 'Finca' });
    await setDoc(doc(db, 'catalog/quiz/items/q1'), { text: '¿Dónde nos conocimos?' });
  });
});

describe.each(['tasks/items/t1', 'budget/items/b1'])('catalog/%s', (ruta) => {
  it('el superadmin lo lee', async () => {
    await assertSucceeds(getDoc(doc(superadmin(env), `catalog/${ruta}`)));
  });

  it('la pareja, un invitado y un anónimo NO lo leen', async () => {
    await assertFails(getDoc(doc(ownerOf(env, WEDDING_A), `catalog/${ruta}`)));
    await assertFails(getDoc(doc(guestOf(env, WEDDING_A, GUEST_A1), `catalog/${ruta}`)));
    await assertFails(getDoc(doc(anonymous(env), `catalog/${ruta}`)));
  });
});

describe('catalog/quiz', () => {
  it('lo leen el superadmin y cualquier pareja', async () => {
    await assertSucceeds(getDocs(collection(superadmin(env), 'catalog/quiz/items')));
    await assertSucceeds(getDocs(collection(ownerOf(env, WEDDING_A), 'catalog/quiz/items')));
  });

  it('un invitado y un anónimo NO lo leen', async () => {
    await assertFails(getDoc(doc(guestOf(env, WEDDING_A, GUEST_A1), 'catalog/quiz/items/q1')));
    await assertFails(getDoc(doc(anonymous(env), 'catalog/quiz/items/q1')));
  });
});

describe('escritura', () => {
  it('nadie escribe un catálogo desde el cliente, ni el superadmin', async () => {
    for (const tipo of ['tasks', 'budget', 'quiz']) {
      for (const db of [superadmin(env), ownerOf(env, WEDDING_A), anonymous(env)]) {
        await assertFails(setDoc(doc(db, `catalog/${tipo}/items/nuevo`), { x: 1 }));
        await assertFails(updateDoc(doc(db, `catalog/${tipo}/items/${tipo[0]}1`), { x: 1 }));
        await assertFails(deleteDoc(doc(db, `catalog/${tipo}/items/${tipo[0]}1`)));
      }
    }
  });
});
