import { EnvironmentProviders, isDevMode, makeEnvironmentProviders } from '@angular/core';
import { provideTransloco } from '@jsverse/transloco';
import { TranslocoHttpLoader } from './transloco.loader';

/**
 * i18n en tiempo de ejecución, no por compilación.
 *
 * Se descarta el i18n nativo de Angular porque compila un bundle por idioma, y
 * aquí el idioma tiene que poder cambiarse en caliente: cada boda elige el suyo
 * y en el futuro una boda podrá publicarse en varios (ver REQUISITOS §9.7).
 *
 * Ninguna cadena visible se escribe literal en una plantilla. Desde el primer
 * commit.
 */
export const SUPPORTED_LANGUAGES = ['es'] as const;
export const DEFAULT_LANGUAGE = 'es';

export function provideI18n(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideTransloco({
      config: {
        availableLangs: [...SUPPORTED_LANGUAGES],
        defaultLang: DEFAULT_LANGUAGE,
        fallbackLang: DEFAULT_LANGUAGE,
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
        missingHandler: { logMissingKey: isDevMode(), useFallbackTranslation: true },
      },
      loader: TranslocoHttpLoader,
    }),
  ]);
}
