import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';

import { crearPuertaLibroPanelFirestore } from '../firebase/libro-panel-gateway.firestore';
import { PUERTA_LIBRO_PANEL } from './libro-panel-gateway';

/** El libro de firmas del panel, solo para su ruta (D-18). */
export function provideLibroDelPanel(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: PUERTA_LIBRO_PANEL, useFactory: crearPuertaLibroPanelFirestore },
  ]);
}
