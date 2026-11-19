import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';

import { crearPuertaEnlacesFirebase } from '../firebase/enlaces-gateway.firebase';
import { PUERTA_ENLACES } from './enlaces-gateway';

/** El enlace de invitación, solo para la ruta del panel (D-18). */
export function provideEnlaces(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: PUERTA_ENLACES, useFactory: crearPuertaEnlacesFirebase },
  ]);
}
