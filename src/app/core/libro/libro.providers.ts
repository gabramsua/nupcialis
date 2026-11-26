import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';

import { crearPuertaLibroFirebase } from '../firebase/libro-gateway.firebase';
import { PUERTA_LIBRO } from './libro-gateway';

/** El libro de firmas, solo en la ruta que lo usa (D-18). */
export function provideLibro(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: PUERTA_LIBRO, useFactory: crearPuertaLibroFirebase },
  ]);
}
