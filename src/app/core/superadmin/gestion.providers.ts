import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';

import { crearPuertaGestionFirebase } from '../firebase/gestion-gateway.firebase';
import { PUERTA_GESTION } from './gestion-gateway';

/** La gestión por boda, solo para la ruta del superadmin. */
export function provideGestion(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: PUERTA_GESTION, useFactory: crearPuertaGestionFirebase },
  ]);
}
