import { RulesTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { WEDDING_A, WEDDING_B, createTestEnv, ownerOf, strangerWithAccount } from './helpers';

/**
 * Esta es LA batería.
 *
 * Es lo que sustituye al aislamiento por bases de datos separadas: si estos
 * tests pasan, el aislamiento es demostrable; si no existen, estamos confiando
 * en que las reglas están bien escritas. Ver docs/REQUISITOS.md §6.
 */

let env: RulesTestEnvironment;

/** Colecciones que la pareja gestiona desde su panel. */
const COLECCIONES_DE_LA_PAREJA = [
  'guestGroups',
  'tables',
  'locations',
  'faqs',
  'accommodations',
  'weddingParty',
  'timelineEvents',
  'formQuestions',
  'gifts',
  'quizQuestions',
  'budgetItems',
  'vendors',
  'checklistItems',
  'giftsReceived',
] as const;

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
      await setDoc(doc(db, 'weddings', wid), {
        slug: wid,
        status: 'active',
        plan: 'basic',
        counters: { guestsTotal: 0 },
        ownerUids: [`owner-${wid}`],
      });
      for (const col of COLECCIONES_DE_LA_PAREJA) {
        await setDoc(doc(db, 'weddings', wid, col, 'item1'), { nombre: 'algo' });
      }
    }
  });
});

describe('aislamiento entre bodas', () => {
  it('la pareja lee el documento de su boda', async () => {
    const db = ownerOf(env, WEDDING_A);
    await assertSucceeds(getDoc(doc(db, 'weddings', WEDDING_A)));
  });

  it('la pareja de A NO lee el documento de la boda B', async () => {
    const db = ownerOf(env, WEDDING_A);
    await assertFails(getDoc(doc(db, 'weddings', WEDDING_B)));
  });

  it('la pareja de A NO escribe en el documento de la boda B', async () => {
    const db = ownerOf(env, WEDDING_A);
    await assertFails(setDoc(doc(db, 'weddings', WEDDING_B), { slug: 'secuestrada' }));
  });

  describe.each(COLECCIONES_DE_LA_PAREJA)('colección %s', (col) => {
    it('la pareja la lee en su propia boda', async () => {
      const db = ownerOf(env, WEDDING_A);
      await assertSucceeds(getDoc(doc(db, 'weddings', WEDDING_A, col, 'item1')));
    });

    it('la pareja de A NO la lee en la boda B', async () => {
      const db = ownerOf(env, WEDDING_A);
      await assertFails(getDoc(doc(db, 'weddings', WEDDING_B, col, 'item1')));
    });

    it('la pareja de A NO escribe en ella en la boda B', async () => {
      const db = ownerOf(env, WEDDING_A);
      await assertFails(setDoc(doc(db, 'weddings', WEDDING_B, col, 'item1'), { nombre: 'x' }));
    });

    it('un usuario con cuenta pero sin claims no la toca', async () => {
      const db = strangerWithAccount(env);
      await assertFails(getDoc(doc(db, 'weddings', WEDDING_A, col, 'item1')));
      await assertFails(setDoc(doc(db, 'weddings', WEDDING_A, col, 'item1'), { nombre: 'x' }));
    });
  });
});
