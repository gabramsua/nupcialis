import { EnvironmentProviders, InjectionToken, inject, makeEnvironmentProviders } from '@angular/core';
import { FirebaseStorage, connectStorageEmulator, getStorage } from 'firebase/storage';
import { EMULATORS, FIREBASE_APP } from './firebase.providers';

export const FIREBASE_STORAGE = new InjectionToken<FirebaseStorage>('FIREBASE_STORAGE');

let emulatorConnected = false;

export function provideFirebaseStorage(): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: FIREBASE_STORAGE,
      useFactory: (): FirebaseStorage => {
        const storage = getStorage(inject(FIREBASE_APP));
        const emulators = inject(EMULATORS);
        if (emulators && !emulatorConnected) {
          connectStorageEmulator(storage, emulators.host, emulators.ports.storage);
          emulatorConnected = true;
        }
        return storage;
      },
    },
  ]);
}
