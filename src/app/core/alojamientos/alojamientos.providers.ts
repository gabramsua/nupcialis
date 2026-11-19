import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';

import { crearPuertaAlojamientosFirestore } from '../firebase/alojamientos-gateway.firestore';
import { PUERTA_ALOJAMIENTOS } from './alojamientos-gateway';

/** Los alojamientos, solo para la ruta del panel (D-18). */
export function provideAlojamientos(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: PUERTA_ALOJAMIENTOS, useFactory: crearPuertaAlojamientosFirestore },
  ]);
}
