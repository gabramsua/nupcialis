import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';

import { crearPuertaRegalosFirebase } from '../firebase/regalos-gateway.firebase';
import { PUERTA_REGALOS } from './regalos-gateway';

/** Los regalos, solo en la ruta que los usa (D-18). */
export function provideRegalos(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: PUERTA_REGALOS, useFactory: crearPuertaRegalosFirebase },
  ]);
}
