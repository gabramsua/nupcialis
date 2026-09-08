import { Routes } from '@angular/router';
import { provideFirestore } from '../../core/firebase/firestore.providers';
import { provideFirebaseFunctions } from '../../core/firebase/functions.providers';

/**
 * La web pública solo necesita Firestore, para resolver el tenant y leer la
 * proyección pública, y Functions, para el acceso del invitado. Ni Auth ni
 * Storage entran aquí.
 */
export const publicSiteRoutes: Routes = [
  {
    path: '',
    providers: [provideFirestore(), provideFirebaseFunctions()],
    loadComponent: () =>
      import('../../layouts/public-shell/public-shell').then((m) => m.PublicShell),
  },
];
