import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { PUERTA_AUTH } from './auth-gateway';
import { SESION_ANONIMA, Sesion } from './session';

/**
 * Estado de sesión de la aplicación.
 *
 * Se provee en la ruta que necesita autenticación, no en la raíz, porque la
 * puerta depende de Firebase Auth y Auth vive en un chunk diferido. La web
 * pública que solo mira una boda no carga nada de esto.
 */
@Injectable()
export class SessionStore {
  private readonly puerta = inject(PUERTA_AUTH);

  private readonly _sesion = signal<Sesion>(SESION_ANONIMA);
  /** `null` mientras no se sabe todavía: es distinto de "no hay nadie". */
  private readonly _resuelta = signal(false);

  readonly sesion = this._sesion.asReadonly();
  readonly resuelta = this._resuelta.asReadonly();

  readonly esOwner = computed(() => this._sesion().rol === 'owner');
  readonly esSuperadmin = computed(() => this._sesion().rol === 'superadmin');
  readonly weddingId = computed(() => this._sesion().weddingId);

  constructor() {
    const dejarDeEscuchar = this.puerta.observar((sesion) => {
      this._sesion.set(sesion);
      this._resuelta.set(true);
    });
    inject(DestroyRef).onDestroy(dejarDeEscuchar);
  }

  /**
   * Espera a saber si hay sesión.
   *
   * Las guardas la necesitan: si preguntan antes de que Firebase haya
   * restaurado la sesión del almacenamiento local, verían "anónimo" y echarían
   * a la pareja al acceso en cada recarga.
   */
  async esperar(): Promise<Sesion> {
    if (this._resuelta()) return this._sesion();
    return new Promise((resolver) => {
      const dejarDeEscuchar = this.puerta.observar((sesion) => {
        dejarDeEscuchar();
        resolver(sesion);
      });
    });
  }
}
