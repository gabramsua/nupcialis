import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { crearPuertaAltaFirebase } from '../firebase/alta-gateway.firebase';
import { PUERTA_ALTA } from './alta-gateway';

/**
 * El alta de bodas, solo para la ruta de superadmin.
 *
 * Como todo lo de Firebase, se provee por ruta y no en el arranque (D-18): ni la
 * web pública ni el panel de la pareja cargan esto, porque no pueden usarlo.
 */
export function provideAlta(): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: PUERTA_ALTA, useFactory: crearPuertaAltaFirebase }]);
}
