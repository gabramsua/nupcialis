import {
  EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  provideEnvironmentInitializer,
} from '@angular/core';
import { ReCaptchaEnterpriseProvider, initializeAppCheck } from 'firebase/app-check';

import { environment } from '../../../environments/environment';
import { EMULATORS, FIREBASE_APP } from './firebase.providers';

/**
 * App Check: demuestra que quien llama es nuestra aplicación y no un script.
 *
 * Es el requisito que sostiene la regla 3 —el acceso de invitado por nombre y
 * cuatro dígitos sería un objetivo de fuerza bruta trivial sin esto— y lo exigen
 * también las funciones de superadmin.
 *
 * **Proveedor: reCAPTCHA Enterprise**, no v3. La consola de Firebase ya solo
 * ofrece Enterprise al registrar una app nueva, y la documentación de Google
 * dice que es lo que hay que usar en integraciones nuevas. v3 sigue funcionando
 * y no está formalmente obsoleto, pero registrarlo hoy requiere una clave que la
 * consola no te deja crear. La clave tiene que ser **de tipo web y basada en
 * puntuación**: una de casilla («no soy un robot») haría aparecer un reto al
 * invitado, que es justo lo que no queremos en la web de una boda.
 *
 * Si algún día hubiera que volver a v3, es cambiar esta clase por
 * `ReCaptchaV3Provider`: el resto del fichero vale igual.
 *
 * **Se inicializa por ruta, no en el arranque.** `firebase/app-check` no es
 * enorme, pero el presupuesto de la web pública son 200 kB y el arranque ya se
 * lleva 76: entra en el chunk que de verdad va a llamar a una función. Lo único
 * que importa es que ocurra **antes** de la primera llamada, y proveerlo en la
 * ruta lo garantiza: los `providers` se resuelven antes de montar el componente.
 *
 * Si no hay clave configurada no se inicializa nada, y se avisa en consola. Es
 * deliberado: sin clave, inicializar App Check haría fallar **todas** las
 * llamadas en vez de solo las protegidas, y el desarrollo se volvería
 * imposible por un campo sin rellenar.
 */

let yaInicializado = false;

export function provideAppCheck(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideEnvironmentInitializer(() => {
      const app = inject(FIREBASE_APP);
      const emuladores = inject(EMULATORS);

      // El emulador no comprueba App Check, y las funciones tampoco lo exigen
      // dentro de él (ver `EXIGIR_APP_CHECK` en functions/src/firebase.ts).
      if (emuladores || yaInicializado) return;

      const clave = environment.appCheckSiteKey;
      if (!clave) {
        console.warn(
          '[App Check] Sin `appCheckSiteKey` en el entorno: no se inicializa.\n' +
            'Es la clave de reCAPTCHA Enterprise, distinta del `apiKey` y del\n' +
            '`appId` de Firebase. Sin ella las Cloud Functions responden 401\n' +
            'fuera del emulador. Ver docs/PUESTA-EN-MARCHA.md, bloque 7.',
        );
        return;
      }

      // Token de depuración en desarrollo. Sin esto, App Check con reCAPTCHA
      // rechaza `localhost`: no es un dominio que Google pueda verificar, y la
      // clave de producción no admite añadirlo. La consola imprime un token que
      // hay que registrar una vez en Firebase.
      if (!environment.production) {
        (self as unknown as Record<string, unknown>)['FIREBASE_APPCHECK_DEBUG_TOKEN'] = true;
      }

      initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(clave),
        // Renueva el token solo. El SDK no lo hace por defecto: sin esto caduca
        // y la pareja se encuentra errores raros a media tarde sin haber hecho
        // nada.
        isTokenAutoRefreshEnabled: true,
      });

      yaInicializado = true;
    }),
  ]);
}
