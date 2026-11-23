import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';

import { crearPuertaLlamadasFirebase } from '../firebase/llamadas-gateway.firebase';
import { PUERTA_LLAMADAS } from './llamadas-gateway';

/** Llamadas genéricas a Cloud Functions: en la ruta del superadmin y en la del panel. */
export function provideLlamadas(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: PUERTA_LLAMADAS, useFactory: crearPuertaLlamadasFirebase },
  ]);
}
