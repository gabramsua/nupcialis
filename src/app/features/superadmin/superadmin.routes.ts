import { Routes } from '@angular/router';
import { provideIconSprite } from '../../design-system/icons/icon-sprite.providers';
import { provideFirebaseAuth } from '../../core/firebase/auth.providers';
import { provideFirestore } from '../../core/firebase/firestore.providers';
import { provideFirebaseFunctions } from '../../core/firebase/functions.providers';

export const superadminRoutes: Routes = [
  {
    path: '',
    providers: [
      provideIconSprite('panel'),
      provideFirestore(),
      provideFirebaseFunctions(),
      provideFirebaseAuth(),
    ],
    loadComponent: () => import('../../layouts/admin-shell/admin-shell').then((m) => m.AdminShell),
  },
];
