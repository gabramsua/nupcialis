import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';

import { crearPuertaCatalogosFirebase } from '../firebase/catalogos-gateway.firebase';
import { PUERTA_CATALOGOS } from './catalogos-gateway';

/** Los catálogos del superadmin: en su ruta, y en la del quiz de la pareja. */
export function provideCatalogos(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: PUERTA_CATALOGOS, useFactory: crearPuertaCatalogosFirebase },
  ]);
}
