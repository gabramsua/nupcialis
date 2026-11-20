import {
  EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  provideEnvironmentInitializer,
} from '@angular/core';
import {
  ReCaptchaEnterpriseProvider,
  getToken,
  initializeAppCheck,
  type AppCheck,
} from 'firebase/app-check';

import { environment } from '../../../environments/environment';
import { FIREBASE_APP } from './firebase.providers';

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

const CLAVE_GUARDADA = 'np-appcheck-debug-token';

/**
 * El token de depuración de este origen.
 *
 * **El problema que resuelve.** El SDK, con `true`, genera un token aleatorio y
 * lo guarda en el almacenamiento del navegador, que está separado por origen:
 * `mms.localhost` no comparte nada con `localhost` ni con `otraboda.localhost`.
 * Cada subdominio con el que se pruebe genera el suyo, y hay que registrar cada
 * uno a mano en la consola de Firebase o responde 401. Con una boda de prueba
 * por semana, eso es una visita a la consola por semana.
 *
 * Así que se admite **fijarlo por la URL**: `?appcheck=<uuid>` lo guarda para
 * ese origen y no hace falta volver a ponerlo. Se registra **un** token en
 * Firebase y se reparte por los subdominios con el parámetro.
 *
 * No va en el código ni en el fichero de entorno a propósito: un token de
 * depuración **salta App Check entero**, y este repositorio es público.
 * Devolver `true` cuando no hay ninguno guardado mantiene el comportamiento de
 * siempre para quien no quiera complicarse.
 */
function tokenDeDepuracion(): string | true {
  let guardado: string | null;

  try {
    const url = new URL(self.location.href);
    const puesto = url.searchParams.get('appcheck');
    if (puesto) {
      localStorage.setItem(CLAVE_GUARDADA, puesto);

      // **El parámetro se queda en la barra**, y es a propósito. Se intentó
      // quitarlo con `history.replaceState`: esto corre mientras el router
      // resuelve la ruta, y en cuanto termina, él reescribe la URL desde su
      // propio estado y lo devuelve. Con un `setTimeout` tampoco: la navegación
      // inicial termina después. Pelearse con el router por estética no
      // compensa, y esto es un token de desarrollo en `localhost`: hace falta
      // una vez por subdominio y a partir de ahí se navega sin él.
    }
    guardado = localStorage.getItem(CLAVE_GUARDADA);
  } catch {
    // Almacenamiento bloqueado (ventana privada, cookies de terceros). Se cae
    // al token automático, que sigue funcionando en este origen.
    return true;
  }

  if (guardado) {
    console.info(
      `[App Check] Usando el token de depuración fijado para ${self.location.origin}.\n` +
        `Para cambiarlo: añade ?appcheck=<uuid> a la URL. Para quitarlo:\n` +
        `localStorage.removeItem('${CLAVE_GUARDADA}')`,
    );
    return guardado;
  }

  console.info(
    `[App Check] Modo depuración en ${self.location.origin}.\n` +
      'Firebase imprime debajo un token nuevo que vale SOLO para este origen.\n' +
      'Regístralo en Firebase → App Check → Apps → tu app → Administrar tokens\n' +
      'de depuración. Si ya tienes uno registrado, es más rápido reutilizarlo:\n' +
      `abre esta misma página con ?appcheck=<uuid> y se queda guardado aquí.`,
  );
  return true;
}

/**
 * Dice, en claro, que el token de depuración de este origen no está registrado.
 *
 * Sin esto el síntoma es un `403` de `exchangeDebugToken` en la consola, que no
 * dice qué hacer, seguido de un `401` en toda llamada a una función: el panel
 * «no carga» y no hay nada en pantalla que explique por qué. Solo en
 * desarrollo, que es donde existe el token de depuración.
 */
async function avisarSiNoEstaRegistrado(appCheck: AppCheck): Promise<void> {
  const explicacion =
    `[App Check] ${self.location.origin}: el token de depuración NO está registrado en Firebase.\n` +
    'Hasta que lo esté, toda llamada a una Cloud Function responderá 401 y el panel no cargará.\n' +
    'Dos salidas:\n' +
    '  1. Reutiliza el que ya tengas registrado: abre esta página con\n' +
    '     ?appcheck=<tu-uuid-registrado>  (se guarda para este subdominio).\n' +
    '  2. Registra el token que Firebase imprime arriba: Consola de Firebase →\n' +
    '     App Check → Apps → tu app → ⋮ → Administrar tokens de depuración.\n' +
    'Si el token SÍ está registrado y sigue el 403, mira las restricciones de la\n' +
    'clave de API (Google Cloud → Credenciales): tienen que permitir\n' +
    '`*.localhost:4200` y la API «Firebase App Check».';

  try {
    const resultado = await getToken(appCheck, false);
    if (!resultado.token) console.error(explicacion);
  } catch {
    console.error(explicacion);
  }
}

export function provideAppCheck(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideEnvironmentInitializer(() => {
      const app = inject(FIREBASE_APP);
      if (yaInicializado) return;

      const clave = environment.appCheckSiteKey;
      if (!clave) {
        console.warn(
          '[App Check] Sin `appCheckSiteKey` en el entorno: no se inicializa.\n' +
            'Es la clave de reCAPTCHA Enterprise, distinta del `apiKey` y del\n' +
            '`appId` de Firebase. Sin ella las Cloud Functions responden 401.\n' +
            'Ver docs/PUESTA-EN-MARCHA.md, bloque 7.',
        );
        return;
      }

      // Token de depuración en desarrollo. Sin esto, App Check con reCAPTCHA
      // rechaza `localhost`: no es un dominio que Google pueda verificar, y la
      // clave de producción no admite añadirlo.
      if (!environment.production) {
        (self as unknown as Record<string, unknown>)['FIREBASE_APPCHECK_DEBUG_TOKEN'] =
          tokenDeDepuracion();
      }

      const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(clave),
        // Renueva el token solo. El SDK no lo hace por defecto: sin esto caduca
        // y la pareja se encuentra errores raros a media tarde sin haber hecho
        // nada.
        isTokenAutoRefreshEnabled: true,
      });

      if (!environment.production) void avisarSiNoEstaRegistrado(appCheck);

      yaInicializado = true;
    }),
  ]);
}
