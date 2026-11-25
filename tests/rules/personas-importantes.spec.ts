import { RulesTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

import { WEDDING_A, WEDDING_B, anonymous, createTestEnv, guestOf, ownerOf } from './helpers';

/**
 * `weddingParty` (personas importantes, §8.12): las escribe y las lee la pareja
 * y **nadie más**, y no se puede guardar una foto sin consentimiento.
 *
 * Son datos de terceros —un teléfono, una foto— y lo que el invitado ve le
 * llega por la proyección pública, que no lleva el teléfono y solo lleva la
 * foto si el consentimiento está registrado. Antes de D-61 la regla dejaba
 * leerla directamente a cualquier invitado con sesión, teléfono incluido.
 */

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await createTestEnv();
});
afterAll(async () => {
  await env.cleanup();
});

const PERSONA = {
  displayName: 'Carmen Ruiz',
  role: 'Madrina',
  side: 'A',
  bio: '',
  phone: '600112233',
  photoPath: null,
  photoUrl: null,
  photoConsent: false,
  visibleToGuests: true,
  order: 1,
};

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    for (const wid of [WEDDING_A, WEDDING_B]) {
      await setDoc(doc(db, 'weddings', wid), { slug: wid, status: 'active' });
      await setDoc(doc(db, 'weddings', wid, 'weddingParty', 'madrina'), PERSONA);
    }
  });
});

describe('weddingParty: quién lee', () => {
  it('la pareja lee las suyas', async () => {
    const db = ownerOf(env, WEDDING_A);
    await assertSucceeds(getDocs(collection(db, 'weddings', WEDDING_A, 'weddingParty')));
    await assertSucceeds(getDoc(doc(db, 'weddings', WEDDING_A, 'weddingParty', 'madrina')));
  });

  it('un invitado de esa boda NO las lee: tienen teléfono', async () => {
    const db = guestOf(env, WEDDING_A);
    await assertFails(getDoc(doc(db, 'weddings', WEDDING_A, 'weddingParty', 'madrina')));
    await assertFails(getDocs(collection(db, 'weddings', WEDDING_A, 'weddingParty')));
  });

  it('un anónimo NO las lee', async () => {
    const db = anonymous(env);
    await assertFails(getDoc(doc(db, 'weddings', WEDDING_A, 'weddingParty', 'madrina')));
  });

  it('la pareja de otra boda NO las lee', async () => {
    const db = ownerOf(env, WEDDING_B);
    await assertFails(getDoc(doc(db, 'weddings', WEDDING_A, 'weddingParty', 'madrina')));
  });
});

describe('weddingParty: quién escribe', () => {
  it('la pareja crea y edita a una persona sin foto', async () => {
    const db = ownerOf(env, WEDDING_A);
    await assertSucceeds(
      setDoc(doc(db, 'weddings', WEDDING_A, 'weddingParty', 'padrino'), {
        ...PERSONA,
        displayName: 'Antonio',
        role: 'Padrino',
      }),
    );
    await assertSucceeds(
      updateDoc(doc(db, 'weddings', WEDDING_A, 'weddingParty', 'madrina'), { bio: 'La tía' }),
    );
  });

  it('un invitado NO escribe', async () => {
    const db = guestOf(env, WEDDING_A);
    await assertFails(
      updateDoc(doc(db, 'weddings', WEDDING_A, 'weddingParty', 'madrina'), { bio: 'x' }),
    );
  });

  it('la pareja de otra boda NO escribe ni borra', async () => {
    const db = ownerOf(env, WEDDING_B);
    await assertFails(
      updateDoc(doc(db, 'weddings', WEDDING_A, 'weddingParty', 'madrina'), { bio: 'x' }),
    );
    await assertFails(deleteDoc(doc(db, 'weddings', WEDDING_A, 'weddingParty', 'madrina')));
  });

  it('la pareja borra a una persona', async () => {
    const db = ownerOf(env, WEDDING_A);
    await assertSucceeds(deleteDoc(doc(db, 'weddings', WEDDING_A, 'weddingParty', 'madrina')));
  });
});

describe('weddingParty: la foto exige consentimiento (D-61)', () => {
  const FOTO = {
    photoPath: `weddings/${WEDDING_A}/party/1700000000000.jpg`,
    photoUrl: 'https://firebasestorage.googleapis.com/v0/b/x/o/foto.jpg',
  };

  it('NO se puede crear una persona con foto y sin consentimiento', async () => {
    const db = ownerOf(env, WEDDING_A);
    await assertFails(
      setDoc(doc(db, 'weddings', WEDDING_A, 'weddingParty', 'nueva'), {
        ...PERSONA,
        ...FOTO,
        photoConsent: false,
      }),
    );
    // Y tampoco si el campo falta del todo.
    const sinCampo: Record<string, unknown> = { ...PERSONA, ...FOTO };
    delete sinCampo['photoConsent'];
    await assertFails(setDoc(doc(db, 'weddings', WEDDING_A, 'weddingParty', 'nueva'), sinCampo));
  });

  it('NO se puede añadir una foto a una persona existente sin consentimiento', async () => {
    const db = ownerOf(env, WEDDING_A);
    await assertFails(
      updateDoc(doc(db, 'weddings', WEDDING_A, 'weddingParty', 'madrina'), { ...FOTO }),
    );
  });

  it('con consentimiento sí se guarda la foto', async () => {
    const db = ownerOf(env, WEDDING_A);
    await assertSucceeds(
      updateDoc(doc(db, 'weddings', WEDDING_A, 'weddingParty', 'madrina'), {
        ...FOTO,
        photoConsent: true,
      }),
    );
  });

  it('NO se puede retirar el consentimiento dejando la foto puesta', async () => {
    const db = ownerOf(env, WEDDING_A);
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'weddings', WEDDING_A, 'weddingParty', 'conFoto'), {
        ...PERSONA,
        ...FOTO,
        photoConsent: true,
      });
    });
    await assertFails(
      updateDoc(doc(db, 'weddings', WEDDING_A, 'weddingParty', 'conFoto'), {
        photoConsent: false,
      }),
    );
    // Quitar la foto y el consentimiento a la vez, sí.
    await assertSucceeds(
      updateDoc(doc(db, 'weddings', WEDDING_A, 'weddingParty', 'conFoto'), {
        photoPath: null,
        photoUrl: null,
        photoConsent: false,
      }),
    );
  });
});
