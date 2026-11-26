import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';

import { crearPuertaEstadisticasFirebase } from '../firebase/estadisticas-gateway.firebase';
import { PUERTA_ESTADISTICAS } from './estadisticas-gateway';

/** Las estadísticas, solo para la ruta del superadmin (D-18). */
export function provideEstadisticas(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: PUERTA_ESTADISTICAS, useFactory: crearPuertaEstadisticasFirebase },
  ]);
}
