import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';

import { crearPuertaAccesosFirebase } from '../firebase/accesos-gateway.firebase';
import { PUERTA_ACCESOS } from './accesos-gateway';

/** El registro de accesos, solo para la ruta del panel (D-18). */
export function provideAccesos(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: PUERTA_ACCESOS, useFactory: crearPuertaAccesosFirebase },
  ]);
}
