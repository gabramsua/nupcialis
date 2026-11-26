import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';

import { routes } from './app.routes';
import { provideFirebaseApp } from './core/firebase/firebase.providers';
import { provideI18n } from './core/i18n/i18n.providers';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      // Cada navegación empieza arriba. Sin esto, al saltar de una pantalla
      // larga a otra la barra se quedaba donde estaba. Al volver atrás se
      // recupera la posición, que es lo que espera quien pulsa «atrás».
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
    ),
    provideHttpClient(withFetch()),
    provideFirebaseApp(environment),
    provideI18n(),
  ],
};
