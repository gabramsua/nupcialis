import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { TranslocoDirective } from '@jsverse/transloco';
import { NpEmptyState } from '../../design-system/components/empty-state/empty-state';
import { NpIcon } from '../../design-system/icons/icon';
import { ResultadoTenant } from '../../core/tenant/tenant-loader';

/**
 * Envoltorio de la web pública de la boda.
 *
 * Todo lo que cuelgue de aquí lo descarga un invitado desde el móvil, a menudo
 * con mala cobertura. Presupuesto: 200 kB de JS comprimido. Nada del panel
 * puede acabar en este chunk.
 *
 * Cada estado tiene su pantalla. Ninguno cae en una página en blanco: quien
 * llega aquí ha tecleado un enlace que le han mandado, y merece saber qué pasa.
 */
@Component({
  selector: 'np-public-shell',
  imports: [DatePipe, TranslocoDirective, NpIcon, NpEmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      @switch (tenant().tipo) {
        @case ('ok') {
          <main class="np-portada">
            <np-icon name="diamond" weight="fill" />
            <h1>{{ nombres() }}</h1>
            @if (fecha(); as f) {
              <p>{{ f | date: 'longDate' : undefined : locale() }}</p>
            }
          </main>
        }
        @case ('no-publicada') {
          <np-empty-state
            icon="eye-slash"
            title="Esta boda todavía no está publicada"
            description="Los novios están preparándola. Vuelve a intentarlo con el enlace que te envíen."
          />
        }
        @case ('archivada') {
          <np-empty-state
            icon="clock-countdown"
            title="Esta boda ya pasó"
            description="La web se archivó tras la celebración y su contenido ya no está disponible."
          />
        }
        @case ('error') {
          <np-empty-state
            icon="warning"
            title="No hemos podido cargar la boda"
            description="Puede ser un problema de conexión. Inténtalo de nuevo en un momento."
          />
        }
        @default {
          <np-empty-state
            icon="magnifying-glass"
            title="No encontramos esta boda"
            description="Revisa el enlace que te han enviado: puede que falte alguna letra."
          />
        }
      }
    </ng-container>
  `,
  styles: `
    :host {
      display: block;
      min-block-size: 100dvh;
    }
    .np-portada {
      display: grid;
      place-content: center;
      justify-items: center;
      gap: var(--np-space-2);
      min-block-size: 100dvh;
      text-align: center;
      color: var(--np-surface-text);
    }
    np-icon {
      --np-icon-size: 3rem;
      color: var(--np-cat-rosa);
    }
    h1 {
      margin: 0;
      font-size: var(--np-text-3xl);
      font-weight: var(--np-weight-semibold);
    }
    p {
      margin: 0;
      color: var(--np-surface-text-muted);
    }
  `,
})
export class PublicShell {
  /** Lo resuelve `tenantResolver` antes de que esto se monte. */
  readonly tenant = input.required<ResultadoTenant>();

  protected readonly nombres = computed(() => {
    const t = this.tenant();
    return t.tipo === 'ok' ? t.sitio.coupleNames : '';
  });

  protected readonly fecha = computed(() => {
    const t = this.tenant();
    return t.tipo === 'ok' ? t.sitio.weddingDate : null;
  });

  protected readonly locale = computed(() => {
    const t = this.tenant();
    return t.tipo === 'ok' ? t.sitio.locale : 'es';
  });
}
