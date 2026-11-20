import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';

import { crearPuertaPlaylistPanelFirestore } from '../firebase/playlist-panel-gateway.firestore';
import { PUERTA_PLAYLIST_PANEL } from './playlist-panel-gateway';

/** La playlist del panel, solo para su ruta (D-18). */
export function providePlaylistDelPanel(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: PUERTA_PLAYLIST_PANEL, useFactory: crearPuertaPlaylistPanelFirestore },
  ]);
}
