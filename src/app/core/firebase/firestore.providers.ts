import {
  EnvironmentProviders,
  InjectionToken,
  inject,
  makeEnvironmentProviders,
} from '@angular/core';
import { Firestore, getFirestore } from 'firebase/firestore';
import { FIREBASE_APP } from './firebase.providers';

export const FIRESTORE = new InjectionToken<Firestore>('FIRESTORE');

export function provideFirestore(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: FIRESTORE, useFactory: (): Firestore => getFirestore(inject(FIREBASE_APP)) },
  ]);
}
