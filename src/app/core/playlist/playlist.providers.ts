import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';

import { crearPuertaPlaylistFirebase } from '../firebase/playlist-gateway.firebase';
import { PUERTA_PLAYLIST } from './playlist-gateway';

/** La playlist, solo en la ruta que la usa (D-18). */
export function providePlaylist(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: PUERTA_PLAYLIST, useFactory: crearPuertaPlaylistFirebase },
  ]);
}
