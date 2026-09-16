import { Routes } from '@angular/router';
import { provideAlta } from '../../core/alta/alta.providers';
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
      provideAlta(),
    ],
    children: [
      {
        path: 'acceso',
        loadComponent: () => import('../panel/login/login').then((m) => m.Login),
      },
      {
        path: 'sin-permiso',
        loadComponent: () => import('./acceso/sin-permiso').then((m) => m.SuperadminSinPermiso),
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
