import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';

import { crearPuertaGaleriaFirebase } from '../firebase/galeria-gateway.firebase';
import { PUERTA_GALERIA } from './galeria-gateway';

/** La galería, solo en la ruta que la usa (D-18). */
export function provideGaleria(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: PUERTA_GALERIA, useFactory: crearPuertaGaleriaFirebase },
  ]);
}
