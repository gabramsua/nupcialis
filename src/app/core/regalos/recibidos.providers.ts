import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';

import { crearPuertaRecibidosFirestore } from '../firebase/recibidos-gateway.firestore';
import { PUERTA_RECIBIDOS } from './recibidos-gateway';

/** El cuaderno de lo recibido, solo en la ruta del panel que lo usa (D-18). */
export function provideRecibidos(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: PUERTA_RECIBIDOS, useFactory: crearPuertaRecibidosFirestore },
  ]);
}
