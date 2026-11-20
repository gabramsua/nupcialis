import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';

import { crearPuertaInvitadosFirebase } from '../firebase/invitados-gateway.firebase';
import { PUERTA_INVITADOS } from './invitados-gateway';

/**
 * La lista de invitados, solo para la ruta del panel.
 *
 * Como todo lo de Firebase, se provee por ruta y no en el arranque (D-18): la
 * web pública no carga nada de esto, porque un invitado no puede listar a los
 * demás invitados ni aunque quisiera (regla 2).
 */
export function provideInvitados(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: PUERTA_INVITADOS, useFactory: crearPuertaInvitadosFirebase },
  ]);
}
