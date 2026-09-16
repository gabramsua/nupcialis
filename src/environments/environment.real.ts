import { AppEnvironment } from './environment.model';

/**
 * La aplicación en local, contra el proyecto **real** de Firebase.
 *
 * Existe para lo único que el emulador no puede probar: el alta de verdad de
 * una boda, con sus cuentas de Auth y con el alta del subdominio en los
 * dominios autorizados —el emulador de Auth no implementa ese API, así que que
 * funcione en local no demuestra nada sobre producción (regla 8 y F0.6.X)—.
 *
 * **No es el entorno de trabajo diario.** Lo que se escriba aquí se escribe de
 * verdad: se queda, cuesta dinero y consume cupo de dominios autorizados, que
 * es justo el recurso cuyo límite no está documentado. Para el día a día,
 * emuladores. Ver `docs/PUESTA-EN-MARCHA.md`.
 *
 * Dos cosas que hay que saber al usarlo:
 *
 * - El acceso **con contraseña** funciona desde `<slug>.localhost`. El de
 *   **Google no**, porque `mariaygabriel.localhost` no está en los dominios
 *   autorizados de Firebase Auth. Es el mismo fallo que describe la regla 8,
 *   visto de cerca: si quieres probarlo, añade ese host a mano en la consola.
 * - App Check no está activado aquí (`appCheckSiteKey: null`), así que las
 *   funciones invocables rechazarán la llamada si tienen la exigencia puesta.
 *   Se resuelve con un token de depuración; está explicado en
 *   `functions/README.md`.
 */
export const environment: AppEnvironment = {
  name: 'dev',
  production: false,
  rootDomain: 'localhost',
  useEmulators: false,
  firebase: {
    apiKey: 'AIzaSyCB3WrRCAcL4TNd8ElFbrCxD2zEtWxwpLw',
    authDomain: 'nupcialis-2220d.firebaseapp.com',
    projectId: 'nupcialis-2220d',
    storageBucket: 'nupcialis-2220d.firebasestorage.app',
    messagingSenderId: '818904056022',
    appId: '1:818904056022:web:928b910f3c1fcc43f1c977',
    measurementId: 'G-XSNZHM2V26',
  },
  appCheckSiteKey: null,
};
