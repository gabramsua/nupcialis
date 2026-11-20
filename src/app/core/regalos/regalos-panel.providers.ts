import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';

import { crearPuertaRegalosPanelFirestore } from '../firebase/regalos-panel-gateway.firestore';
import { PUERTA_REGALOS_PANEL } from './regalos-panel-gateway';

/** La lista de regalos de la pareja, solo en la ruta del panel (D-18). */
export function provideRegalosDelPanel(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: PUERTA_REGALOS_PANEL, useFactory: crearPuertaRegalosPanelFirestore },
  ]);
}
