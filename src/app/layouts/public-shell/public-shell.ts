import { NgComponentOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Type,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

import { ResultadoTenant } from '../../core/tenant/tenant-loader';
import type { PaletaMarca } from '../../core/tenant/tenant-source';
import { plantillaDe } from '../../features/public-site/plantillas/catalogo';
import { cargarPlantilla } from '../../features/public-site/plantillas/cargador';
import { Fuentes } from '../../features/public-site/plantillas/fuentes';
import type { DatosPortada } from '../../features/public-site/plantillas/portada';
import { NpEmptyState } from '../../design-system/components/empty-state/empty-state';

/**
 * Envoltorio de la web pública de la boda.
 *
 * Todo lo que cuelgue de aquí lo descarga un invitado desde el móvil, a menudo
 * con mala cobertura. Presupuesto: 200 kB de JS comprimido. Nada del panel
 * puede acabar en este chunk.
 *
 * Esta envoltura **no diseña nada**: resuelve el estado de la boda, elige la
 * plantilla del catálogo y le pasa los datos. El diseño vive entero en la
 * plantilla, y por eso añadir la décima es escribir HTML y CSS.
 *
 * Cada estado tiene su pantalla. Ninguno cae en una página en blanco: quien
 * llega aquí ha tecleado un enlace que le han mandado, y merece saber qué pasa.
 */
@Component({
  selector: 'np-public-shell',
  imports: [NgComponentOutlet, TranslocoDirective, NpEmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[style]': 'variablesDeMarca()' },
  template: `
    <ng-container *transloco="let t">
      @switch (tenant().tipo) {
        @case ('ok') {
          @if (plantilla(); as componente) {
            <ng-container
              *ngComponentOutlet="componente; inputs: { datos: datosPortada() }"
            ></ng-container>
          }
          <!--
            Mientras la plantilla llega no se pinta nada: un esqueleto gris
            durante 150 ms parpadea más de lo que informa. El fondo de marca ya
            está puesto en el host, así que la espera se ve como una pausa, no
            como una página rota.
          -->
        }
        @case ('landing') {
          <!--
            Marcador honesto de la landing comercial, que es F5. Dice lo que es
            el producto en vez de fingir una web de boda que aquí no existe.
          -->
          <main class="np-landing">
            <h1>{{ t('app.name') }}</h1>
            <p>{{ t('app.tagline') }}</p>
          </main>
        }
        @case ('no-publicada') {
          <np-empty-state
            icon="eye-slash"
            [title]="t('publico.noPublicada.titulo')"
            [description]="t('publico.noPublicada.descripcion')"
          />
        }
        @case ('archivada') {
          <np-empty-state
            icon="clock-countdown"
            [title]="t('publico.archivada.titulo')"
            [description]="t('publico.archivada.descripcion')"
          />
        }
        @case ('error') {
          <np-empty-state
            icon="warning"
            [title]="t('publico.error.titulo')"
            [description]="t('publico.error.descripcion')"
          />
        }
        @default {
          <np-empty-state
            icon="magnifying-glass"
            [title]="t('publico.noEncontrada.titulo')"
            [description]="t('publico.noEncontrada.descripcion')"
          />
        }
      }
    </ng-container>
  `,
  styles: `
    :host {
      display: block;
      min-block-size: 100dvh;
      background: var(--np-marca-background, var(--np-surface-canvas));
    }
    .np-landing {
      display: grid;
      place-content: center;
      gap: var(--np-space-2);
      min-block-size: 100dvh;
      padding: var(--np-space-5);
      text-align: center;
      color: var(--np-surface-text);
    }
    .np-landing h1 {
      margin: 0;
      font-size: var(--np-text-3xl);
      font-weight: var(--np-weight-semibold);
    }
    .np-landing p {
      margin: 0;
      color: var(--np-surface-text-muted);
    }
  `,
})
export class PublicShell {
  private readonly fuentes = inject(Fuentes);

  /** Lo resuelve `tenantResolver` antes de que esto se monte. */
  readonly tenant = input.required<ResultadoTenant>();

  protected readonly plantilla = signal<Type<unknown> | null>(null);

  private readonly elegida = computed(() => {
    const t = this.tenant();
    return plantillaDe(t.tipo === 'ok' ? t.sitio.theme.templateId : null);
  });

  protected readonly datosPortada = computed<DatosPortada>(() => {
    const t = this.tenant();
    if (t.tipo !== 'ok') {
      return { nombres: { partnerA: '', partnerB: '' }, weddingDate: null, locale: 'es' };
    }
    return {
      nombres: t.sitio.coupleNames,
      weddingDate: t.sitio.weddingDate,
      locale: t.sitio.locale,
    };
  });

  /**
   * La paleta de la pareja, como variables CSS en el host.
   *
   * Las plantillas escriben `var(--np-marca-accent, <su reserva>)`, así que una
   * boda sin paleta elegida se ve con los colores de su plantilla y no en
   * blanco. Aquí no se inventa ningún color: o vienen los seis de la boda, o no
   * se pone ninguno (ver `tenant-source.firestore.ts`).
   */
  protected readonly variablesDeMarca = computed<Record<string, string>>(() => {
    const t = this.tenant();
    const paleta: PaletaMarca | null = t.tipo === 'ok' ? t.sitio.theme.palette : null;
    if (!paleta) return {} as Record<string, string>;

    return {
      '--np-marca-primary': paleta.primary,
      '--np-marca-secondary': paleta.secondary,
      '--np-marca-background': paleta.background,
      '--np-marca-surface': paleta.surface,
      '--np-marca-text': paleta.text,
      '--np-marca-accent': paleta.accent,
    };
  });

  constructor() {
    effect(() => {
      if (this.tenant().tipo !== 'ok') return;

      const plantilla = this.elegida();
      this.fuentes.cargar(plantilla);
      void cargarPlantilla(plantilla.id).then((componente) => this.plantilla.set(componente));
    });
  }
}
