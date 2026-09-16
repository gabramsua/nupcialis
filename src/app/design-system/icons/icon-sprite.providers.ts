import { EnvironmentProviders, InjectionToken, makeEnvironmentProviders } from '@angular/core';

/**
 * Ruta del sprite de iconos de la superficie actual.
 *
 * Hay dos sprites —público y panel— y se proveen por ruta, igual que los
 * servicios de Firebase: un invitado que solo mira la web de la boda no
 * descarga los iconos del panel de presupuesto.
 */
export const NP_ICON_SPRITE = new InjectionToken<string>('NP_ICON_SPRITE');

export type NpIconSurface = 'public' | 'panel';

export function provideIconSprite(surface: NpIconSurface): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: NP_ICON_SPRITE, useValue: `/icons/${surface}.svg` }]);
}
