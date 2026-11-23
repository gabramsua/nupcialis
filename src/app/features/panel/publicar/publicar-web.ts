import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';

import { PUERTA_LLAMADAS, objeto } from '../../../core/llamadas/llamadas-gateway';
import type { FalloGestion } from '../../../core/superadmin/gestion-gateway';
import { NpAlert } from '../../../design-system/components/alert/alert';
import { NpButton } from '../../../design-system/components/button/button';
import { NpModal } from '../../../design-system/components/modal/modal';
import { NpStatusChip } from '../../../design-system/components/status-chip/status-chip';
import { NpIcon } from '../../../design-system/icons/icon';
import { BodaStore } from '../boda.store';
import { faltaParaPublicar } from './publicar';

/**
 * «Publicar mi web» y «Volver a borrador» (D-54).
 *
 * La pareja decide cuándo su web se abre a los invitados. Publicar pide el
 * mínimo (nombres, fecha y dirección) y avisa de que **las partidas de prueba
 * del quiz se borran**; volver a borrador siempre se puede. Quien archiva y
 * reactiva sigue siendo el superadmin.
 *
 * **Dónde se pone** (D-55): con la web en borrador, el botón de publicar va
 * **arriba del todo** del resumen (`posicion="arriba"`), que es lo primero que
 * la pareja tiene que hacer; con la web publicada, ese bloque desaparece de
 * arriba y «Volver a borrador» queda **al final y pequeño** (`posicion="abajo"`),
 * porque es algo que casi nadie va a querer. Sin `posicion` salen los dos.
 *
 * Opcional por diseño: si no hay puerto de llamadas (una pantalla probada
 * sola), el bloque simplemente no sale.
 */
@Component({
  selector: 'np-publicar-web',
  imports: [RouterLink, TranslocoDirective, NpAlert, NpButton, NpIcon, NpModal, NpStatusChip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      @if (hayPuerto && boda.boda(); as b) {
        @if (b.status !== 'archived') {
          @if (b.status === 'draft' && posicion() !== 'abajo') {
            <section class="pw" data-estado="draft" aria-labelledby="pw-titulo">
              <div class="pw__cab">
                <h3 id="pw-titulo">{{ t('panel.publicar.titulo') }}</h3>
                <np-status-chip status="pending" [label]="t('panel.estado.draft')" />
              </div>

              <p>{{ t('panel.publicar.borrador') }}</p>
              @if (falta().length > 0) {
                <np-alert status="attention" [heading]="t('panel.publicar.falta')">
                  <ul>
                    @for (f of falta(); track f) {
                      <li>{{ t('panel.publicar.faltaDe.' + f) }}</li>
                    }
                  </ul>
                  <a routerLink="/panel/datos">{{ t('panel.publicar.irADatos') }}</a>
                </np-alert>
              }
              <button
                npButton
                type="button"
                [disabled]="falta().length > 0"
                (click)="abrir('active')"
              >
                <np-icon name="eye" />
                {{ t('panel.publicar.publicar') }}
              </button>
            </section>
          }

          @if (b.status === 'active' && posicion() !== 'arriba') {
            <section class="pw pw--pequena" data-estado="active" aria-labelledby="pw-titulo-pie">
              <div class="pw__cab">
                <h3 id="pw-titulo-pie">{{ t('panel.publicar.titulo') }}</h3>
                <np-status-chip status="confirmed" [label]="t('panel.estado.active')" />
              </div>
              <p class="pw__url">
                <np-icon name="link-simple" />
                <a [href]="web()" target="_blank" rel="noopener">{{ web() }}</a>
              </p>
              <button npButton variant="ghost" size="sm" type="button" (click)="abrir('draft')">
                <np-icon name="eye-slash" />
                {{ t('panel.publicar.aBorrador') }}
              </button>
            </section>
          }

          @if (resultado() === 'publicada' && posicion() !== 'abajo') {
            <np-alert status="confirmed" [heading]="t('panel.publicar.yaPublicada')" />
          } @else if (resultado() === 'borrador' && posicion() !== 'arriba') {
            <np-alert status="confirmed" [heading]="t('panel.publicar.yaBorrador')" />
          }
        }

        @if (confirmando(); as destino) {
          <np-modal
            [open]="true"
            [heading]="t('panel.publicar.confirmar.' + destino + '.titulo')"
            (closed)="cancelar()"
          >
            <p>{{ t('panel.publicar.confirmar.' + destino + '.texto') }}</p>
            @if (destino === 'active' && b.modulos['quiz']?.enabled) {
              <np-alert status="attention" [heading]="t('panel.publicar.quizAviso')">
                <p>{{ t('panel.publicar.quizAvisoTexto') }}</p>
              </np-alert>
            }
            @if (fallo()) {
              <np-alert status="declined" [heading]="t('panel.publicar.error')">
                <p>{{ t('panel.publicar.errorTexto') }}</p>
                @if (detalleFallo(); as detalle) {
                  <p class="pw__detalle">
                    {{ detalle.texto ?? t('panel.publicar.detalle.' + detalle.clave) }}
                  </p>
                }
              </np-alert>
            }
            <div np-modal-actions>
              <button npButton variant="ghost" type="button" (click)="cancelar()">
                {{ t('common.cancel') }}
              </button>
              <button npButton type="button" [loading]="ocupado()" (click)="confirmar(destino)">
                {{ t('panel.publicar.confirmar.' + destino + '.boton') }}
              </button>
            </div>
          </np-modal>
        }
      }
    </ng-container>
  `,
  styles: `
    :host {
      display: block;
    }
    .pw {
      display: grid;
      gap: var(--np-space-3);
      padding: var(--np-space-4);
      background: var(--np-surface-surface);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-md);
    }
    .pw[data-estado='draft'] {
      border-color: var(--np-cat-rosa);
    }
    .pw--pequena {
      gap: var(--np-space-2);
      padding: var(--np-space-3);
      font-size: var(--np-text-sm);
      background: transparent;
    }
    .pw--pequena h3 {
      font-size: var(--np-text-sm);
      font-weight: 600;
    }
    .pw--pequena button {
      justify-self: start;
    }
    .pw__cab {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--np-space-3);
    }
    h3,
    p {
      margin: 0;
    }
    .pw__url {
      display: flex;
      align-items: center;
      gap: var(--np-space-2);
      font-size: var(--np-text-sm);
      word-break: break-all;
    }
    ul {
      margin: 0;
      padding-inline-start: var(--np-space-4);
    }
  `,
})
export class PublicarWeb {
  private readonly puerta = inject(PUERTA_LLAMADAS, { optional: true });
  private readonly documento = inject(DOCUMENT);
  protected readonly boda = inject(BodaStore);

  /** Qué parte se pinta: `arriba` el publicar, `abajo` el volver a borrador, o las dos. */
  readonly posicion = input<'arriba' | 'abajo' | 'todo'>('todo');

  protected readonly hayPuerto = this.puerta !== null;
  protected readonly confirmando = signal<'active' | 'draft' | null>(null);
  protected readonly ocupado = signal(false);
  protected readonly fallo = signal(false);
  private readonly falloCrudo = signal<FalloGestion | null>(null);

  /** Qué ha pasado de verdad, para no quedarnos en un «inténtalo otra vez». */
  protected readonly detalleFallo = computed(() => {
    const f = this.falloCrudo();
    if (!f) return null;
    return f.tipo === 'error' ? { texto: f.mensaje } : { clave: f.tipo };
  });
  protected readonly resultado = signal<'publicada' | 'borrador' | null>(null);

  protected readonly falta = computed(() => {
    const b = this.boda.boda();
    return b ? faltaParaPublicar(b) : [];
  });

  protected web(): string {
    return this.documento.location.origin;
  }

  protected abrir(destino: 'active' | 'draft'): void {
    this.fallo.set(false);
    this.resultado.set(null);
    this.confirmando.set(destino);
  }

  protected cancelar(): void {
    this.confirmando.set(null);
  }

  protected async confirmar(destino: 'active' | 'draft'): Promise<void> {
    if (!this.puerta) return;
    this.ocupado.set(true);
    this.fallo.set(false);
    const r = await this.puerta.llamar('setMyWebStatus', { status: destino }, (crudo) =>
      typeof objeto(crudo)['status'] === 'string' ? true : null,
    );
    this.ocupado.set(false);

    if (!r.ok) {
      this.falloCrudo.set(r.fallo);
      this.fallo.set(true);
      return;
    }
    this.confirmando.set(null);
    this.resultado.set(destino === 'active' ? 'publicada' : 'borrador');
    await this.boda.cargar();
  }
}
