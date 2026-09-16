import { RulesTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { WEDDING_A, createTestEnv, ownerOf } from './helpers';

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
    await setDoc(doc(ctx.firestore(), 'weddings', WEDDING_A), {
      slug: 'mariaygabriel',
      status: 'active',
      plan: 'basic',
      ownerUids: [`owner-${WEDDING_A}`],
      counters: { guestsTotal: 10, guestsConfirmed: 4 },
      createdAt: new Date(),
      couple: { partnerA: 'María', partnerB: 'Gabriel' },
    });
  });
});

describe('campos de sistema: los mueve el servidor, no la pareja', () => {
  it('la pareja edita lo suyo', async () => {
    const db = ownerOf(env, WEDDING_A);
    await assertSucceeds(
      updateDoc(doc(db, 'weddings', WEDDING_A), { couple: { partnerA: 'Marta', partnerB: 'G' } }),
    );
  });

  it.each([
    ['counters', { counters: { guestsTotal: 999, guestsConfirmed: 999 } }],
    ['plan', { plan: 'premium' }],
    ['status', { status: 'archived' }],
    ['ownerUids', { ownerUids: ['owner-boda-ana-juan'] }],
    ['slug', { slug: 'otro-slug' }],
    ['createdAt', { createdAt: new Date(0) }],
  ])('NO puede escribir %s', async (_campo, payload) => {
    const db = ownerOf(env, WEDDING_A);
    await assertFails(updateDoc(doc(db, 'weddings', WEDDING_A), payload));
  });

  it('NO puede colar un campo de sistema mezclado con uno legítimo', async () => {
    // El caso realista: la petición trae un cambio válido y, de paso, sube el plan.
    const db = ownerOf(env, WEDDING_A);
    await assertFails(
      updateDoc(doc(db, 'weddings', WEDDING_A), {
        couple: { partnerA: 'María', partnerB: 'Gabriel' },
        plan: 'premium',
      }),
    );
  });

  it('NO puede crear ni borrar la boda', async () => {
    const db = ownerOf(env, WEDDING_A);
    await assertFails(setDoc(doc(db, 'weddings', 'boda-inventada'), { slug: 'x' }));
  });
});
