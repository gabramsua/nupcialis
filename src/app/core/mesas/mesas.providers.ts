import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';

import { crearPuertaMesasFirestore } from '../firebase/mesas-gateway.firestore';
import { crearPuertaSentarFirebase } from '../firebase/mesas-sentar-gateway.firebase';
import { PUERTA_MESAS, PUERTA_SENTAR } from './mesas-gateway';

/** Las mesas, solo en la ruta del panel que las usa (D-18). */
export function provideMesas(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: PUERTA_MESAS, useFactory: crearPuertaMesasFirestore },
    { provide: PUERTA_SENTAR, useFactory: crearPuertaSentarFirebase },
  ]);
}
