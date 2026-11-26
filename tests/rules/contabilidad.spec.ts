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
 * Cobros, marcas de recordatorio, proveedores y solicitudes de la HOME (S1.3e,
 * S1.3f, F0.7.8, D-68).
 *
 * Es la contabilidad de Gabriel: una pareja que pudiera leer `payments` vería lo
 * que han pagado las demás, y una que pudiera escribirla se pondría el cobro al
 * día. Las dos colecciones son del superadmin para leer y de nadie para escribir
 * desde el cliente.
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
    await setDoc(doc(db, 'payments', 'p1'), {
      weddingId: WEDDING_A,
      amountCents: 29900,
      status: 'paid',
    });
    await setDoc(doc(db, 'partners', 'p1'), {
      name: 'Invitaciones Pepe',
      code: 'pepe',
      wholesalePrice: { basic: 3000, extended: 6000 },
      active: true,
    });
    await setDoc(doc(db, 'homeRequests', 'p1'), {
      names: 'Ana y Leo',
      email: 'ana@ejemplo.com',
      status: 'new',
    });
    await setDoc(doc(db, 'reminderMarks', `${WEDDING_A}__encuesta`), {
      weddingId: WEDDING_A,
      key: 'encuesta',
    });
  });
});

describe.each([
  'payments/p1',
  'partners/p1',
  'homeRequests/p1',
  `reminderMarks/${WEDDING_A}__encuesta`,
])('%s', (ruta) => {
  const [coleccion, id] = ruta.split('/') as [string, string];

  it('el superadmin la lee', async () => {
    await assertSucceeds(getDoc(doc(superadmin(env), coleccion, id)));
    await assertSucceeds(getDocs(collection(superadmin(env), coleccion)));
  });

  it('la propia pareja de esa boda NO la lee', async () => {
    await assertFails(getDoc(doc(ownerOf(env, WEDDING_A), coleccion, id)));
    await assertFails(getDocs(collection(ownerOf(env, WEDDING_A), coleccion)));
  });

  it('un invitado y un anónimo NO la leen', async () => {
    await assertFails(getDoc(doc(guestOf(env, WEDDING_A, GUEST_A1), coleccion, id)));
    await assertFails(getDoc(doc(anonymous(env), coleccion, id)));
  });

  it('nadie la escribe desde el cliente, ni el superadmin', async () => {
    for (const db of [superadmin(env), ownerOf(env, WEDDING_A), anonymous(env)]) {
      await assertFails(setDoc(doc(db, coleccion, 'nuevo'), { weddingId: WEDDING_A }));
      await assertFails(updateDoc(doc(db, coleccion, id), { weddingId: 'otra' }));
      await assertFails(deleteDoc(doc(db, coleccion, id)));
    }
  });
});

describe('homeRequestLimits: interno', () => {
  // El contador por IP no lo lee ni el superadmin: solo lo toca el servidor.
  it('nadie lo lee ni lo escribe desde el cliente', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'homeRequestLimits', 'abc'), { desde: 1, n: 5 });
    });
    for (const db of [superadmin(env), ownerOf(env, WEDDING_A), anonymous(env)]) {
      await assertFails(getDoc(doc(db, 'homeRequestLimits', 'abc')));
      await assertFails(setDoc(doc(db, 'homeRequestLimits', 'abc'), { desde: 0, n: 0 }));
    }
  });
});

describe('homeRequests: un anónimo no puede mandarse una solicitud desde el cliente', () => {
  it('solo entra por la función (con límite por IP y aviso)', async () => {
    await assertFails(
      setDoc(doc(anonymous(env), 'homeRequests', 'mia'), { names: 'Bot', email: 'b@b.com' }),
    );
  });
});
