import { Routes } from '@angular/router';

/**
 * Solo `loadChildren`. Este fichero no puede importar nada de Firebase.
 *
 * Los servicios de Firebase se proveen dentro de cada fichero de rutas
 * diferido, para que su código caiga en el chunk correspondiente. Si se
 * importan aquí —aunque sea solo para pasarlos como `providers` de una ruta—
 * el empaquetador los mete en el bundle inicial y la web pública se come
 * 122 kB comprimidos de SDK que un invitado no llega a usar.
 */
export const routes: Routes = [
  {
    path: 'panel',
    loadChildren: () => import('./features/panel/panel.routes').then((m) => m.panelRoutes),
  },
  {
    path: 'superadmin',
    loadChildren: () =>
      import('./features/superadmin/superadmin.routes').then((m) => m.superadminRoutes),
  },
  {
    path: '',
    loadChildren: () =>
      import('./features/public-site/public-site.routes').then((m) => m.publicSiteRoutes),
  },
];
