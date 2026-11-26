import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';

import { crearPuertaPresupuestoFirestore } from '../firebase/presupuesto-gateway.firestore';
import { PUERTA_PRESUPUESTO } from './presupuesto-gateway';

/** El presupuesto, solo para la ruta del panel (D-18). */
export function providePresupuesto(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: PUERTA_PRESUPUESTO, useFactory: crearPuertaPresupuestoFirestore },
  ]);
}
