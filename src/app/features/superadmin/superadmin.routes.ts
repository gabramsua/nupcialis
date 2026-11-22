import { Routes } from '@angular/router';
import { provideAlta } from '../../core/alta/alta.providers';
import { provideCatalogos } from '../../core/superadmin/catalogos.providers';
import { provideGestion } from '../../core/superadmin/gestion.providers';
import { provideEstadisticas } from '../../core/superadmin/estadisticas.providers';
import { provideAuth } from '../../core/auth/auth.providers';
import { guardaSuperadmin } from '../../core/auth/guards';
import { provideFirebaseAuth } from '../../core/firebase/auth.providers';
import { provideFirestore } from '../../core/firebase/firestore.providers';
import { provideAppCheck } from '../../core/firebase/appcheck.providers';
import { provideFirebaseFunctions } from '../../core/firebase/functions.providers';
import { provideIconSprite } from '../../design-system/icons/icon-sprite.providers';

export const superadminRoutes: Routes = [
  {
    path: '',
    providers: [
      provideIconSprite('panel'),
      provideFirestore(),
      provideFirebaseFunctions(),
      provideAppCheck(),
      provideFirebaseAuth(),
      provideAuth(),
      provideAlta(),
      provideEstadisticas(),
      provideGestion(),
      provideCatalogos(),
    ],
    children: [
      {
        path: 'acceso',
        data: { destino: '/superadmin' },
        loadComponent: () => import('../panel/login/login').then((m) => m.Login),
      },
      {
        path: 'sin-permiso',
        loadComponent: () => import('./acceso/sin-permiso').then((m) => m.SuperadminSinPermiso),
      },
      {
        path: 'estadisticas',
        canActivate: [guardaSuperadmin],
        loadComponent: () =>
          import('./estadisticas/estadisticas-pantalla').then((m) => m.PantallaEstadisticas),
      },
      {
        path: 'finanzas',
        canActivate: [guardaSuperadmin],
        loadComponent: () => import('./gestion/finanzas-pantalla').then((m) => m.PantallaFinanzas),
      },
      {
        path: 'recordatorios',
        canActivate: [guardaSuperadmin],
        loadComponent: () =>
          import('./gestion/recordatorios-pantalla').then((m) => m.PantallaRecordatorios),
      },
      {
        path: 'catalogos',
        canActivate: [guardaSuperadmin],
        loadComponent: () =>
          import('./catalogos/catalogos-pantalla').then((m) => m.PantallaCatalogos),
      },
      {
        path: 'bodas/:id',
        canActivate: [guardaSuperadmin],
        loadComponent: () => import('./gestion/ficha-boda').then((m) => m.FichaBoda),
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
