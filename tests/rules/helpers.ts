import { readFileSync } from 'node:fs';
import { RulesTestEnvironment, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import type { Firestore } from 'firebase/firestore';

export const PROJECT_ID = 'nupcialis-rules-test';

/** Dos bodas distintas. Todo el aislamiento se demuestra cruzando estas dos. */
export const WEDDING_A = 'boda-maria-gabriel';
export const WEDDING_B = 'boda-ana-juan';

export const GUEST_A1 = 'invitado-a1';
export const GUEST_A2 = 'invitado-a2';

/**
 * `@firebase/rules-unit-testing` trae su propia copia de las declaraciones de
 * Firestore, estructuralmente incompatible con las de `firebase/firestore`
 * aunque en tiempo de ejecución sea el mismo objeto. El puente va aquí, en un
 * solo sitio y explicado, y no repetido en cada helper: si algún día deja de
 * hacer falta, se quita de una vez.
 */
function asFirestore(db: unknown): Firestore {
  return db as Firestore;
}

export async function createTestEnv(): Promise<RulesTestEnvironment> {
  return initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
}

/** Un miembro de la pareja. El weddingId va en el claim, nunca en la petición. */
export function ownerOf(env: RulesTestEnvironment, weddingId: string): Firestore {
  return asFirestore(
    env.authenticatedContext(`owner-${weddingId}`, { weddingId, role: 'owner' }).firestore(),
  );
}

/** Un invitado identificado, con su guestId en el token. */
export function guestOf(
  env: RulesTestEnvironment,
  weddingId: string,
  guestId = GUEST_A1,
): Firestore {
  return asFirestore(
    env.authenticatedContext(`guest-${guestId}`, { weddingId, role: 'guest', guestId }).firestore(),
  );
}

export function superadmin(env: RulesTestEnvironment): Firestore {
  return asFirestore(env.authenticatedContext('gabriel', { superadmin: true }).firestore());
}

/** Visitante sin sesión: alguien que abre el enlace de la boda. */
export function anonymous(env: RulesTestEnvironment): Firestore {
  return asFirestore(env.unauthenticatedContext().firestore());
}

/**
 * Un usuario autenticado sin claims de boda. Importa: representa a cualquiera
 * que se cree una cuenta en Firebase Auth y pruebe a leer datos ajenos.
 */
export function strangerWithAccount(env: RulesTestEnvironment): Firestore {
  return asFirestore(env.authenticatedContext('desconocido', {}).firestore());
}
