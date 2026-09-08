import { EnvironmentProviders, InjectionToken, inject, makeEnvironmentProviders } from '@angular/core';
import { Functions, connectFunctionsEmulator, getFunctions } from 'firebase/functions';
import { EMULATORS, FIREBASE_APP, FUNCTIONS_REGION } from './firebase.providers';

export const FIREBASE_FUNCTIONS = new InjectionToken<Functions>('FIREBASE_FUNCTIONS');

let emulatorConnected = false;

export function provideFirebaseFunctions(): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: FIREBASE_FUNCTIONS,
      useFactory: (): Functions => {
        const functions = getFunctions(inject(FIREBASE_APP), FUNCTIONS_REGION);
        const emulators = inject(EMULATORS);
        if (emulators && !emulatorConnected) {
          connectFunctionsEmulator(functions, emulators.host, emulators.ports.functions);
          emulatorConnected = true;
        }
        return functions;
      },
    },
  ]);
}
