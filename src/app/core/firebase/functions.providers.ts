import {
  EnvironmentProviders,
  InjectionToken,
  inject,
  makeEnvironmentProviders,
} from '@angular/core';
import { Functions, getFunctions } from 'firebase/functions';
import { FIREBASE_APP, FUNCTIONS_REGION } from './firebase.providers';

export const FIREBASE_FUNCTIONS = new InjectionToken<Functions>('FIREBASE_FUNCTIONS');

export function provideFirebaseFunctions(): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: FIREBASE_FUNCTIONS,
      useFactory: (): Functions => getFunctions(inject(FIREBASE_APP), FUNCTIONS_REGION),
    },
  ]);
}
