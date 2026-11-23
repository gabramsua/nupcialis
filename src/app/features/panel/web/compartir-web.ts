import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  linkedSignal,
  signal,
} from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

import { NpButton } from '../../../design-system/components/button/button';
import { NpInput } from '../../../design-system/components/field/input';
import { NpIcon } from '../../../design-system/icons/icon';
import { fechaLarga } from '../../../shared/fecha';
import { BodaStore } from '../boda.store';
import { MENSAJE_GENERAL, enlaceWhatsApp, mensajeDeInvitacion } from '../invitados/invitacion';

/**
 * Mandar la web a todo el mundo, de una vez (D-52).
 *
 * Antes cada invitado tenía su botón de WhatsApp y su propio mensaje, y la
 * pareja acababa mandando doscientos. Ahora hay **uno**, aquí, junto a la web
 * que se manda: un mensaje, el enlace de la boda, y WhatsApp lo reparte a
 * quien se elija (un grupo, una conversación). Cada invitado se identifica al
 * abrirla.
 */
@Component({
  selector: 'np-compartir-web',
  imports: [TranslocoDirective, NpButton, NpIcon, NpInput],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <section class="cw">
        <h3>{{ t('panel.compartirWeb.titulo') }}</h3>
        <p>{{ t('panel.compartirWeb.ayuda') }}</p>

        <label>
          <span>{{ t('panel.compartirWeb.mensaje') }}</span>
          <textarea npInput rows="6" [value]="mensaje()" (input)="editar($event)"></textarea>
        </label>

        <div class="cw__acciones">
          <a
            npButton
            [href]="enlaceDeWhatsApp()"
            target="_blank"
            rel="noopener"
            data-testid="compartir-whatsapp"
          >
            <np-icon name="whatsapp-logo" />
            {{ t('panel.compartirWeb.whatsapp') }}
          </a>
          <button npButton variant="secondary" type="button" (click)="copiar(mensaje(), 'mensaje')">
            <np-icon name="copy" />
            {{
              copiado() === 'mensaje'
                ? t('panel.compartirWeb.copiado')
                : t('panel.compartirWeb.copiarMensaje')
            }}
          </button>
          <button npButton variant="ghost" type="button" (click)="copiar(enlace, 'enlace')">
            <np-icon name="link-simple" />
            {{
              copiado() === 'enlace'
                ? t('panel.compartirWeb.copiado')
                : t('panel.compartirWeb.copiarEnlace')
            }}
          </button>
        </div>
      </section>
    </ng-container>
  `,
  styles: `
    .cw {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-3);
      padding: var(--np-space-4);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-lg);
      background: var(--np-surface-surface);
    }
    .cw h3,
    .cw p {
      margin: 0;
    }
    .cw p {
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-sm);
    }
    .cw label {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-1);
      font-size: var(--np-text-sm);
    }
    .cw__acciones {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-2);
    }
    @media (min-width: 40rem) {
      .cw__acciones {
        flex-direction: row;
        flex-wrap: wrap;
      }
    }
  `,
})
export class NpCompartirWeb {
  private readonly boda = inject(BodaStore);
  /** Donde la pareja mira su panel es el enlace de su boda: de `location`, sin tablas de entornos. */
  protected readonly enlace = inject(DOCUMENT).location.origin.replace(/\/+$/, '') + '/';

  protected readonly copiado = signal<'mensaje' | 'enlace' | null>(null);

  /** Se rehace si cambian los datos de la boda; lo que teclee la pareja manda hasta entonces. */
  protected readonly mensaje = linkedSignal(() => {
    const boda = this.boda.boda();
    const pareja = boda?.pareja;

    return mensajeDeInvitacion(MENSAJE_GENERAL, {
      nombre: '',
      novios: pareja ? [pareja.partnerA, pareja.partnerB].filter(Boolean).join(' y ') : '',
      fecha: boda?.weddingDate ? fechaLarga(boda.weddingDate, 'es') : '',
      enlace: this.enlace,
    });
  });

  protected readonly enlaceDeWhatsApp = computed(() => enlaceWhatsApp(this.mensaje(), null));

  protected editar(evento: Event): void {
    this.mensaje.set((evento.target as HTMLTextAreaElement).value);
  }

  protected async copiar(texto: string, que: 'mensaje' | 'enlace'): Promise<void> {
    try {
      await navigator.clipboard.writeText(texto);
      this.copiado.set(que);
    } catch {
      // Sin permiso de portapapeles el texto está a la vista y se puede
      // seleccionar a mano: un error aquí asusta más que ayuda.
      this.copiado.set(null);
    }
  }
}
