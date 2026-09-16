import { AppEnvironment } from './environment.model';

// PENDIENTE: rellenar con la configuración real del proyecto Firebase
// nupcialis-staging cuando esté creado (bloque B3 de PUESTA-EN-MARCHA.md).
export const environment: AppEnvironment = {
  name: 'staging',
  production: false,
  rootDomain: 'staging.nupcialis.com',
  useEmulators: false,
  firebase: {
    apiKey: 'PENDIENTE',
    authDomain: 'nupcialis-staging.firebaseapp.com',
    projectId: 'nupcialis-staging',
    storageBucket: 'nupcialis-staging.firebasestorage.app',
    messagingSenderId: 'PENDIENTE',
    appId: 'PENDIENTE',
  },
  appCheckSiteKey: null,
};
