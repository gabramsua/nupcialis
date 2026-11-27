import { AppEnvironment } from './environment.model';

// Producción usa, por ahora, el MISMO proyecto de Firebase que desarrollo
// (nupcialis-2220d). Es una decisión temporal (D-72): cuando exista un
// proyecto de desarrollo aparte, el de desarrollo se mueve allí y este
// archivo no cambia. La configuración web de Firebase es pública por diseño.
export const environment: AppEnvironment = {
  name: 'prod',
  production: true,
  rootDomain: 'nupcialis.com',
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
