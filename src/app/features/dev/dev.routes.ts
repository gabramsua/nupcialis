import { Routes } from '@angular/router';

import { provideIconSprite } from '../../design-system/icons/icon-sprite.providers';
import { provideDoblesDelPanel, provideQuizDeMuestra } from './dobles-panel';

/**
 * Las páginas de desarrollo, detrás de un solo import diferido.
 *
 * Van aquí y no en `app.routes.ts` por lo mismo que las demás: los dobles del
 * panel importan pantallas del panel, y si eso se nombrara desde el fichero de
 * rutas raíz el empaquetador lo metería en el arranque de la web pública.
 * Dentro de un `loadChildren` cae en su propio chunk, que en producción no
 * existe porque la ruta ni se registra (`isDevMode()`).
 *
 * Lo vigila `arranque-publico.spec.ts`, que fue justo el que se puso rojo.
 */
export const devRoutes: Routes = [
  {
    path: 'ds',
    providers: [provideIconSprite('panel')],
    loadComponent: () =>
      import('../design-system-catalog/design-system-catalog').then((m) => m.DesignSystemCatalog),
  },
  {
    // Las dos plantillas de la web pública con una boda de muestra.
    path: 'previa',
    providers: [provideIconSprite('public')],
    loadComponent: () => import('./previa-publica').then((m) => m.PreviaPublica),
  },
  {
    // El quiz del invitado con una partida de muestra, sin Firebase.
    path: 'quiz',
    providers: [provideIconSprite('public'), provideQuizDeMuestra()],
    loadComponent: () => import('../public-site/quiz/quiz-publico').then((m) => m.NpQuizPublico),
  },
  {
    // Las pantallas de contenido del panel, con datos de muestra en memoria.
    path: 'panel',
    providers: [provideIconSprite('panel'), provideDoblesDelPanel()],
    loadComponent: () => import('./previa-panel').then((m) => m.PreviaPanel),
  },
];
