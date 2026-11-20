import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';

import { crearPuertaRespuestasFirebase } from '../firebase/respuestas-gateway.firebase';
import { PUERTA_RESPUESTAS } from './respuestas-gateway';

/** Las respuestas del formulario, solo para la ruta del panel (D-18). */
export function provideRespuestas(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: PUERTA_RESPUESTAS, useFactory: crearPuertaRespuestasFirebase },
  ]);
}
