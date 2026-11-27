import { AppEnvironment } from './environment.model';

/**
 * La aplicación en local, contra el proyecto de Firebase.
 *
 * **Ya no hay emuladores** (D-33): todo se prueba contra Firebase directamente,
 * así que este es el entorno de trabajo diario y lo que se escribe aquí se
 * escribe de verdad. Dos consecuencias que conviene tener presentes:
 *
 * - Cada boda de prueba consume un **dominio autorizado** de Firebase Auth, y
 *   ese es justo el recurso cuyo límite Firebase no documenta (§11). Conviene
 *   reutilizar bodas en vez de dar de alta una nueva por cada prueba.
 * - Un trigger que se llame a sí mismo cuesta dinero de verdad en Blaze.
 *
 * Y una que sorprende al llegar:
 *
 * - El acceso **con contraseña** funciona desde `<slug>.localhost`. El de
 *   **Google no**, porque `mariaygabriel.localhost` no está en los dominios
 *   autorizados de Firebase Auth. Es el mismo fallo que describe la regla 8,
 *   visto de cerca: si quieres probarlo, añade ese host a mano en la consola.
 * - **`appCheckSiteKey` tiene que estar rellena.** Es la clave de **reCAPTCHA
 *   Enterprise**, y no es el `apiKey` ni el `appId` de aquí abajo: esos son la
 *   configuración web de Firebase y ya estaban puestos. Las funciones exigen
 *   App Check siempre, así que con este campo a `null` el navegador no manda
 *   token y toda invocable responde 401. La clave se crea en Google Cloud
 *   —tipo web, basada en puntuación— y **no es un secreto**: viaja en el bundle.
 *   Para `localhost` hace falta además un token de depuración, porque una clave
 *   de producción no admite ese dominio. Los tres pasos están en
 *   `docs/PUESTA-EN-MARCHA.md`, bloque 7.
 */
export const environment: AppEnvironment = {
  name: 'dev',
  production: false,
  rootDomain: 'localhost',
  firebase: {
    apiKey: 'AIzaSyCB3WrRCAcL4TNd8ElFbrCxD2zEtWxwpLw',
    authDomain: 'nupcialis-2220d.firebaseapp.com',
    projectId: 'nupcialis-2220d',
    storageBucket: 'nupcialis-2220d.firebasestorage.app',
    messagingSenderId: '818904056022',
    appId: '1:818904056022:web:928b910f3c1fcc43f1c977',
    measurementId: 'G-XSNZHM2V26',
  },
  appCheckSiteKey: '6LeIGTUuAAAAAGpS95Tv_1k2BHlEhllOqLbwEL8D',
};
