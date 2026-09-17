import { Routes } from '@angular/router';
import { provideAuth } from '../../core/auth/auth.providers';
import { provideInvitados } from '../../core/invitados/invitados.providers';
import { guardaPanel } from '../../core/auth/guards';
import { provideFirebaseAuth } from '../../core/firebase/auth.providers';
import { provideFirestore } from '../../core/firebase/firestore.providers';
import { provideAppCheck } from '../../core/firebase/appcheck.providers';
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
      provideAppCheck(),
      provideFirebaseAuth(),
      provideFirebaseStorage(),
      provideAuth(),
      provideInvitados(),
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
            // La ruta se llama como el módulo: el menú del panel enlaza a
            // `/panel/<modulo>` y lo dibujan los módulos activos de la boda.
            path: 'guests',
            loadComponent: () => import('./invitados/invitados').then((m) => m.Invitados),
          },
          {
            path: 'datos',
            loadComponent: () => import('./datos/datos-boda').then((m) => m.DatosBoda),
          },
          {
            path: 'web',
            loadComponent: () => import('./web/editor-secciones').then((m) => m.EditorSecciones),
          },
          {
            path: 'diseno',
            loadComponent: () => import('./diseno/diseno').then((m) => m.Diseno),
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
