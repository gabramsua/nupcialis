import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { crearPuertaAuthFirebase } from '../firebase/auth-gateway.firebase';
import { PUERTA_AUTH } from './auth-gateway';
import { SessionStore } from './session.store';

/**
 * Autenticación, para las rutas que la necesitan.
 *
 * Va por ruta y no en el arranque, como todo lo de Firebase (D-18): la web
 * pública de una boda no carga Auth hasta que hace falta.
 */
export function provideAuth(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: PUERTA_AUTH, useFactory: crearPuertaAuthFirebase },
    SessionStore,
  ]);
}
