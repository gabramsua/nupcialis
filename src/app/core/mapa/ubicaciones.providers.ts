import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';

import { crearPuertaUbicacionesFirestore } from '../firebase/ubicaciones-gateway.firestore';
import { PUERTA_UBICACIONES } from './ubicaciones-gateway';

/** Las ubicaciones, solo para la ruta del panel (D-18). */
export function provideUbicaciones(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: PUERTA_UBICACIONES, useFactory: crearPuertaUbicacionesFirestore },
  ]);
}
