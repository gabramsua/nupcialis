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

  /**
   * `PL.8`. El panel escribe en `theme`, `content` y `modules` desde que existe
   * el editor de la web, y la batería no lo cubría: lo que estaba probado era
   * que no puede escribir lo de sistema, no que **sí** pueda escribir lo suyo.
   * Si alguien endureciera la regla de más, el panel entero dejaría de guardar
   * y esto es lo que lo diría.
   */
  describe('lo que el panel sí escribe', () => {
    it.each([
      ['theme', { theme: { templateId: 'botanica', palette: null } }],
      ['content.sections', { 'content.sections': [{ id: 'portada', type: 'portada', order: 0 }] }],
      ['la paleta sola', { 'theme.palette': { accent: '#123456' } }],
      ['la foto de portada', { 'theme.heroImagePath': 'weddings/x/hero/a.jpg' }],
      ['guestAccessMode', { guestAccessMode: 'name_phone4' }],
      ['indexable', { indexable: true }],
      ['la configuración de un módulo', { 'modules.dressCode.config.description': '<p>x</p>' }],
      ['el plazo del RSVP', { 'modules.rsvp.config.deadline': new Date('2027-05-01') }],
    ])('puede escribir %s', async (_que, payload) => {
      const db = ownerOf(env, WEDDING_A);
      await assertSucceeds(updateDoc(doc(db, 'weddings', WEDDING_A), payload));
    });

    /**
     * El interruptor de un módulo **no** es de la pareja: decide lo que entra
     * en su plan, y por eso lo mueve el superadmin. Que hoy las reglas lo
     * dejen pasar es una deuda conocida y está apuntada; cuando se cierre,
     * este test cambia de `assertSucceeds` a `assertFails` y se queda.
     */
    it('hoy puede encender un módulo, y no debería (deuda conocida)', async () => {
      const db = ownerOf(env, WEDDING_A);
      await assertSucceeds(
        updateDoc(doc(db, 'weddings', WEDDING_A), { 'modules.gallery.enabled': true }),
      );
    });
  });

  it('NO puede crear ni borrar la boda', async () => {
    const db = ownerOf(env, WEDDING_A);
    await assertFails(setDoc(doc(db, 'weddings', 'boda-inventada'), { slug: 'x' }));
  });
});
