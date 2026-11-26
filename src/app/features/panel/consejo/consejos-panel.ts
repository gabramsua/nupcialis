import { Injectable, inject, signal } from '@angular/core';

import { PUERTA_LLAMADAS } from '../../../core/llamadas/llamadas-gateway';
import { leerConsejosDelPanel } from '../../superadmin/consejos/consejos';

const CLAVE_ENTRADA = 'np.panel.entradaRegistrada';

/**
 * Los consejos de cada módulo y el registro de entrada de la pareja (D-53).
 *
 * Se provee en la ruta del panel junto a las llamadas: usa un puerto que solo
 * existe ahí. Si algo falla no se enseña nada: un consejo que no carga no puede
 * estropear la pantalla en la que está.
 */
@Injectable()
export class ConsejosDelPanel {
  private readonly puerta = inject(PUERTA_LLAMADAS);

  private readonly textos = signal<Readonly<Record<string, string>>>({});
  private cargado = false;

  readonly consejos = this.textos.asReadonly();

  async cargar(): Promise<void> {
    if (this.cargado) return;
    this.cargado = true;
    const r = await this.puerta.llamar('getTips', {}, leerConsejosDelPanel);
    if (r.ok) this.textos.set(r.datos);
    else this.cargado = false;
  }

  /** Cuenta la entrada una sola vez por pestaña; el servidor filtra además las recargas. */
  async registrarEntrada(): Promise<void> {
    try {
      if (sessionStorage.getItem(CLAVE_ENTRADA) === '1') return;
      sessionStorage.setItem(CLAVE_ENTRADA, '1');
    } catch {
      // Sin almacenamiento se cuenta en cada apertura; el servidor lo acota.
    }
    await this.puerta.llamar('recordOwnerLogin', {}, () => true);
  }
}
