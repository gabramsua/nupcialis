import { RulesTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, getDocs, collection, setDoc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { GUEST_A1, WEDDING_A, createTestEnv, guestOf, ownerOf, superadmin } from './helpers';

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
    await setDoc(doc(db, 'weddings', WEDDING_A), { slug: WEDDING_A, status: 'active' });
    await setDoc(doc(db, 'weddings', WEDDING_A, 'guests', GUEST_A1), {
      fullName: 'María',
      phone: '+34600000000',
      phoneLast4: '0000',
    });
    await setDoc(doc(db, 'weddings', WEDDING_A, 'photos', 'foto1'), {
      audienceGroupId: 'universidad',
    });
    await setDoc(doc(db, 'weddings', WEDDING_A, 'quizResults', 'r1'), { points: 10 });
    await setDoc(doc(db, 'weddings', WEDDING_A, 'giftsReceived', 'g1'), { amount: 200 });
    await setDoc(doc(db, 'weddings', WEDDING_A, 'guestAccessLog', 'l1'), { ip: '1.2.3.4' });
  });
});

describe('guests: cerrada a todo el mundo', () => {
  // Si esta colección fuera legible desde el cliente, cualquiera se descargaría
  // la lista de invitados con sus teléfonos.
  it('ni siquiera la pareja la lee directamente', async () => {
    const db = ownerOf(env, WEDDING_A);
    await assertFails(getDoc(doc(db, 'weddings', WEDDING_A, 'guests', GUEST_A1)));
    await assertFails(getDocs(collection(db, 'weddings', WEDDING_A, 'guests')));
  });

  it('un invitado no lee ni su propio documento', async () => {
    const db = guestOf(env, WEDDING_A, GUEST_A1);
    await assertFails(getDoc(doc(db, 'weddings', WEDDING_A, 'guests', GUEST_A1)));
  });

  it('un invitado no lista la colección', async () => {
    const db = guestOf(env, WEDDING_A);
    await assertFails(getDocs(collection(db, 'weddings', WEDDING_A, 'guests')));
  });

  it('el superadmin tampoco la lee desde el cliente', async () => {
    const db = superadmin(env);
    await assertFails(getDocs(collection(db, 'weddings', WEDDING_A, 'guests')));
  });
});

describe('photos: cerrada a todo el mundo', () => {
  // La visibilidad depende del grupo de quien pregunta y eso solo se evalúa con
  // garantías en servidor. Una regla que dejara filtrar por audienceGroupId
  // seguiría permitiendo pedir explícitamente las del grupo restringido.
  it('un invitado no lista las fotos', async () => {
    const db = guestOf(env, WEDDING_A);
    await assertFails(getDocs(collection(db, 'weddings', WEDDING_A, 'photos')));
  });

  it('la pareja no las lee directamente', async () => {
    const db = ownerOf(env, WEDDING_A);
    await assertFails(getDoc(doc(db, 'weddings', WEDDING_A, 'photos', 'foto1')));
  });
});

describe('quizResults: se leen pero no se escriben', () => {
  it('un invitado lee el ranking', async () => {
    const db = guestOf(env, WEDDING_A);
    await assertSucceeds(getDoc(doc(db, 'weddings', WEDDING_A, 'quizResults', 'r1')));
  });

  it('un invitado NO se inventa su puntuación', async () => {
    const db = guestOf(env, WEDDING_A);
    await assertFails(
      setDoc(doc(db, 'weddings', WEDDING_A, 'quizResults', 'tramposo'), { points: 9999 }),
    );
  });

  it('ni la pareja escribe el ranking a mano', async () => {
    const db = ownerOf(env, WEDDING_A);
    await assertFails(setDoc(doc(db, 'weddings', WEDDING_A, 'quizResults', 'r2'), { points: 500 }));
  });
});

describe('giftsReceived: el dato más sensible del producto', () => {
  it('la pareja lo lee y lo escribe', async () => {
    const db = ownerOf(env, WEDDING_A);
    await assertSucceeds(getDoc(doc(db, 'weddings', WEDDING_A, 'giftsReceived', 'g1')));
    await assertSucceeds(
      setDoc(doc(db, 'weddings', WEDDING_A, 'giftsReceived', 'g2'), { amount: 100 }),
    );
  });

  it('un invitado NO ve cuánto ha regalado nadie', async () => {
    const db = guestOf(env, WEDDING_A);
    await assertFails(getDoc(doc(db, 'weddings', WEDDING_A, 'giftsReceived', 'g1')));
    await assertFails(getDocs(collection(db, 'weddings', WEDDING_A, 'giftsReceived')));
  });
});

describe('guestAccessLog: lo escribe el servidor', () => {
  it('la pareja lo lee', async () => {
    const db = ownerOf(env, WEDDING_A);
    await assertSucceeds(getDoc(doc(db, 'weddings', WEDDING_A, 'guestAccessLog', 'l1')));
  });

  it('nadie lo escribe desde el cliente', async () => {
    const db = ownerOf(env, WEDDING_A);
    await assertFails(
      setDoc(doc(db, 'weddings', WEDDING_A, 'guestAccessLog', 'l2'), { ip: '9.9.9.9' }),
    );
  });
});
