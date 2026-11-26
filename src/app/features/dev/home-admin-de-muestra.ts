import { makeEnvironmentProviders, type EnvironmentProviders } from '@angular/core';

import { PUERTA_HOME_ADMIN, type PuertaHomeAdmin } from '../../core/home/home-gateway';
import { sanearHome, type ContenidoHome } from '../home/home';

/**
 * El editor de la HOME sin Firebase: guarda en memoria y «sube» imágenes como
 * URL locales. **Solo en desarrollo.** Sirve para probar el editor y la vista
 * previa sin ser superadmin ni tener Storage.
 */
function puerta(): PuertaHomeAdmin {
  let guardado: ContenidoHome | null = null;
  let n = 0;

  return {
    async leer() {
      return { ok: true, datos: guardado };
    },
    async guardar(contenido) {
      guardado = sanearHome(contenido);
      return { ok: true, datos: guardado };
    },
    async restaurar() {
      guardado = null;
      return { ok: true, datos: null };
    },
    async subirImagen(fichero) {
      n += 1;
      return {
        ok: true,
        datos: { path: `platform/home/${n}.jpg`, url: URL.createObjectURL(fichero), alt: '' },
      };
    },
    async borrarImagen() {
      return;
    },
  };
}

export function provideHomeAdminDeMuestra(): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: PUERTA_HOME_ADMIN, useFactory: puerta }]);
}
