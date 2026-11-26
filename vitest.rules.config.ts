import { defineConfig } from 'vitest/config';

/**
 * Batería de aislamiento multi-tenant contra el emulador de Firestore.
 *
 * Va en su propia configuración porque corre en Node, no en jsdom, y necesita
 * el emulador levantado. Se lanza con `npm run test:rules`, que se encarga de
 * arrancarlo y pararlo.
 */
export default defineConfig({
  test: {
    name: 'rules',
    include: ['tests/rules/**/*.spec.ts'],
    environment: 'node',
    globals: true,
    testTimeout: 20_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
});
