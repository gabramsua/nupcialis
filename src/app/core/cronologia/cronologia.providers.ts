import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';

import { crearPuertaCronologiaFirestore } from '../firebase/cronologia-gateway.firestore';
import { PUERTA_CRONOLOGIA } from './cronologia-gateway';

/** La cronología del día, solo para la ruta del panel (D-18). */
export function provideCronologia(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: PUERTA_CRONOLOGIA, useFactory: crearPuertaCronologiaFirestore },
  ]);
}
