import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

import { PUERTA_LLAMADAS } from '../../../core/llamadas/llamadas-gateway';
import type { FalloGestion } from '../../../core/superadmin/gestion-gateway';
import { NpAlert } from '../../../design-system/components/alert/alert';
import { NpButton } from '../../../design-system/components/button/button';
import { NpEmptyState } from '../../../design-system/components/empty-state/empty-state';
import { NpInput } from '../../../design-system/components/field/input';
import { NpIcon } from '../../../design-system/icons/icon';
import { textoDeFalloSuperadmin } from '../texto-de-fallo';
import {
  ESTADOS,
  leerAviso,
  leerOk,
  leerSolicitudes,
  nuevas,
  type Estado,
  type Solicitud,
} from './solicitudes';

type Carga = 'cargando' | 'lista' | 'error';

/**
 * La bandeja de las solicitudes de la HOME (D-68): las parejas que han pedido
 * su web por el formulario. Cada una se marca como contactada, convertida o
 * descartada y admite una nota. Arriba, el correo al que se avisa de cada
 * solicitud nueva (vacío = sin aviso; la bandeja funciona igual).
 */
@Component({
  selector: 'np-solicitudes',
  imports: [TranslocoDirective, NpAlert, NpButton, NpEmptyState, NpIcon, NpInput],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <header class="so__cab">
        <h1>{{ t('superadmin.solicitudes.titulo') }}</h1>
        <p>{{ t('superadmin.solicitudes.ayuda') }}</p>
      </header>

      <main class="so__cuerpo">
        @switch (carga()) {
          @case ('cargando') {
            <np-empty-state icon="clock-countdown" [title]="t('superadmin.solicitudes.cargando')" />
          }
          @case ('error') {
            <np-alert status="declined" [heading]="t('superadmin.solicitudes.errorCarga')">
              <p>{{ textoDeFallo(fallo(), t) }}</p>
              <button npButton size="sm" type="button" (click)="cargar()">
                <np-icon name="arrows-clockwise" />
                {{ t('common.retry') }}
              </button>
            </np-alert>
          }
          @default {
            <section class="so__aviso" aria-labelledby="so-aviso">
              <h2 id="so-aviso">{{ t('superadmin.solicitudes.avisoTitulo') }}</h2>
              <p>{{ t('superadmin.solicitudes.avisoAyuda') }}</p>
              <div class="so__aviso-fila">
                <input
                  npInput
                  type="email"
                  name="notifyEmail"
                  [attr.aria-label]="t('superadmin.solicitudes.avisoTitulo')"
                  [value]="correo()"
                  (input)="correo.set(valorDe($event))"
                />
                <button
                  npButton
                  type="button"
                  [disabled]="guardandoAviso() || correo().trim() === guardado()"
                  (click)="guardarAviso()"
                >
                  {{ t('superadmin.solicitudes.guardarAviso') }}
                </button>
              </div>
              @if (avisoGuardado()) {
                <small role="status">{{ t('superadmin.solicitudes.avisoGuardado') }}</small>
              }
              @if (errorAviso(); as e) {
                <small role="alert" class="so__error">{{
                  t('superadmin.solicitudes.errorAviso.' + e)
                }}</small>
              }
            </section>

            @if (solicitudes().length === 0) {
              <np-empty-state
                icon="envelope"
                [title]="t('superadmin.solicitudes.ninguna')"
                [description]="t('superadmin.solicitudes.ningunaDescripcion')"
              />
            } @else {
              <p class="so__total">
                {{
                  t('superadmin.solicitudes.resumen', {
                    total: solicitudes().length,
                    nuevas: sinAtender(),
                  })
                }}
              </p>
              @for (s of solicitudes(); track s.id) {
                <article class="so__item" [attr.data-estado]="s.status">
                  <header class="so__item-cab">
                    <h2>{{ s.names }}</h2>
                    <time>{{ fecha(s.createdAt) }}</time>
                  </header>
                  <dl class="so__datos">
                    <div>
                      <dt>{{ t('superadmin.solicitudes.correo') }}</dt>
                      <dd>
                        <a [href]="'mailto:' + s.email">{{ s.email }}</a>
                      </dd>
                    </div>
                    @if (s.phone) {
                      <div>
                        <dt>{{ t('superadmin.solicitudes.telefono') }}</dt>
                        <dd>{{ s.phone }}</dd>
                      </div>
                    }
                    @if (s.weddingDate) {
                      <div>
                        <dt>{{ t('superadmin.solicitudes.fecha') }}</dt>
                        <dd>{{ s.weddingDate }}</dd>
                      </div>
                    }
                    <div>
                      <dt>{{ t('superadmin.solicitudes.plan') }}</dt>
                      <dd>{{ t('superadmin.solicitudes.planes.' + s.plan) }}</dd>
                    </div>
                  </dl>
                  @if (s.message) {
                    <p class="so__mensaje">{{ s.message }}</p>
                  }
                  <div class="so__gestion">
                    <label>
                      <span>{{ t('superadmin.solicitudes.estado') }}</span>
                      <select (change)="cambiarEstado(s, valorDe($event))">
                        @for (e of estados; track e) {
                          <option [value]="e" [selected]="e === s.status">
                            {{ t('superadmin.solicitudes.estados.' + e) }}
                          </option>
                        }
                      </select>
                    </label>
                    <label>
                      <span>{{ t('superadmin.solicitudes.nota') }}</span>
                      <input
                        npInput
                        type="text"
                        maxlength="600"
                        [value]="s.note"
                        (change)="cambiarNota(s, valorDe($event))"
                      />
                    </label>
                  </div>
                  @if (errorDe() === s.id) {
                    <small role="alert" class="so__error">
                      {{ t('superadmin.solicitudes.errorGuardar') }}
                    </small>
                  }
                </article>
              }
            }
          }
        }
      </main>
    </ng-container>
  `,
  styles: `
    :host {
      display: block;
    }
    .so__cab,
    .so__cuerpo {
      display: grid;
      gap: var(--np-space-3);
      max-inline-size: 56rem;
      margin-inline: auto;
      padding: var(--np-space-4);
    }
    .so__cab h1,
    .so__cab p {
      margin: 0;
    }
    .so__cab p {
      color: var(--np-surface-text-muted);
    }
    .so__aviso,
    .so__item {
      display: grid;
      gap: var(--np-space-2);
      padding: var(--np-space-4);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-lg);
      background: var(--np-surface-surface);
    }
    .so__aviso h2,
    .so__aviso p,
    .so__item h2 {
      margin: 0;
    }
    .so__aviso p,
    .so__aviso small,
    .so__total {
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-sm);
    }
    .so__aviso-fila {
      display: flex;
      flex-wrap: wrap;
      gap: var(--np-space-2);
    }
    .so__aviso-fila input {
      flex: 1 1 16rem;
    }
    .so__item[data-estado='new'] {
      border-inline-start: 4px solid var(--np-status-pending-border, currentColor);
    }
    .so__item[data-estado='discarded'] {
      opacity: 0.65;
    }
    .so__item-cab {
      display: flex;
      justify-content: space-between;
      gap: var(--np-space-2);
      align-items: baseline;
    }
    .so__item-cab time {
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-sm);
    }
    .so__datos {
      display: flex;
      flex-wrap: wrap;
      gap: var(--np-space-2) var(--np-space-5);
      margin: 0;
    }
    .so__datos dt {
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-sm);
    }
    .so__datos dd {
      margin: 0;
    }
    .so__mensaje {
      margin: 0;
      white-space: pre-wrap;
    }
    .so__gestion {
      display: grid;
      grid-template-columns: minmax(10rem, 14rem) 1fr;
      gap: var(--np-space-3);
    }
    .so__gestion label {
      display: grid;
      gap: var(--np-space-1);
      font-size: var(--np-text-sm);
    }
    .so__error {
      color: var(--np-status-declined-text, #b3261e);
    }
    @media (max-width: 40rem) {
      .so__gestion {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class PantallaSolicitudes {
  private readonly llamadas = inject(PUERTA_LLAMADAS);

  protected readonly estados = ESTADOS;
  protected readonly carga = signal<Carga>('cargando');
  protected readonly fallo = signal<FalloGestion | null>(null);
  protected readonly solicitudes = signal<readonly Solicitud[]>([]);
  protected readonly sinAtender = computed(() => nuevas(this.solicitudes()));

  protected readonly guardado = signal('');
  protected readonly correo = signal('');
  protected readonly guardandoAviso = signal(false);
  protected readonly avisoGuardado = signal(false);
  protected readonly errorAviso = signal<string | null>(null);
  protected readonly errorDe = signal<string | null>(null);

  constructor() {
    void this.cargar();
  }

  protected async cargar(): Promise<void> {
    this.carga.set('cargando');
    const r = await this.llamadas.llamar('listHomeRequests', {}, leerSolicitudes);
    if (!r.ok) {
      this.fallo.set(r.fallo);
      this.carga.set('error');
      return;
    }
    this.solicitudes.set(r.datos.solicitudes);
    this.guardado.set(r.datos.notifyEmail);
    this.correo.set(r.datos.notifyEmail);
    this.carga.set('lista');
  }

  protected textoDeFallo(fallo: FalloGestion | null, t: (clave: string) => string): string {
    return textoDeFalloSuperadmin(fallo, t);
  }

  protected valorDe(e: Event): string {
    return (e.target as HTMLInputElement | HTMLSelectElement).value;
  }

  protected fecha(ms: number): string {
    return ms > 0
      ? new Date(ms).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })
      : '';
  }

  protected async guardarAviso(): Promise<void> {
    this.guardandoAviso.set(true);
    this.avisoGuardado.set(false);
    this.errorAviso.set(null);
    const r = await this.llamadas.llamar(
      'saveHomeRequestSettings',
      { notifyEmail: this.correo().trim() },
      leerAviso,
    );
    this.guardandoAviso.set(false);
    if (!r.ok) {
      const invalido = r.fallo.tipo === 'invalido';
      this.errorAviso.set(invalido ? 'correo' : 'otro');
      return;
    }
    this.guardado.set(r.datos);
    this.correo.set(r.datos);
    this.avisoGuardado.set(true);
  }

  protected async cambiarEstado(s: Solicitud, estado: string): Promise<void> {
    await this.actualizar(s, { status: estado as Estado, note: s.note });
  }

  protected async cambiarNota(s: Solicitud, nota: string): Promise<void> {
    await this.actualizar(s, { status: s.status, note: nota });
  }

  private async actualizar(s: Solicitud, cambio: { status: Estado; note: string }): Promise<void> {
    this.errorDe.set(null);
    const r = await this.llamadas.llamar('updateHomeRequest', { id: s.id, ...cambio }, leerOk);
    if (!r.ok) {
      this.errorDe.set(s.id);
      return;
    }
    this.solicitudes.update((l) => l.map((x) => (x.id === s.id ? { ...x, ...cambio } : x)));
  }
}
