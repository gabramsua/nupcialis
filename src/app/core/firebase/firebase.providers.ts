import { EnvironmentProviders, InjectionToken, makeEnvironmentProviders } from '@angular/core';
import { FirebaseApp, initializeApp } from 'firebase/app';
import { AppEnvironment } from '../../../environments/environment.model';

/**
 * Capa de acceso a Firebase.
 *
 * Este directorio es el ÚNICO sitio del proyecto donde se importa `firebase/*`
 * (ver D-17 y la regla `no-restricted-imports` de eslint.config.js).
 *
 * IMPORTANTE — presupuesto de bundle. Solo `firebase/app` se carga con la
 * aplicación. Firestore, Auth, Storage y Functions se proveen **a nivel de
 * ruta**, en ficheros aparte, para que cada uno caiga en el chunk diferido que
 * lo necesita. Importarlos todos aquí metía 122 kB comprimidos en el arranque:
 * el 61% del presupuesto de 200 kB de la web pública, para código que un
 * invitado que solo mira la web no llega a usar.
 *
 * Si añades otro servicio de Firebase, hazlo en su propio fichero y proveelo
 * en la ruta que lo use. Nunca aquí.
 */

/** Región europea. Los datos no salen de la UE. Ver REQUISITOS §9.4. */
export const FUNCTIONS_REGION = 'europe-west1';

export interface EmulatorConfig {
  readonly host: string;
  readonly ports: {
    readonly auth: number;
    readonly firestore: number;
    readonly storage: number;
    readonly functions: number;
  };
}

export const FIREBASE_APP = new InjectionToken<FirebaseApp>('FIREBASE_APP');
export const EMULATORS = new InjectionToken<EmulatorConfig | null>('EMULATORS');

const DEFAULT_EMULATORS: EmulatorConfig = {
  host: '127.0.0.1',
  ports: { auth: 9099, firestore: 8080, storage: 9199, functions: 5001 },
};

export function provideFirebaseApp(env: AppEnvironment): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: FIREBASE_APP, useValue: initializeApp(env.firebase) },
    { provide: EMULATORS, useValue: env.useEmulators ? DEFAULT_EMULATORS : null },
  ]);
}
