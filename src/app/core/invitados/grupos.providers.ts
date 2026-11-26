import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';

import { crearPuertaGruposFirebase } from '../firebase/grupos-gateway.firebase';
import { PUERTA_GRUPOS } from './grupos-gateway';

/** Los grupos de invitados, solo para la ruta del panel (D-18). */
export function provideGrupos(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: PUERTA_GRUPOS, useFactory: crearPuertaGruposFirebase },
  ]);
}
