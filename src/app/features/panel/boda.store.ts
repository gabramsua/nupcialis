import { Injectable, computed, inject, signal } from '@angular/core';

import type { ModoAcceso } from '../../core/acceso/acceso';
import { SessionStore } from '../../core/auth/session.store';
import type { ColoresPaleta } from '../public-site/paletas/paletas';
import type { Seccion } from '../public-site/secciones/secciones';
import { menuDeModulos, modulosNoVisibles, type BodaDelPanel } from './boda';
import { crearFuenteBodaFirestore } from './boda.firestore';
import type {
  AportacionParaGuardar,
  DatosBasicosParaGuardar,
  DressCodeParaGuardar,
} from './boda.firestore';
import { sanearAutobuses, type RutaAutobus } from '../public-site/autobuses/autobuses';
import { sanearDressCode } from '../public-site/dress-code/dress-code';
import { sanearAportacion } from '../public-site/regalos/regalos';

type Estado = 'cargando' | 'lista' | 'sin-boda' | 'error';

/**
 * La boda de la sesión, cargada una vez y compartida por todo el panel.
 *
 * Se provee en la ruta del panel, no en la raíz: la web pública no tiene sesión
 * ni boda propia, y no debe arrastrar esto.
 *
 * El `weddingId` sale del claim del token (regla 1). Si el token no lo trae, no
 * hay boda que cargar: no se busca por hostname ni por ningún otro camino, que
 * es exactamente el atajo que la regla prohíbe.
 */
@Injectable()
export class BodaStore {
  private readonly sesion = inject(SessionStore);
  private readonly fuente = crearFuenteBodaFirestore();

  private readonly _boda = signal<BodaDelPanel | null>(null);
  private readonly _estado = signal<Estado>('cargando');
  private readonly _error = signal('');

  readonly boda = this._boda.asReadonly();
  readonly estado = this._estado.asReadonly();
  readonly error = this._error.asReadonly();

  readonly menu = computed(() => {
    const boda = this._boda();
    return boda ? menuDeModulos(boda) : [];
  });

  readonly sinPublicar = computed(() => {
    const boda = this._boda();
    return boda ? modulosNoVisibles(boda) : 0;
  });

  constructor() {
    void this.cargar();
  }

  async cargar(): Promise<void> {
    const weddingId = this.sesion.weddingId();
    if (!weddingId) {
      this._estado.set('sin-boda');
      return;
    }

    this._estado.set('cargando');
    try {
      const boda = await this.fuente.leer(weddingId);
      this._boda.set(boda);
      this._estado.set(boda ? 'lista' : 'sin-boda');
    } catch (error) {
      this._error.set(error instanceof Error ? error.message : String(error));
      this._estado.set('error');
    }
  }

  /**
   * Cambia la plantilla y actualiza la copia local sin recargar.
   *
   * El cambio se ve al instante en el selector; la web pública tarda lo que
   * tarde `syncPublicProjection`, que es un segundo. Esperar a releer solo para
   * confirmar lo que acabamos de escribir sería un parpadeo gratis.
   */
  async cambiarPlantilla(templateId: string): Promise<boolean> {
    const boda = this._boda();
    if (!boda || boda.templateId === templateId) return true;

    try {
      await this.fuente.cambiarPlantilla(boda.weddingId, templateId);
      this._boda.set({ ...boda, templateId });
      return true;
    } catch (error) {
      this._error.set(error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  /** Elige la paleta, o la quita con `null`. */
  async guardarPaleta(colores: ColoresPaleta | null): Promise<boolean> {
    const boda = this._boda();
    if (!boda) return false;

    try {
      await this.fuente.guardarPaleta(boda.weddingId, colores);
      this._boda.set({ ...boda, palette: colores });
      return true;
    } catch (error) {
      this._error.set(error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  /** Fija o quita la foto de portada. */
  async guardarPortada(path: string | null, url: string | null): Promise<boolean> {
    const boda = this._boda();
    if (!boda) return false;

    try {
      await this.fuente.guardarPortada(boda.weddingId, path, url);
      this._boda.set({ ...boda, heroImagePath: path, heroImageUrl: url });
      return true;
    } catch (error) {
      this._error.set(error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  /** Decide si la boda sale en buscadores. */
  async guardarIndexable(indexable: boolean): Promise<boolean> {
    const boda = this._boda();
    if (!boda) return false;

    try {
      await this.fuente.guardarIndexable(boda.weddingId, indexable);
      this._boda.set({ ...boda, indexable });
      return true;
    } catch (error) {
      this._error.set(error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  /**
   * Guarda el dress code (§8.11).
   *
   * Lo que se escribe son **ids** de la lista cerrada de colores, no
   * hexadecimales: así ni el panel ni la web pueden acabar pintando un color
   * que no tenga nombre.
   */
  async guardarDressCode(dress: DressCodeParaGuardar): Promise<boolean> {
    const boda = this._boda();
    if (!boda) return false;

    try {
      await this.fuente.guardarDressCode(boda.weddingId, dress);
      this._boda.set({
        ...boda,
        dressCode: sanearDressCode({ ...dress }),
      });
      return true;
    } catch (error) {
      this._error.set(error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  /** Guarda las rutas de autobús (D-63). */
  async guardarAutobuses(rutas: readonly RutaAutobus[]): Promise<boolean> {
    const boda = this._boda();
    if (!boda) return false;

    try {
      await this.fuente.guardarAutobuses(boda.weddingId, rutas);
      this._boda.set({ ...boda, autobuses: sanearAutobuses(rutas) });
      return true;
    } catch (error) {
      this._error.set(error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  /**
   * Guarda la aportación: IBAN, Bizum y el mensaje de la pareja (§8.8).
   *
   * Se guarda lo tecleado y se sanea para pintarlo: si el IBAN está mal, el
   * panel lo avisa y la pareja sigue viendo lo que escribió, que es lo único
   * con lo que puede corregirlo.
   */
  async guardarAportacion(aportacion: AportacionParaGuardar): Promise<boolean> {
    const boda = this._boda();
    if (!boda) return false;

    try {
      await this.fuente.guardarAportacion(boda.weddingId, aportacion);
      this._boda.set({ ...boda, aportacion: sanearAportacion({ ...aportacion }) });
      return true;
    } catch (error) {
      this._error.set(error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  /** Guarda las secciones de la web pública. */
  async guardarSecciones(secciones: readonly Seccion[]): Promise<boolean> {
    const boda = this._boda();
    if (!boda) return false;

    try {
      await this.fuente.guardarSecciones(boda.weddingId, secciones);
      this._boda.set({ ...boda, secciones });
      return true;
    } catch (error) {
      this._error.set(error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  /** Fija o borra la hora de la ceremonia. */
  async guardarMensajeInvitacion(inviteMessage: string): Promise<boolean> {
    const boda = this._boda();
    if (!boda) return false;

    try {
      await this.fuente.guardarMensajeInvitacion(boda.weddingId, inviteMessage);
      this._boda.set({ ...boda, inviteMessage });
      return true;
    } catch (error) {
      this._error.set(error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  async guardarAcompanantes(allowGuestAddedCompanions: boolean): Promise<boolean> {
    const boda = this._boda();
    if (!boda) return false;

    try {
      await this.fuente.guardarAcompanantes(boda.weddingId, allowGuestAddedCompanions);
      this._boda.set({ ...boda, allowGuestAddedCompanions });
      return true;
    } catch (error) {
      this._error.set(error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  async guardarFechaLimite(rsvpDeadline: Date | null): Promise<boolean> {
    const boda = this._boda();
    if (!boda) return false;

    try {
      await this.fuente.guardarFechaLimite(boda.weddingId, rsvpDeadline);
      this._boda.set({ ...boda, rsvpDeadline });
      return true;
    } catch (error) {
      this._error.set(error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  async guardarModoAcceso(guestAccessMode: ModoAcceso): Promise<boolean> {
    const boda = this._boda();
    if (!boda || boda.guestAccessMode === guestAccessMode) return true;

    try {
      await this.fuente.guardarModoAcceso(boda.weddingId, guestAccessMode);
      this._boda.set({ ...boda, guestAccessMode });
      return true;
    } catch (error) {
      this._error.set(error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  /** Nombres, día, tipo de ceremonia y hora, de una vez. */
  async guardarDatos(datos: DatosBasicosParaGuardar): Promise<boolean> {
    const boda = this._boda();
    if (!boda) return false;

    try {
      await this.fuente.guardarDatos(boda.weddingId, datos);
      this._boda.set({
        ...boda,
        pareja: { partnerA: datos.partnerA, partnerB: datos.partnerB },
        weddingDate: datos.weddingDate,
        ceremonyType: datos.ceremonyType,
        weddingTime: datos.weddingTime,
      });
      return true;
    } catch (error) {
      this._error.set(error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  async guardarHora(weddingTime: string | null): Promise<boolean> {
    const boda = this._boda();
    if (!boda) return false;

    try {
      await this.fuente.guardarHora(boda.weddingId, weddingTime);
      this._boda.set({ ...boda, weddingTime });
      return true;
    } catch (error) {
      this._error.set(error instanceof Error ? error.message : String(error));
      return false;
    }
  }
}
