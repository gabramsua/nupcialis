import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

import { NpAlert } from '../../../design-system/components/alert/alert';
import { NpButton } from '../../../design-system/components/button/button';
import { NpEmptyState } from '../../../design-system/components/empty-state/empty-state';
import { NpModal } from '../../../design-system/components/modal/modal';
import { NpStatusChip } from '../../../design-system/components/status-chip/status-chip';
import { NpIcon } from '../../../design-system/icons/icon';
import type { FalloLibroPanel, FirmaDelPanel } from '../../../core/libro/libro-panel-gateway';
import { LibroStore } from './libro.store';

type Filtro = 'todas' | 'visible' | 'hidden';

const FILTROS: readonly Filtro[] = ['todas', 'visible', 'hidden'];

/**
 * El libro de firmas, donde la pareja lo lee y lo modera (§8.15).
 *
 * Las firmas se publican al enviarlas y se quitan **a posteriori**: aquí se
 * lee lo que han escrito y se oculta o se borra lo que no corresponda. Ocultar
 * es reversible; borrar no, y por eso pide confirmación.
 *
 * Cada estado se dice con color, icono **y** texto (§9.1).
 */
@Component({
  selector: 'np-panel-libro',
  imports: [TranslocoDirective, NpAlert, NpButton, NpEmptyState, NpModal, NpStatusChip, NpIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <section class="lib">
        <header class="lib__intro">
          <h2>{{ t('panel.libro.titulo') }}</h2>
          <p>{{ t('panel.libro.ayuda') }}</p>
        </header>

        @if (store.fallo(); as fallo) {
          <np-alert status="declined" [heading]="t('panel.libro.errorGuardar')">
            <p>{{ textoDelFallo(fallo, t) }}</p>
          </np-alert>
        }

        @switch (store.estado()) {
          @case ('cargando') {
            <np-empty-state icon="book-open" [title]="t('panel.libro.cargando')" />
          }
          @default {
            <div class="lib__filtros" role="tablist" [attr.aria-label]="t('panel.libro.filtros')">
              @for (f of filtros; track f) {
                <button
                  type="button"
                  role="tab"
                  class="lib__filtro"
                  [class.lib__filtro--activo]="filtro() === f"
                  [attr.aria-selected]="filtro() === f"
                  (click)="filtro.set(f)"
                >
                  <span>{{ t('panel.libro.filtro.' + f) }}</span>
                  <strong>{{ cuantas(f) }}</strong>
                </button>
              }
            </div>

            @if (visibles().length === 0) {
              <np-empty-state icon="book-open" [title]="t('panel.libro.vacio.' + filtro())" />
            } @else {
              <ul class="lib__lista">
                @for (f of visibles(); track f.id) {
                  <li class="lib__firma">
                    <p class="lib__cabecera">
                      <strong>{{ f.autor }}</strong>
                      @if (f.cuando) {
                        <small>{{ cuando(f.cuando) }}</small>
                      }
                    </p>
                    <p class="lib__mensaje">{{ f.mensaje }}</p>

                    <div class="lib__pie">
                      <np-status-chip
                        [status]="f.status === 'visible' ? 'confirmed' : 'pending'"
                        [label]="t('panel.libro.estado.' + f.status)"
                      />
                      <div class="lib__acciones">
                        @if (f.status === 'visible') {
                          <button
                            npButton
                            size="sm"
                            variant="ghost"
                            type="button"
                            (click)="poner(f, 'hidden')"
                          >
                            <np-icon name="x" />
                            {{ t('panel.libro.ocultar') }}
                          </button>
                        } @else {
                          <button
                            npButton
                            size="sm"
                            variant="ghost"
                            type="button"
                            (click)="poner(f, 'visible')"
                          >
                            <np-icon name="check-circle" />
                            {{ t('panel.libro.mostrar') }}
                          </button>
                        }
                        <button
                          npButton
                          size="sm"
                          variant="ghost"
                          type="button"
                          (click)="borrando.set(f)"
                        >
                          <np-icon name="trash" />
                          {{ t('common.delete') }}
                        </button>
                      </div>
                    </div>
                  </li>
                }
              </ul>
            }
          }
        }

        @if (borrando(); as cual) {
          <np-modal [open]="true" [heading]="t('common.delete')" (closed)="borrando.set(null)">
            <p>{{ t('panel.libro.confirmarBorrado', { nombre: cual.autor }) }}</p>

            <div np-modal-actions>
              <button npButton variant="ghost" type="button" (click)="borrando.set(null)">
                {{ t('common.cancel') }}
              </button>
              <button
                npButton
                variant="danger"
                type="button"
                [loading]="borrandoYa()"
                (click)="borrar()"
              >
                <np-icon name="trash" />
                {{ t('common.delete') }}
              </button>
            </div>
          </np-modal>
        }
      </section>
    </ng-container>
  `,
  styles: `
    .lib__intro {
      margin-block-end: var(--np-space-4);
    }
    .lib__intro h2 {
      margin: 0;
      font-size: var(--np-text-xl);
      font-weight: var(--np-weight-semibold);
    }
    .lib__intro p {
      margin: var(--np-space-1) 0 0;
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-sm);
    }
    .lib__filtros {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: var(--np-space-2);
      margin-block-end: var(--np-space-3);
    }
    .lib__filtro {
      display: flex;
      align-items: center;
      gap: var(--np-space-2);
      min-block-size: 2.75rem;
      padding: 0 var(--np-space-3);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-md);
      background: var(--np-surface-surface);
      color: inherit;
      font: inherit;
      font-size: var(--np-text-sm);
      cursor: pointer;
    }
    .lib__filtro strong {
      margin-inline-start: auto;
    }
    .lib__filtro--activo {
      border-width: 2px;
      font-weight: var(--np-weight-semibold);
    }
    .lib__lista {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-2);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .lib__firma {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-2);
      padding: var(--np-space-3);
      border: 1px solid var(--np-surface-border);
      border-radius: var(--np-radius-md);
      background: var(--np-surface-surface);
    }
    .lib__cabecera {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: var(--np-space-3);
      margin: 0;
    }
    .lib__cabecera small {
      color: var(--np-surface-text-muted);
    }
    .lib__mensaje {
      margin: 0;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }
    .lib__pie {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--np-space-2);
    }
    .lib__acciones {
      display: flex;
      flex-wrap: wrap;
      gap: var(--np-space-1);
    }
  `,
})
export class PanelLibro {
  protected readonly store = inject(LibroStore);

  protected readonly filtros = FILTROS;
  protected readonly filtro = signal<Filtro>('todas');
  protected readonly borrando = signal<FirmaDelPanel | null>(null);
  protected readonly borrandoYa = signal(false);

  protected readonly visibles = computed(() => {
    const f = this.filtro();
    const todas = this.store.firmas();
    return f === 'todas' ? todas : todas.filter((x) => x.status === f);
  });

  constructor() {
    void this.store.cargar();
  }

  protected cuantas(filtro: Filtro): number {
    const c = this.store.cuenta();
    return filtro === 'todas' ? c.todas : filtro === 'visible' ? c.visibles : c.ocultas;
  }

  protected cuando(iso: string): string {
    return new Date(iso).toLocaleDateString('es', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  protected async poner(firma: FirmaDelPanel, estado: 'visible' | 'hidden'): Promise<void> {
    await this.store.cambiarEstado(firma.id, estado);
  }

  protected async borrar(): Promise<void> {
    const cual = this.borrando();
    if (!cual || this.borrandoYa()) return;

    this.borrandoYa.set(true);
    const resultado = await this.store.borrar(cual.id);
    this.borrandoYa.set(false);
    if (resultado.ok) this.borrando.set(null);
  }

  protected textoDelFallo(fallo: FalloLibroPanel, t: (clave: string) => string): string {
    return t('panel.libro.fallo.' + (fallo.tipo === 'error' ? 'desconocido' : fallo.tipo));
  }
}
