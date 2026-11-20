import { RulesTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

import { WEDDING_A, WEDDING_B, anonymous, createTestEnv, guestOf, ownerOf } from './helpers';

/**
 * `faqs`: las escribe y las lee la pareja, y **nadie más**.
 *
 * El invitado las ve, pero no de aquí: las lee de la proyección pública, donde
 * llegan ya saneadas y solo las que tienen respuesta escrita (§8.9). Dos
 * motivos para cerrarlas:
 *
 * 1. **En una boda abierta no hay sesión de invitado**, así que una regla que
 *    dependiera de `isGuestOf` dejaría la web sin preguntas justo en el modo
 *    por defecto.
 * 2. Una pregunta **apagada o a medio escribir** es trabajo en curso de la
 *    pareja. Que no se publique en la web y sí se pueda leer con una consulta
 *    directa sería una puerta falsa.
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
      await setDoc(doc(db, 'weddings', wid, 'faqs', 'parking'), {
        question: '¿Hay aparcamiento?',
        answer: '<p>Sí</p>',
        enabled: true,
        order: 1,
      });
      // La que todavía no tiene respuesta: no se publica, y tampoco se lee.
      await setDoc(doc(db, 'weddings', wid, 'faqs', 'bus'), {
        question: '¿Habrá autobús?',
        answer: '',
        enabled: true,
        order: 2,
      });
    }
  });
});

describe('faqs: quién lee', () => {
  it('la pareja lee las suyas, también las que están a medias', async () => {
    const db = ownerOf(env, WEDDING_A);

    await assertSucceeds(getDocs(collection(db, 'weddings', WEDDING_A, 'faqs')));
    await assertSucceeds(getDoc(doc(db, 'weddings', WEDDING_A, 'faqs', 'bus')));
  });

  /** Las ve en la web, desde la proyección pública, no desde aquí. */
  it('un invitado de la boda no las lee directamente', async () => {
    const db = guestOf(env, WEDDING_A);

    await assertFails(getDocs(collection(db, 'weddings', WEDDING_A, 'faqs')));
    await assertFails(getDoc(doc(db, 'weddings', WEDDING_A, 'faqs', 'parking')));
  });

  it('un anónimo tampoco', async () => {
    const db = anonymous(env);

    await assertFails(getDoc(doc(db, 'weddings', WEDDING_A, 'faqs', 'parking')));
  });

  it('la pareja de A no lee las de B', async () => {
    const db = ownerOf(env, WEDDING_A);

    await assertFails(getDoc(doc(db, 'weddings', WEDDING_B, 'faqs', 'parking')));
  });
});

describe('faqs: quién escribe', () => {
  it('la pareja escribe las suyas', async () => {
    const db = ownerOf(env, WEDDING_A);

    await assertSucceeds(
      setDoc(doc(db, 'weddings', WEDDING_A, 'faqs', 'nueva'), {
        question: '¿Se puede ir en taxi?',
        answer: '<p>Sí</p>',
        enabled: true,
        order: 3,
      }),
    );
  });

  it('un invitado no escribe ninguna', async () => {
    const db = guestOf(env, WEDDING_A);

    await assertFails(
      setDoc(doc(db, 'weddings', WEDDING_A, 'faqs', 'colada'), { question: 'x', answer: 'y' }),
    );
  });

  it('la pareja de A no escribe en las de B', async () => {
    const db = ownerOf(env, WEDDING_A);

    await assertFails(
      setDoc(doc(db, 'weddings', WEDDING_B, 'faqs', 'colada'), { question: 'x', answer: 'y' }),
    );
  });
});
