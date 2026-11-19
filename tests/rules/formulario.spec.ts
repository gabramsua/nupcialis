import { RulesTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

import { WEDDING_A, WEDDING_B, anonymous, createTestEnv, guestOf, ownerOf } from './helpers';

/**
 * formQuestions: la pareja las escribe, pero no puede borrar las de sistema.
 *
 * Esta es la única invariante del formulario que se puede defender en una regla,
 * y merece la pena: si alguien borra la pregunta del menú, la exportación al
 * catering se queda sin datos y nadie sabe por qué. Desactivarla sí se puede
 * —entonces es una decisión, no un accidente—.
 *
 * Lo demás —que una respuesta no pueda tocar `active` ni `groupIds`— no se
 * defiende aquí: lo defiende la lista blanca de `dominio/formulario.ts`, porque
 * las respuestas no las escribe el cliente.
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
      await setDoc(doc(db, 'weddings', wid, 'formQuestions', 'menu'), {
        label: 'Menú',
        type: 'select',
        mapsTo: 'menu',
        enabled: true,
        isSystem: true,
      });
      await setDoc(doc(db, 'weddings', wid, 'formQuestions', 'cancion'), {
        label: '¿Qué canción no puede faltar?',
        type: 'text',
        mapsTo: null,
        enabled: true,
        isSystem: false,
      });
    }
  });
});

describe('lectura', () => {
  it('la pareja lee sus preguntas, que es lo que edita en el panel', async () => {
    const db = ownerOf(env, WEDDING_A);
    await assertSucceeds(getDocs(collection(db, 'weddings', WEDDING_A, 'formQuestions')));
  });

  /**
   * El invitado las lee por las reglas, aunque la web use `getRsvpForm`: así el
   * día que al formulario le sobre la función, las reglas ya están puestas.
   */
  it('un invitado de la boda las lee', async () => {
    const db = guestOf(env, WEDDING_A);
    await assertSucceeds(getDoc(doc(db, 'weddings', WEDDING_A, 'formQuestions', 'menu')));
  });

  it('un anónimo no: el formulario es de los invitados', async () => {
    const db = anonymous(env);
    await assertFails(getDoc(doc(db, 'weddings', WEDDING_A, 'formQuestions', 'menu')));
  });

  it('la pareja de A no lee las preguntas de B', async () => {
    const db = ownerOf(env, WEDDING_A);
    await assertFails(getDocs(collection(db, 'weddings', WEDDING_B, 'formQuestions')));
  });
});

describe('escritura de la pareja', () => {
  it('añade una pregunta suya', async () => {
    const db = ownerOf(env, WEDDING_A);
    await assertSucceeds(
      setDoc(doc(db, 'weddings', WEDDING_A, 'formQuestions', 'nueva'), {
        label: '¿Vienes el sábado de after?',
        type: 'boolean',
        enabled: true,
        isSystem: false,
      }),
    );
  });

  it('reetiqueta y desactiva una de sistema: eso sí se puede', async () => {
    const db = ownerOf(env, WEDDING_A);
    await assertSucceeds(
      updateDoc(doc(db, 'weddings', WEDDING_A, 'formQuestions', 'menu'), {
        label: 'Qué vas a cenar',
        enabled: false,
      }),
    );
  });

  it('borra una pregunta que ha añadido ella', async () => {
    const db = ownerOf(env, WEDDING_A);
    await assertSucceeds(deleteDoc(doc(db, 'weddings', WEDDING_A, 'formQuestions', 'cancion')));
  });

  /** La de verdad: borrar la del menú deja al catering sin datos. */
  it('NO borra una de sistema', async () => {
    const db = ownerOf(env, WEDDING_A);
    await assertFails(deleteDoc(doc(db, 'weddings', WEDDING_A, 'formQuestions', 'menu')));
  });

  it('NO le quita el isSystem para borrarla en dos pasos', async () => {
    const db = ownerOf(env, WEDDING_A);
    await assertFails(
      updateDoc(doc(db, 'weddings', WEDDING_A, 'formQuestions', 'menu'), { isSystem: false }),
    );
  });

  it('la pareja de A no escribe en las preguntas de B', async () => {
    const db = ownerOf(env, WEDDING_A);
    await assertFails(
      setDoc(doc(db, 'weddings', WEDDING_B, 'formQuestions', 'nueva'), { label: 'Hola' }),
    );
  });
});

describe('escritura del invitado', () => {
  it('un invitado NO cambia las preguntas de su propia boda', async () => {
    const db = guestOf(env, WEDDING_A);
    await assertFails(
      updateDoc(doc(db, 'weddings', WEDDING_A, 'formQuestions', 'menu'), { required: false }),
    );
  });

  it('un invitado NO se inventa una pregunta', async () => {
    const db = guestOf(env, WEDDING_A);
    await assertFails(
      setDoc(doc(db, 'weddings', WEDDING_A, 'formQuestions', 'mia'), { label: 'Mía' }),
    );
  });
});
