import { EnvironmentProviders, InjectionToken, inject, makeEnvironmentProviders } from '@angular/core';
import { Firestore, connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { EMULATORS, FIREBASE_APP } from './firebase.providers';

export const FIRESTORE = new InjectionToken<Firestore>('FIRESTORE');

// `getFirestore(app)` devuelve siempre la misma instancia, así que si dos rutas
// proveen Firestore el emulador se conectaría dos veces y eso revienta. El
// módulo es un singleton: este flag basta.
let emulatorConnected = false;

export function provideFirestore(): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: FIRESTORE,
      useFactory: (): Firestore => {
        const db = getFirestore(inject(FIREBASE_APP));
        const emulators = inject(EMULATORS);
        if (emulators && !emulatorConnected) {
          connectFirestoreEmulator(db, emulators.host, emulators.ports.firestore);
          emulatorConnected = true;
        }
        return db;
      },
    },
  ]);
}
