import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';

import {
  crearAlmacenFotosPersonas,
  crearPuertaPersonasFirestore,
} from '../firebase/personas-gateway.firestore';
import { ALMACEN_FOTOS_PERSONAS, PUERTA_PERSONAS } from './personas-gateway';

/** Las personas importantes, solo para la ruta del panel (D-18). */
export function providePersonas(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: PUERTA_PERSONAS, useFactory: crearPuertaPersonasFirestore },
    { provide: ALMACEN_FOTOS_PERSONAS, useFactory: crearAlmacenFotosPersonas },
  ]);
}
