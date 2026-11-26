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
  strangerWithAccount,
  superadmin,
} from './helpers';

/**
 * La HOME de nupcialis.com (`platform/home`).
 *
 * Es la portada pública del producto: la lee cualquiera, sin sesión, porque es
 * lo primero que ve una pareja que llega a la web. Pero **no la escribe nadie
 * desde el cliente**, ni el superadmin: el HTML del editor pasa por `saveHome`,
 * que lo sanea (regla de oro 5). Y la colección `platform` no es un cajón de
 * sastre: solo `home` se puede leer.
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
    await setDoc(doc(db, 'platform/home'), { content: { template: 'luz' } });
    await setDoc(doc(db, 'platform/interno'), { secreto: 'no se ve' });
  });
});

describe('platform/home: lectura', () => {
  it('la lee cualquiera, también sin sesión', async () => {
    for (const db of [
      anonymous(env),
      strangerWithAccount(env),
      ownerOf(env, WEDDING_A),
      guestOf(env, WEDDING_A, GUEST_A1),
      superadmin(env),
    ]) {
      await assertSucceeds(getDoc(doc(db, 'platform/home')));
    }
  });

  it('cualquier otro documento de platform está cerrado', async () => {
    for (const db of [anonymous(env), ownerOf(env, WEDDING_A), superadmin(env)]) {
      await assertFails(getDoc(doc(db, 'platform/interno')));
    }
  });

  it('no se puede listar la colección', async () => {
    for (const db of [anonymous(env), ownerOf(env, WEDDING_A), superadmin(env)]) {
      await assertFails(getDocs(collection(db, 'platform')));
    }
  });
});

describe('platform/home: escritura', () => {
  it('nadie la escribe desde el cliente, ni el superadmin', async () => {
    for (const db of [
      anonymous(env),
      strangerWithAccount(env),
      ownerOf(env, WEDDING_A),
      guestOf(env, WEDDING_A, GUEST_A1),
      superadmin(env),
    ]) {
      await assertFails(setDoc(doc(db, 'platform/home'), { content: { template: 'noche' } }));
      await assertFails(updateDoc(doc(db, 'platform/home'), { content: 'x' }));
      await assertFails(deleteDoc(doc(db, 'platform/home')));
      await assertFails(setDoc(doc(db, 'platform/nuevo'), { x: 1 }));
    }
  });
});
