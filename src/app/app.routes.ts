import { isDevMode } from '@angular/core';
import { Routes } from '@angular/router';
import { provideIconSprite } from './design-system/icons/icon-sprite.providers';

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
  // Catálogo del sistema visual. Fuera de producción: su chunk existe pero
  // nadie lo carga, porque la ruta ni siquiera se registra.
  ...(isDevMode()
    ? [
        {
          path: 'dev/ds',
          providers: [provideIconSprite('panel')],
          loadComponent: () =>
            import('./features/design-system-catalog/design-system-catalog').then(
              (m) => m.DesignSystemCatalog,
            ),
        },
      ]
    : []),
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
