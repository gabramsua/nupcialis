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
    /**
     * Solo existe si el proyecto tiene Google Analytics activado, y solo lo usa
     * Analytics. Opcional a propósito: pegar aquí la configuración tal cual la
     * da la consola de Firebase tiene que funcionar, esté o no Analytics.
     *
     * No lo usamos todavía. Si algún día se activa Analytics habrá que decidir
     * antes qué se mide y con qué base legal, porque los invitados no han
     * aceptado nada (REQUISITOS §9.4).
     */
    readonly measurementId?: string;
  };
  /** Clave de sitio de reCAPTCHA Enterprise para App Check. */
  readonly appCheckSiteKey: string | null;
}
