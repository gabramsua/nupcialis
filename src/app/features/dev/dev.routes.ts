import { provideEstadisticasDeMuestra } from './previa-estadisticas';
import { Routes } from '@angular/router';

import { provideIconSprite } from '../../design-system/icons/icon-sprite.providers';
import {
  provideDoblesDelPanel,
  provideGaleriaDeMuestra,
  providePlaylistDeMuestra,
  provideQuizDeMuestra,
  provideRegalosDeMuestra,
} from './dobles-panel';

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
    // La galería del invitado con fotos de muestra, sin Firebase ni Storage.
    path: 'galeria',
    providers: [provideIconSprite('public'), provideGaleriaDeMuestra()],
    loadComponent: () =>
      import('../public-site/galeria/galeria-publica').then((m) => m.NpGaleriaPublica),
  },
  {
    // La playlist del invitado, en memoria y con el dominio del servidor.
    path: 'playlist',
    providers: [provideIconSprite('public'), providePlaylistDeMuestra()],
    loadComponent: () =>
      import('../public-site/playlist/playlist-publica').then((m) => m.NpPlaylistPublica),
  },
  {
    // Las estadísticas del superadmin con cuatro bodas de muestra.
    path: 'estadisticas',
    providers: [provideIconSprite('panel'), provideEstadisticasDeMuestra()],
    loadComponent: () =>
      import('../superadmin/estadisticas/estadisticas-pantalla').then(
        (m) => m.PantallaEstadisticas,
      ),
  },
  {
    // El mapa del invitado con tres sitios de muestra.
    path: 'mapa',
    providers: [provideIconSprite('public')],
    loadComponent: () => import('./previa-mapa').then((m) => m.PreviaMapa),
  },
  {
    // Los regalos del invitado, con una lista de muestra. Reservar funciona.
    path: 'regalos',
    providers: [provideIconSprite('public'), provideRegalosDeMuestra()],
    loadComponent: () =>
      import('../public-site/regalos/regalos-publica').then((m) => m.NpRegalosPublica),
  },
  {
    // Las pantallas de contenido del panel, con datos de muestra en memoria.
    path: 'panel',
    providers: [provideIconSprite('panel'), provideDoblesDelPanel()],
    loadComponent: () => import('./previa-panel').then((m) => m.PreviaPanel),
  },
];
