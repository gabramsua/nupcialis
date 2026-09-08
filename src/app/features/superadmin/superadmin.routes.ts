import { Routes } from '@angular/router';
import { provideFirebaseAuth } from '../../core/firebase/auth.providers';
import { provideFirestore } from '../../core/firebase/firestore.providers';
import { provideFirebaseFunctions } from '../../core/firebase/functions.providers';

export const superadminRoutes: Routes = [
  {
    path: '',
    providers: [provideFirestore(), provideFirebaseFunctions(), provideFirebaseAuth()],
    loadComponent: () => import('../../layouts/admin-shell/admin-shell').then((m) => m.AdminShell),
  },
];
