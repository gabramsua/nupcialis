import { Routes } from '@angular/router';
import { provideIconSprite } from '../../design-system/icons/icon-sprite.providers';
import { provideFirebaseAuth } from '../../core/firebase/auth.providers';
import { provideFirestore } from '../../core/firebase/firestore.providers';
import { provideFirebaseFunctions } from '../../core/firebase/functions.providers';
import { provideFirebaseStorage } from '../../core/firebase/storage.providers';

export const panelRoutes: Routes = [
  {
    path: '',
    providers: [
      provideIconSprite('panel'),
      provideFirestore(),
      provideFirebaseFunctions(),
      provideFirebaseAuth(),
      provideFirebaseStorage(),
    ],
    loadComponent: () => import('../../layouts/panel-shell/panel-shell').then((m) => m.PanelShell),
  },
];
