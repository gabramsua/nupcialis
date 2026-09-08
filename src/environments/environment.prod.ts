import { AppEnvironment } from './environment.model';

// PENDIENTE: rellenar con la configuración real del proyecto Firebase
// nupcialis-prod cuando esté creado (bloque B3 de PUESTA-EN-MARCHA.md).
export const environment: AppEnvironment = {
  name: 'prod',
  production: true,
  rootDomain: 'nupcialis.com',
  useEmulators: false,
  firebase: {
    apiKey: 'PENDIENTE',
    authDomain: 'nupcialis-prod.firebaseapp.com',
    projectId: 'nupcialis-prod',
    storageBucket: 'nupcialis-prod.firebasestorage.app',
    messagingSenderId: 'PENDIENTE',
    appId: 'PENDIENTE',
  },
  appCheckSiteKey: null,
};
