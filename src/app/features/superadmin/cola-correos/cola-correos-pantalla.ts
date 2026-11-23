import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

import { PUERTA_LLAMADAS } from '../../../core/llamadas/llamadas-gateway';
import type { FalloGestion } from '../../../core/superadmin/gestion-gateway';
import { NpAlert } from '../../../design-system/components/alert/alert';
import { NpButton } from '../../../design-system/components/button/button';
import { NpIcon } from '../../../design-system/icons/icon';
import { esOk } from '../correos/correos';
import { textoDeFalloSuperadmin } from '../texto-de-fallo';
import { ESTADOS_CORREO, leerCola, type ColaDeCorreos, type CorreoDeLaCola } from './cola-correos';

type Carga = 'cargando' | 'lista' | 'error';

/**
 * La cola de correos (D-55): cuántos hay y cuáles son.
 *
 * Mientras la extensión «Trigger Email» no esté instalada, ningún correo sale:
 * se queda en la colección `mail`, «en cola». Esta pantalla es donde se ve qué
 * está pendiente para poder mandarlo a mano (copiando el enlace desde la ficha de
 * la boda) o descartarlo. No enseña el cuerpo: lleva el enlace de acceso.
 */
@Component({
  selector: 'np-cola-correos',
  imports: [TranslocoDirective, NpAlert, NpButton, NpIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <header class="cc__cabecera">
        <h1>{{ t('superadmin.cola.titulo') }}</h1>
        <p>{{ t('superadmin.cola.ayuda') }}</p>
      </header>

      <main class="cc__cuerpo">
        @switch (carga()) {
          @case ('cargando') {
            <p>{{ t('superadmin.cola.cargando') }}</p>
          }
          @case ('error') {
            <np-alert status="declined" [heading]="t('superadmin.cola.error')">
              <p>{{ textoDeFallo(fallo(), t) }}</p>
              <button npButton size="sm" type="button" (click)="cargar()">
                <np-icon name="arrows-clockwise" />
                {{ t('common.retry') }}
              </button>
            </np-alert>
          }
          @default {
            @if (cola(); as c) {
              <p class="cc__total" data-total>
                {{ t('superadmin.cola.total', { n: c.total }) }}
              </p>
              <ul class="cc__resumen">
                @for (e of estados; track e) {
                  <li>
                    <strong>{{ c.porEstado[e] }}</strong>
                    <span>{{ t('superadmin.cola.estado.' + e) }}</span>
                  </li>
                }
              </ul>

              @if (c.porEstado['en-cola'] > 0) {
                <np-alert status="attention" [heading]="t('superadmin.cola.avisoTitulo')">
                  <p>{{ t('superadmin.cola.aviso') }}</p>
                </np-alert>
              }

              <div class="cc__acciones">
                <button npButton variant="secondary" size="sm" type="button" (click)="cargar()">
                  <np-icon name="arrows-clockwise" />
                  {{ t('superadmin.cola.actualizar') }}
                </button>
              </div>

              @if (c.correos.length === 0) {
                <p>{{ t('superadmin.cola.vacia') }}</p>
              } @else {
                <div class="np-table-scroll">
                  <table class="np-table">
                    <thead>
                      <tr>
                        <th>{{ t('superadmin.cola.col.para') }}</th>
                        <th>{{ t('superadmin.cola.col.asunto') }}</th>
                        <th>{{ t('superadmin.cola.col.tipo') }}</th>
                        <th>{{ t('superadmin.cola.col.estado') }}</th>
                        <th>{{ t('superadmin.cola.col.fecha') }}</th>
                        <th>{{ t('superadmin.bodas.columna.acciones') }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (m of c.correos; track m.id) {
                        <tr>
                          <td>{{ m.para.join(', ') }}</td>
                          <td>{{ m.asunto }}</td>
                          <td>{{ nombreDeTipo(m, t) }}</td>
                          <td>
                            {{ t('superadmin.cola.estado.' + m.estado) }}
                            @if (m.error) {
                              <small class="cc__error">{{ m.error }}</small>
                            }
                          </td>
                          <td>{{ fecha(m.creadoMs) }}</td>
                          <td>
                            <button
                              npButton
                              size="sm"
                              variant="danger"
                              type="button"
                              [loading]="descartando() === m.id"
                              (click)="descartar(m)"
                            >
                              <np-icon name="trash" />
                              {{ t('superadmin.cola.descartar') }}
                            </button>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
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
      min-block-size: 100dvh;
      background: var(--np-surface-canvas);
    }
    .cc__cabecera {
      display: grid;
      gap: var(--np-space-2);
      padding: var(--np-space-4);
      background: var(--np-surface-surface);
      border-block-end: 1px solid var(--np-surface-border);
    }
    .cc__cabecera h1,
    .cc__cabecera p {
      margin: 0;
    }
    .cc__cabecera p,
    .cc__error {
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-sm);
    }
    .cc__error {
      display: block;
      color: var(--np-declined-fg);
    }
    .cc__cuerpo {
      display: grid;
      gap: var(--np-space-4);
      padding: var(--np-space-4);
      max-inline-size: 70rem;
      margin-inline: auto;
    }
    .cc__total {
      margin: 0;
      font-size: var(--np-text-lg);
      font-weight: 600;
    }
    .cc__resumen {
      display: flex;
      flex-wrap: wrap;
      gap: var(--np-space-3);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .cc__resumen li {
      display: grid;
      min-inline-size: 7rem;
      padding: var(--np-space-3);
      background: var(--np-surface-surface);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-md);
    }
    .cc__resumen strong {
      font-size: var(--np-text-xl);
    }
    .cc__resumen span {
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-sm);
    }
    .cc__acciones {
      display: flex;
      gap: var(--np-space-2);
    }
  `,
})
export class PantallaColaCorreos {
  private readonly puerta = inject(PUERTA_LLAMADAS);

  protected readonly estados = ESTADOS_CORREO;
  protected readonly carga = signal<Carga>('cargando');
  protected readonly fallo = signal<FalloGestion | null>(null);
  protected readonly cola = signal<ColaDeCorreos | null>(null);
  protected readonly descartando = signal<string | null>(null);

  protected readonly textoDeFallo = textoDeFalloSuperadmin;

  constructor() {
    void this.cargar();
  }

  protected async cargar(): Promise<void> {
    this.carga.set('cargando');
    const r = await this.puerta.llamar('listMailQueue', {}, leerCola);
    if (!r.ok) {
      this.fallo.set(r.fallo);
      this.carga.set('error');
      return;
    }
    this.cola.set(r.datos);
    this.carga.set('lista');
  }

  protected async descartar(correo: CorreoDeLaCola): Promise<void> {
    this.descartando.set(correo.id);
    const r = await this.puerta.llamar('discardMailItem', { id: correo.id }, esOk);
    this.descartando.set(null);
    if (!r.ok) {
      this.fallo.set(r.fallo);
      this.carga.set('error');
      return;
    }
    await this.cargar();
  }

  protected nombreDeTipo(m: CorreoDeLaCola, t: (clave: string) => string): string {
    return m.plantilla === '' ? '—' : t('superadmin.correos.nombre.' + m.plantilla);
  }

  protected fecha(ms: number): string {
    if (ms === 0) return '—';
    return new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'short' }).format(
      new Date(ms),
    );
  }
}
