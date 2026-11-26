import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';

import { crearPuertaTareasFirestore } from '../firebase/tareas-gateway.firestore';
import { PUERTA_TAREAS } from './tareas-gateway';

/** Las tareas, solo para la ruta del panel (D-18). */
export function provideTareas(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: PUERTA_TAREAS, useFactory: crearPuertaTareasFirestore },
  ]);
}
