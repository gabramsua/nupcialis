import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';

import { PUERTA_AUTH } from '../../core/auth/auth-gateway';
import { SessionStore } from '../../core/auth/session.store';
import { BodaStore } from '../../features/panel/boda.store';
import { NpAlert } from '../../design-system/components/alert/alert';
import { NpButton } from '../../design-system/components/button/button';
import { NpStatusChip } from '../../design-system/components/status-chip/status-chip';
import { NpIcon } from '../../design-system/icons/icon';

/**
 * Panel privado de la pareja. Chunk diferido: no entra en la web pública.
 *
 * La navegación la dibujan **los módulos activos de esta boda**, no una lista
 * fija de pantallas: cada pareja ve su panel, no el catálogo del producto.
 *
 * Se diseña primero para móvil (REQUISITOS §9.1): la pareja marca una tarea en
 * el sofá con el teléfono, no abriendo el portátil. Por eso el menú es una fila
 * que se desliza en pantalla estrecha y una columna a partir de tableta.
 */
@Component({
  selector: 'np-panel-shell',
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    TranslocoDirective,
    NpAlert,
    NpButton,
    NpStatusChip,
    NpIcon,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <header class="np-panel__cabecera">
        <span class="np-panel__marca">
          <np-icon name="diamond" weight="fill" />
          {{ t('app.name') }}
        </span>

        @if (boda.boda(); as datos) {
          <np-status-chip
            [status]="datos.status === 'active' ? 'confirmed' : 'pending'"
            [label]="t('panel.estado.' + datos.status)"
          />
        }

        <span class="np-panel__quien">{{ sesion.sesion().email }}</span>
        <button npButton variant="ghost" size="sm" (click)="salir()">
          {{ t('panel.salir') }}
        </button>
      </header>

      @switch (boda.estado()) {
        @case ('cargando') {
          <p class="np-panel__esperando">{{ t('common.loading') }}</p>
        }
        @case ('sin-boda') {
          <np-alert status="attention" [heading]="t('panel.sinBoda.titulo')">
            <p>{{ t('panel.sinBoda.descripcion') }}</p>
          </np-alert>
        }
        @case ('error') {
          <np-alert status="declined" [heading]="t('panel.error')">
            <p>{{ boda.error() }}</p>
            <button npButton size="sm" (click)="boda.cargar()">{{ t('common.retry') }}</button>
          </np-alert>
        }
        @default {
          <div class="np-panel__cuerpo">
            <nav class="np-panel__menu" [attr.aria-label]="t('panel.navegacion')">
              <a
                class="np-panel__enlace"
                routerLink="/panel"
                routerLinkActive="np-panel__enlace--activo"
                [routerLinkActiveOptions]="{ exact: true }"
              >
                <np-icon name="chart-bar" />
                {{ t('panel.resumen') }}
              </a>
              <a
                class="np-panel__enlace"
                routerLink="/panel/datos"
                routerLinkActive="np-panel__enlace--activo"
              >
                <np-icon name="calendar" />
                {{ t('panel.datos.titulo') }}
              </a>
              <a
                class="np-panel__enlace"
                routerLink="/panel/web"
                routerLinkActive="np-panel__enlace--activo"
              >
                <np-icon name="eye" />
                {{ t('panel.secciones.titulo') }}
              </a>
              <a
                class="np-panel__enlace"
                routerLink="/panel/diseno"
                routerLinkActive="np-panel__enlace--activo"
              >
                <np-icon name="palette" />
                {{ t('panel.diseno.titulo') }}
              </a>

              <hr class="np-panel__separador" />

              @for (entrada of boda.menu(); track entrada.modulo) {
                <a
                  class="np-panel__enlace"
                  [routerLink]="['/panel', entrada.modulo]"
                  routerLinkActive="np-panel__enlace--activo"
                >
                  <np-icon [name]="entrada.icono" />
                  <span class="np-panel__nombre">{{ t('panel.modulo.' + entrada.modulo) }}</span>
                  <!--
                    La visibilidad se ve en el menú a propósito: sin esto, la
                    pareja no entiende por qué su web parece vacía si tiene ocho
                    módulos encendidos.
                  -->
                  @if (entrada.visibilidad !== 'visible') {
                    <np-status-chip
                      status="pending"
                      [label]="t('panel.visibilidad.' + entrada.visibilidad)"
                    />
                  }
                </a>
              }
            </nav>

            <main class="np-panel__contenido">
              @if (boda.sinPublicar() > 0) {
                <np-alert
                  status="info"
                  [heading]="t('panel.ocultos', { n: boda.sinPublicar() })"
                ></np-alert>
              }
              <router-outlet />
            </main>
          </div>
        }
      }
    </ng-container>
  `,
  styles: `
    :host {
      display: block;
      min-block-size: 100dvh;
      background: var(--np-surface-canvas);
    }
    .np-panel__cabecera {
      display: flex;
      align-items: center;
      gap: var(--np-space-3);
      padding: var(--np-space-3) var(--np-space-4);
      border-block-end: 1px solid var(--np-surface-border);
      background: var(--np-surface-surface);
    }
    .np-panel__marca {
      display: inline-flex;
      align-items: center;
      gap: var(--np-space-2);
      font-weight: var(--np-weight-semibold);
    }
    .np-panel__marca np-icon {
      color: var(--np-cat-rosa);
    }
    .np-panel__quien {
      margin-inline-start: auto;
      color: var(--np-surface-text-muted);
      font-size: var(--np-text-sm);
    }
    .np-panel__esperando {
      padding: var(--np-space-5) var(--np-space-4);
      color: var(--np-surface-text-muted);
    }
    .np-panel__cuerpo {
      display: grid;
      gap: var(--np-space-4);
      padding: var(--np-space-4);
    }
    /* Móvil primero: el menú es una fila que se desliza. */
    .np-panel__menu {
      display: flex;
      gap: var(--np-space-2);
      overflow-x: auto;
      padding-block-end: var(--np-space-2);
    }
    .np-panel__enlace {
      display: inline-flex;
      align-items: center;
      gap: var(--np-space-2);
      flex-shrink: 0;
      min-block-size: 2.75rem;
      padding-inline: var(--np-space-3);
      border-radius: var(--np-radius-md);
      color: var(--np-surface-text);
      text-decoration: none;
      font-size: var(--np-text-sm);
      white-space: nowrap;
    }
    .np-panel__enlace:hover {
      background: var(--np-surface-alt);
    }
    .np-panel__enlace--activo {
      background: var(--np-surface-alt);
      font-weight: var(--np-weight-semibold);
    }
    .np-panel__separador {
      flex-shrink: 0;
      inline-size: 1px;
      margin: var(--np-space-2) 0;
      border: 0;
      background: var(--np-surface-border);
    }
    .np-panel__contenido {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-4);
      min-inline-size: 0;
    }
    @media (min-width: 48rem) {
      .np-panel__cuerpo {
        grid-template-columns: 14rem minmax(0, 1fr);
        align-items: start;
        padding: var(--np-space-5);
      }
      .np-panel__menu {
        flex-direction: column;
        overflow-x: visible;
        padding-block-end: 0;
      }
      .np-panel__separador {
        inline-size: auto;
        block-size: 1px;
      }
      .np-panel__nombre {
        margin-inline-end: auto;
      }
      .np-panel__enlace {
        white-space: normal;
      }
    }
  `,
})
export class PanelShell {
  protected readonly sesion = inject(SessionStore);
  protected readonly boda = inject(BodaStore);
  private readonly puerta = inject(PUERTA_AUTH);

  protected async salir(): Promise<void> {
    await this.puerta.salir();
    location.assign('/panel/acceso');
  }
}
