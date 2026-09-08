/**
 * Configuración por entorno.
 *
 * La configuración web de Firebase no es un secreto: viaja en el bundle que
 * descarga cualquier invitado. La seguridad la dan las reglas de Firestore y
 * App Check, no la ocultación de estas claves.
 */
export interface AppEnvironment {
  readonly name: 'dev' | 'staging' | 'prod';
  readonly production: boolean;
  /** Dominio raíz sobre el que se resuelve el subdominio de cada boda. */
  readonly rootDomain: string;
  /** Usar los emuladores locales en vez de los servicios reales. */
  readonly useEmulators: boolean;
  readonly firebase: {
    readonly apiKey: string;
    readonly authDomain: string;
    readonly projectId: string;
    readonly storageBucket: string;
    readonly messagingSenderId: string;
    readonly appId: string;
  };
  /** Clave de sitio de reCAPTCHA Enterprise para App Check. */
  readonly appCheckSiteKey: string | null;
}
