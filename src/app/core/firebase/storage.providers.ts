import {
  EnvironmentProviders,
  InjectionToken,
  inject,
  makeEnvironmentProviders,
} from '@angular/core';
import { FirebaseStorage, getStorage } from 'firebase/storage';
import { FIREBASE_APP } from './firebase.providers';

export const FIREBASE_STORAGE = new InjectionToken<FirebaseStorage>('FIREBASE_STORAGE');

export function provideFirebaseStorage(): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: FIREBASE_STORAGE,
      useFactory: (): FirebaseStorage => getStorage(inject(FIREBASE_APP)),
    },
  ]);
}
