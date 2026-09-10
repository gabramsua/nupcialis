import {
  EnvironmentProviders,
  InjectionToken,
  inject,
  makeEnvironmentProviders,
} from '@angular/core';
import { Auth, connectAuthEmulator, getAuth } from 'firebase/auth';
import { EMULATORS, FIREBASE_APP } from './firebase.providers';

export const FIREBASE_AUTH = new InjectionToken<Auth>('FIREBASE_AUTH');

let emulatorConnected = false;

export function provideFirebaseAuth(): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: FIREBASE_AUTH,
      useFactory: (): Auth => {
        const auth = getAuth(inject(FIREBASE_APP));
        const emulators = inject(EMULATORS);
        if (emulators && !emulatorConnected) {
          connectAuthEmulator(auth, `http://${emulators.host}:${emulators.ports.auth}`, {
            disableWarnings: true,
          });
          emulatorConnected = true;
        }
        return auth;
      },
    },
  ]);
}
