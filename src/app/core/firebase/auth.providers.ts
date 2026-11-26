import {
  EnvironmentProviders,
  InjectionToken,
  inject,
  makeEnvironmentProviders,
} from '@angular/core';
import { Auth, getAuth } from 'firebase/auth';
import { FIREBASE_APP } from './firebase.providers';

export const FIREBASE_AUTH = new InjectionToken<Auth>('FIREBASE_AUTH');

export function provideFirebaseAuth(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: FIREBASE_AUTH, useFactory: (): Auth => getAuth(inject(FIREBASE_APP)) },
  ]);
}
