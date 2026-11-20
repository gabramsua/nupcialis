import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';

import { crearPuertaPreguntasFirestore } from '../firebase/preguntas-gateway.firestore';
import { PUERTA_PREGUNTAS } from './preguntas-gateway';

/** Las preguntas del formulario, solo para la ruta del panel (D-18). */
export function providePreguntas(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: PUERTA_PREGUNTAS, useFactory: crearPuertaPreguntasFirestore },
  ]);
}
