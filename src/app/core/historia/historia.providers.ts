import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';

import { crearPuertaHistoriaFirebase } from '../firebase/historia-gateway.firebase';
import { PUERTA_HISTORIA } from './historia-gateway';

/** «Nuestra historia», solo para la ruta del panel (D-18). */
export function provideHistoria(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: PUERTA_HISTORIA, useFactory: crearPuertaHistoriaFirebase },
  ]);
}
