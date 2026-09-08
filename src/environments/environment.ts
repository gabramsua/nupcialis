import { AppEnvironment } from './environment.model';

// PENDIENTE: rellenar con la configuración real del proyecto Firebase
// nupcialis-dev cuando esté creado (bloque B3 de PUESTA-EN-MARCHA.md).
export const environment: AppEnvironment = {
  name: 'dev',
  production: false,
  rootDomain: 'localhost',
  useEmulators: true,
  firebase: {
    apiKey: 'PENDIENTE',
    authDomain: 'nupcialis-dev.firebaseapp.com',
    projectId: 'nupcialis-dev',
    storageBucket: 'nupcialis-dev.firebasestorage.app',
    messagingSenderId: 'PENDIENTE',
    appId: 'PENDIENTE',
  },
  appCheckSiteKey: null,
};
