import { RulesTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { WEDDING_A, anonymous, createTestEnv, guestOf, ownerOf, superadmin } from './helpers';

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
    await setDoc(doc(db, 'slugs', 'mariaygabriel'), { weddingId: WEDDING_A, status: 'active' });
    await setDoc(doc(db, 'weddings', WEDDING_A), {
      slug: WEDDING_A,
      status: 'active',
      plan: 'premium',
      counters: { guestsTotal: 137 },
    });
    await setDoc(doc(db, 'weddings', WEDDING_A, 'public', 'site'), {
      coupleNames: 'María y Gabriel',
    });
    await setDoc(doc(db, 'auditLog', 'a1'), { action: 'provisionWedding' });
  });
});

describe('lo único que ve un visitante anónimo', () => {
  it('lee el índice de slugs, que es como se resuelve el tenant', async () => {
    const db = anonymous(env);
    await assertSucceeds(getDoc(doc(db, 'slugs', 'mariaygabriel')));
  });

  it('lee la proyección pública de la boda', async () => {
    const db = anonymous(env);
    await assertSucceeds(getDoc(doc(db, 'weddings', WEDDING_A, 'public', 'site')));
  });

  it('NO lee el documento de la boda', async () => {
    // Aquí viven los contadores, el plan contratado y la configuración interna.
    // Por eso existe la proyección pública como documento aparte.
    const db = anonymous(env);
    await assertFails(getDoc(doc(db, 'weddings', WEDDING_A)));
  });

  it('NO escribe en el índice de slugs', async () => {
    const db = anonymous(env);
    await assertFails(setDoc(doc(db, 'slugs', 'mariaygabriel'), { weddingId: 'otra' }));
  });

  it('NO escribe la proyección pública', async () => {
    const db = anonymous(env);
    await assertFails(
      setDoc(doc(db, 'weddings', WEDDING_A, 'public', 'site'), { coupleNames: 'Hackeado' }),
    );
  });

  it('NO lee el log de auditoría', async () => {
    const db = anonymous(env);
    await assertFails(getDocs(collection(db, 'auditLog')));
  });
});

describe('la pareja tampoco puede tocar lo que mueve el servidor', () => {
  it('NO reescribe el índice de slugs', async () => {
    const db = ownerOf(env, WEDDING_A);
    await assertFails(setDoc(doc(db, 'slugs', 'mariaygabriel'), { weddingId: WEDDING_A }));
  });

  it('NO escribe la proyección pública a mano', async () => {
    const db = ownerOf(env, WEDDING_A);
    await assertFails(
      setDoc(doc(db, 'weddings', WEDDING_A, 'public', 'site'), { coupleNames: 'X' }),
    );
  });

  it('NO lee el log de auditoría', async () => {
    const db = ownerOf(env, WEDDING_A);
    await assertFails(getDocs(collection(db, 'auditLog')));
  });
});

describe('log de auditoría', () => {
  it('el superadmin lo lee', async () => {
    const db = superadmin(env);
    await assertSucceeds(getDoc(doc(db, 'auditLog', 'a1')));
  });

  it('nadie lo escribe desde el cliente, ni el superadmin', async () => {
    const db = superadmin(env);
    await assertFails(setDoc(doc(db, 'auditLog', 'a2'), { action: 'inventada' }));
  });
});

describe('un invitado identificado', () => {
  it('lee la proyección pública', async () => {
    const db = guestOf(env, WEDDING_A);
    await assertSucceeds(getDoc(doc(db, 'weddings', WEDDING_A, 'public', 'site')));
  });

  it('NO lee el documento de la boda con sus contadores y su plan', async () => {
    const db = guestOf(env, WEDDING_A);
    await assertFails(getDoc(doc(db, 'weddings', WEDDING_A)));
  });
});
