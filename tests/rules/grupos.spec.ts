import { RulesTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { WEDDING_A, WEDDING_B, createTestEnv, guestOf, ownerOf, anonymous } from './helpers';

/**
 * guestGroups: se lee, pero no se escribe desde el cliente.
 *
 * Antes la pareja los escribía directamente. Se cerró porque un grupo
 * restringido parte la audiencia de la galería (§8.5), y cambiarlo sin mirar a
 * sus miembros puede dejar a alguien en dos restringidos; borrarlo sin mirar
 * deja invitados apuntando a un grupo que no existe. Ninguna de las dos cosas se
 * puede comprobar en una regla, porque los invitados están cerrados.
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
      await setDoc(doc(db, 'weddings', wid, 'guestGroups', 'uni'), {
        name: 'Universidad',
        photoAudience: 'restricted',
      });
    }
  });
});

describe('guestGroups: lectura', () => {
  it('la pareja lee sus grupos', async () => {
    const db = ownerOf(env, WEDDING_A);
    await assertSucceeds(getDocs(collection(db, 'weddings', WEDDING_A, 'guestGroups')));
  });

  it('un invitado de la boda los lee: la galería le dice en qué grupo publica', async () => {
    const db = guestOf(env, WEDDING_A);
    await assertSucceeds(getDoc(doc(db, 'weddings', WEDDING_A, 'guestGroups', 'uni')));
  });

  it('la pareja de A no lee los grupos de B', async () => {
    const db = ownerOf(env, WEDDING_A);
    await assertFails(getDocs(collection(db, 'weddings', WEDDING_B, 'guestGroups')));
  });

  it('un anónimo no los lee', async () => {
    const db = anonymous(env);
    await assertFails(getDoc(doc(db, 'weddings', WEDDING_A, 'guestGroups', 'uni')));
  });
});

describe('guestGroups: escritura, solo por función', () => {
  it('la pareja NO crea un grupo desde el navegador', async () => {
    const db = ownerOf(env, WEDDING_A);
    await assertFails(
      setDoc(doc(db, 'weddings', WEDDING_A, 'guestGroups', 'nuevo'), { name: 'Primos' }),
    );
  });

  it('la pareja NO pasa un grupo a público saltándose la función', async () => {
    const db = ownerOf(env, WEDDING_A);
    await assertFails(
      updateDoc(doc(db, 'weddings', WEDDING_A, 'guestGroups', 'uni'), { photoAudience: 'public' }),
    );
  });

  it('la pareja NO lo borra dejando invitados colgando', async () => {
    const db = ownerOf(env, WEDDING_A);
    await assertFails(deleteDoc(doc(db, 'weddings', WEDDING_A, 'guestGroups', 'uni')));
  });

  it('un invitado tampoco, claro', async () => {
    const db = guestOf(env, WEDDING_A);
    await assertFails(
      updateDoc(doc(db, 'weddings', WEDDING_A, 'guestGroups', 'uni'), { name: 'Hackeado' }),
    );
  });
});
