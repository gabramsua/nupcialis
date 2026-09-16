import { Routes } from '@angular/router';
import { provideAuth } from '../../core/auth/auth.providers';
import { guardaPanel } from '../../core/auth/guards';
import { provideFirebaseAuth } from '../../core/firebase/auth.providers';
import { provideFirestore } from '../../core/firebase/firestore.providers';
import { provideFirebaseFunctions } from '../../core/firebase/functions.providers';
import { provideFirebaseStorage } from '../../core/firebase/storage.providers';
import { provideIconSprite } from '../../design-system/icons/icon-sprite.providers';
import { BodaStore } from './boda.store';

export const panelRoutes: Routes = [
  {
    path: '',
    providers: [
      provideIconSprite('panel'),
      provideFirestore(),
      provideFirebaseFunctions(),
      provideFirebaseAuth(),
      provideFirebaseStorage(),
      provideAuth(),
      BodaStore,
    ],
    children: [
      {
        path: 'acceso',
        loadComponent: () => import('./login/login').then((m) => m.Login),
      },
      {
        path: 'otra-boda',
        loadComponent: () => import('./login/otra-boda').then((m) => m.OtraBoda),
      },
      {
        path: '',
        canActivate: [guardaPanel],
        loadComponent: () =>
          import('../../layouts/panel-shell/panel-shell').then((m) => m.PanelShell),
        children: [
          {
            path: 'diseno',
            loadComponent: () =>
              import('./diseno/selector-plantilla').then((m) => m.SelectorPlantilla),
          },
          {
            path: '',
            loadComponent: () => import('./resumen/resumen').then((m) => m.PanelResumen),
          },
        ],
      },
    ],
  },
];
