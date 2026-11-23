import { Routes } from '@angular/router';
import { provideAlta } from '../../core/alta/alta.providers';
import { provideLlamadas } from '../../core/llamadas/llamadas.providers';
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
      provideLlamadas(),
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
        // Todo lo que lleva el menú lateral cuelga de aquí: un solo guarda y un
        // solo marco para todas las secciones.
        path: '',
        canActivate: [guardaSuperadmin],
        loadComponent: () =>
          import('../../layouts/superadmin-layout/superadmin-layout').then(
            (m) => m.SuperadminLayout,
          ),
        children: [
          {
            path: 'estadisticas',
            loadComponent: () =>
              import('./estadisticas/estadisticas-pantalla').then((m) => m.PantallaEstadisticas),
          },
          {
            path: 'finanzas',
            loadComponent: () =>
              import('./gestion/finanzas-pantalla').then((m) => m.PantallaFinanzas),
          },
          {
            path: 'recordatorios',
            loadComponent: () =>
              import('./gestion/recordatorios-pantalla').then((m) => m.PantallaRecordatorios),
          },
          {
            path: 'catalogos',
            loadComponent: () =>
              import('./catalogos/catalogos-pantalla').then((m) => m.PantallaCatalogos),
          },
          {
            path: 'planes',
            loadComponent: () => import('./planes/planes-pantalla').then((m) => m.PantallaPlanes),
          },
          {
            path: 'correos',
            loadComponent: () =>
              import('./correos/correos-pantalla').then((m) => m.PantallaCorreos),
          },
          {
            path: 'cola-correos',
            loadComponent: () =>
              import('./cola-correos/cola-correos-pantalla').then((m) => m.PantallaColaCorreos),
          },
          {
            path: 'consejos',
            loadComponent: () =>
              import('./consejos/consejos-pantalla').then((m) => m.PantallaConsejos),
          },
          {
            path: 'bodas/:id',
            loadComponent: () => import('./gestion/ficha-boda').then((m) => m.FichaBoda),
          },
          {
            path: '',
            loadComponent: () =>
              import('../../layouts/admin-shell/admin-shell').then((m) => m.AdminShell),
          },
        ],
      },
    ],
  },
];
