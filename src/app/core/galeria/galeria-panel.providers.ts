import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';

import { crearPuertaGaleriaPanelFirebase } from '../firebase/galeria-panel-gateway.firebase';
import { PUERTA_GALERIA_PANEL } from './galeria-panel-gateway';

/** La galería de la pareja, solo en la ruta del panel que la usa (D-18). */
export function provideGaleriaDelPanel(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: PUERTA_GALERIA_PANEL, useFactory: crearPuertaGaleriaPanelFirebase },
  ]);
}
