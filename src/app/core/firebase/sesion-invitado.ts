/**
 * La sesión del invitado en la web de su boda.
 *
 * Dos cosas que no son evidentes y conviene no deshacer sin querer:
 *
 * **Firebase Auth se importa de forma diferida.** El `import()` está dentro de
 * los métodos, no arriba. Una boda con la web abierta —que es el modo por
 * defecto— no lo descarga nunca, y son unas decenas de kB sobre el presupuesto
 * de 200 kB de la web pública, que un invitado abre desde el móvil con la
 * cobertura que haya. Si alguien lo sube arriba, lo paga todo el mundo.
 *
 * **Aquí no se verifica nada.** El navegador manda lo que el invitado escribe,
 * `guestLogin` decide y devuelve un token; esto solo lo canjea. Comprobar un
 * nombre contra la lista desde el cliente exigiría poder consultarla, y eso es
 * exactamente lo que la regla 2 prohíbe.
 */

import { Injectable, computed, inject, signal } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { httpsCallable } from 'firebase/functions';

import {
  esNivel,
  type CredencialesInvitado,
  type FalloAcceso,
  type NivelSesion,
  type ResultadoAcceso,
} from '../acceso/acceso';
import { FIREBASE_APP } from './firebase.providers';
import { FIREBASE_FUNCTIONS } from './functions.providers';

interface ErrorInvocable {
  readonly code?: string;
  readonly message?: string;
  readonly details?: unknown;
}

type Auth = import('firebase/auth').Auth;

/**
 * **No lleva `providedIn: 'root'`,** y no es un olvido.
 *
 * Esto inyecta tokens de Firebase, y en este proyecto los servicios de Firebase
 * se proveen **por ruta** (ver CLAUDE.md). Un servicio de raíz se construye en
 * el inyector de raíz, donde esos tokens no existen: la web pública entera se
 * quedaba en blanco con un `NG0201`. Se provee en `publicSiteRoutes`, que es
 * donde viven `FIREBASE_APP` y `FIREBASE_FUNCTIONS`.
 */
@Injectable()
export class SesionInvitado {
  private readonly app = inject(FIREBASE_APP);
  private readonly functions = inject(FIREBASE_FUNCTIONS);

  private readonly _guestId = signal<string | null>(null);
  /** `null` mientras no se sabe: no es lo mismo que «no hay nadie». */
  private readonly _resuelta = signal(false);
  /**
   * Hasta dónde llega esta sesión (D-34).
   *
   * Sale del claim del token, no de lo que haya hecho el navegador: quien
   * decide si puede confirmar es el servidor, y esto solo sirve para saber si
   * enseñarle el formulario o pedirle los cuatro dígitos antes.
   */
  private readonly _nivel = signal<NivelSesion>('enlace');
  private readonly _nombre = signal('');

  readonly guestId = this._guestId.asReadonly();
  readonly resuelta = this._resuelta.asReadonly();
  readonly nivel = this._nivel.asReadonly();
  /** Su mote, cuando lo sabemos por haber entrado con el enlace. */
  readonly nombre = this._nombre.asReadonly();
  readonly identificado = computed(() => this._guestId() !== null);
  readonly verificado = computed(() => this.identificado() && this._nivel() === 'verificado');

  private auth: Auth | null = null;

  private async conectar(): Promise<Auth> {
    if (this.auth) return this.auth;

    const { getAuth } = await import('firebase/auth');
    const auth = getAuth(this.app);

    this.auth = auth;
    return auth;
  }

  /**
   * Recupera la sesión si el navegador la tenía guardada.
   *
   * Se llama solo cuando la boda pide identificarse. Hasta que contesta,
   * `resuelta()` es `false`: preguntar antes vería «no hay nadie» y echaría al
   * invitado al formulario en cada recarga.
   */
  async recuperar(): Promise<void> {
    const auth = await this.conectar();
    const { onAuthStateChanged } = await import('firebase/auth');

    await new Promise<void>((resolver) => {
      const dejarDeEscuchar = onAuthStateChanged(auth, (usuario) => {
        dejarDeEscuchar();
        resolver();
        void this.leerClaims(usuario);
      });
    });
  }

  private async leerClaims(
    usuario: { getIdTokenResult(): Promise<unknown> } | null,
  ): Promise<void> {
    if (!usuario) {
      this._guestId.set(null);
      this._resuelta.set(true);
      return;
    }

    const resultado = (await usuario.getIdTokenResult()) as { claims?: Record<string, unknown> };
    const guestId = resultado.claims?.['guestId'];
    const nivel = resultado.claims?.['nivel'];
    const nombre = resultado.claims?.['nombre'];

    this._guestId.set(typeof guestId === 'string' && guestId !== '' ? guestId : null);
    // Su propio nombre viene en el claim: es lo que permite decirle «estás
    // viendo esto como María» después de recargar, sin una llamada más.
    this._nombre.set(typeof nombre === 'string' ? nombre : '');
    // Un token de antes de D-34 no lleva nivel, y solo se emitía escribiendo
    // los cuatro dígitos: tratarlo como `enlace` dejaría fuera, durante 24 h, a
    // quien ya se había identificado bien.
    this._nivel.set(esNivel(nivel) ? nivel : 'verificado');
    this._resuelta.set(true);
  }

  /** Pide entrar. El slug va en la llamada; el `weddingId` lo resuelve el servidor. */
  async entrar(slug: string, credenciales: CredencialesInvitado): Promise<ResultadoAcceso> {
    const guestLogin = httpsCallable<
      CredencialesInvitado & { slug: string },
      { token: string; guestId: string; nombre?: string }
    >(this.functions, 'guestLogin');

    try {
      const respuesta = await guestLogin({ slug, ...credenciales });
      await this.canjear(respuesta.data.token);

      this._guestId.set(respuesta.data.guestId);
      this._nombre.set(respuesta.data.nombre ?? '');
      this._nivel.set('verificado');
      this._resuelta.set(true);
      return { ok: true, guestId: respuesta.data.guestId };
    } catch (error) {
      return { ok: false, fallo: traducirAcceso(error) };
    }
  }

  /**
   * Entra con el token que lleva el enlace (D-34, opción 3).
   *
   * Da nivel `enlace`: ver la web y nada más. El enlace se reenvía, así que lo
   * que llegue por un grupo de WhatsApp no puede confirmar por nadie.
   */
  async entrarConEnlace(slug: string, token: string): Promise<ResultadoAcceso> {
    const guestLinkLogin = httpsCallable<
      { slug: string; k: string },
      { token: string; guestId: string; nombre?: string }
    >(this.functions, 'guestLinkLogin');

    try {
      const respuesta = await guestLinkLogin({ slug, k: token });
      await this.canjear(respuesta.data.token);

      this._guestId.set(respuesta.data.guestId);
      this._nivel.set('enlace');
      this._nombre.set(respuesta.data.nombre ?? '');
      this._resuelta.set(true);
      return { ok: true, guestId: respuesta.data.guestId };
    } catch (error) {
      return { ok: false, fallo: traducirAcceso(error) };
    }
  }

  /**
   * Sube de `enlace` a `verificado` escribiendo los cuatro dígitos.
   *
   * El `guestId` no viaja: lo saca el servidor del token. Si fuera un
   * parámetro, cualquiera con un enlace podría probar los dígitos de otro.
   */
  async verificar(credenciales: CredencialesInvitado): Promise<ResultadoAcceso> {
    const verifyGuest = httpsCallable<
      CredencialesInvitado,
      { token: string; guestId: string; nombre?: string }
    >(this.functions, 'verifyGuest');

    try {
      const respuesta = await verifyGuest(credenciales);
      await this.canjear(respuesta.data.token);

      this._guestId.set(respuesta.data.guestId);
      if (respuesta.data.nombre) this._nombre.set(respuesta.data.nombre);
      this._nivel.set('verificado');
      this._resuelta.set(true);
      return { ok: true, guestId: respuesta.data.guestId };
    } catch (error) {
      return { ok: false, fallo: traducirAcceso(error) };
    }
  }

  private async canjear(token: string): Promise<void> {
    const auth = await this.conectar();
    const { signInWithCustomToken } = await import('firebase/auth');
    await signInWithCustomToken(auth, token);
  }

  async salir(): Promise<void> {
    const auth = await this.conectar();
    const { signOut } = await import('firebase/auth');
    await signOut(auth);
    this._guestId.set(null);
    this._nivel.set('enlace');
    this._nombre.set('');
  }
}

/**
 * El error del SDK, convertido en algo que la pantalla sabe contar.
 *
 * Exportada para probarla sola: desde un test de pantalla la sesión viene
 * doblada y esto no llega a ejecutarse. Ya pasó con la lista de invitados, y el
 * «Unauthenticated [401]» acabó delante de la pareja.
 *
 * **Todo lo que no sea otra cosa es `no-identificado`**, con el mismo mensaje.
 * El servidor ya manda una sola respuesta de fallo (regla 3); aquí no se puede
 * inventar una diferencia que allí no existe.
 */
export function traducirAcceso(error: unknown): FalloAcceso {
  const fallo = (error ?? {}) as ErrorInvocable;
  const detalles = (fallo.details ?? {}) as Record<string, unknown>;
  const codigo = (fallo.code ?? '').replace(/^functions\//, '');

  switch (codigo) {
    case 'resource-exhausted':
      return {
        tipo: 'demasiados-intentos',
        esperaMs: typeof detalles['esperaMs'] === 'number' ? detalles['esperaMs'] : 60_000,
      };

    // 401 con App Check mal configurado. No es culpa del invitado y no se
    // arregla volviendo a escribir el nombre, así que se cuenta aparte.
    case 'unauthenticated':
      return { tipo: 'sin-verificar' };

    case 'permission-denied':
      return { tipo: 'no-identificado' };

    case 'internal':
    case 'unavailable':
    case 'deadline-exceeded':
      return { tipo: 'error', mensaje: fallo.message ?? '' };

    default:
      return { tipo: 'no-identificado' };
  }
}

/** Las páginas que piden identificarse, con el nombre con el que vuelven de la puerta. */
export const PAGINAS_CON_IDENTIDAD = ['quiz', 'galeria', 'regalos', 'playlist', 'libro'] as const;
export type PaginaConIdentidad = (typeof PAGINAS_CON_IDENTIDAD)[number];

export function esPaginaConIdentidad(valor: unknown): valor is PaginaConIdentidad {
  return PAGINAS_CON_IDENTIDAD.includes(valor as PaginaConIdentidad);
}

/**
 * Guarda de las páginas que **necesitan saber quién es** el invitado (D-56): el
 * quiz (ranking nominal), la galería (autor de cada foto), los regalos
 * (reserva) y la playlist (votos).
 *
 * Recupera la sesión que el navegador tuviera y, si no hay ninguna —lo normal
 * en una boda **abierta**, donde la portada no pide nada—, manda a `/entrar`
 * con el nombre de la página para volver a ella en cuanto se identifique.
 * Antes, esas páginas se abrían, llamaban a la función sin token y el invitado
 * veía un error sin saber qué hacer.
 */
export function exigirSesionDeInvitado(pagina: PaginaConIdentidad): CanActivateFn {
  return async () => {
    const sesion = inject(SesionInvitado);
    const router = inject(Router);

    try {
      await sesion.recuperar();
    } catch {
      // Sin Auth no hay sesión que recuperar: se trata como «no hay nadie».
    }

    return sesion.identificado()
      ? true
      : router.createUrlTree(['/entrar'], { queryParams: { volver: pagina } });
  };
}
