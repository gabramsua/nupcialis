import { AppEnvironment } from './environment.model';

// PENDIENTE: rellenar con la configuración real del proyecto Firebase
// nupcialis-dev cuando esté creado (bloque B3 de PUESTA-EN-MARCHA.md).
export const environment: AppEnvironment = {
  name: 'dev',
  production: false,
  rootDomain: 'localhost',
  useEmulators: true,
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
