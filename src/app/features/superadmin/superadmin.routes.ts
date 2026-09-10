import { Routes } from '@angular/router';
import { provideAuth } from '../../core/auth/auth.providers';
import { guardaSuperadmin } from '../../core/auth/guards';
import { provideFirebaseAuth } from '../../core/firebase/auth.providers';
import { provideFirestore } from '../../core/firebase/firestore.providers';
import { provideFirebaseFunctions } from '../../core/firebase/functions.providers';
import { provideIconSprite } from '../../design-system/icons/icon-sprite.providers';

export const superadminRoutes: Routes = [
  {
    path: '',
    providers: [
      provideIconSprite('panel'),
      provideFirestore(),
      provideFirebaseFunctions(),
      provideFirebaseAuth(),
      provideAuth(),
    ],
    children: [
      {
        path: 'acceso',
        loadComponent: () => import('../panel/login/login').then((m) => m.Login),
      },
      {
        path: '',
        canActivate: [guardaSuperadmin],
        loadComponent: () =>
          import('../../layouts/admin-shell/admin-shell').then((m) => m.AdminShell),
      },
    ],
  },
];
