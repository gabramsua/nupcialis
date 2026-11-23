import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

import { NpAlert } from '../../../design-system/components/alert/alert';
import { NpIcon } from '../../../design-system/icons/icon';
import { PLANTILLAS, type PlantillaId } from '../../public-site/plantillas/catalogo';
import { Fuentes } from '../../public-site/plantillas/fuentes';
import { BodaStore } from '../boda.store';

/**
 * Elegir la plantilla de la web.
 *
 * El catálogo es cerrado a propósito: la pareja elige entre diseños terminados,
 * no maqueta. Ver `CLAUDE.md` y REQUISITOS §8.1.
 *
 * Cada opción se enseña con una **miniatura dibujada con los colores y la
 * tipografía reales de esa plantilla**, no con una captura ni con un rectángulo
 * gris: la decisión es estética y se toma mirando, no leyendo una descripción.
 */
@Component({
  selector: 'np-selector-plantilla',
  imports: [TranslocoDirective, NpAlert, NpIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <section class="sp">
        <header class="sp__intro">
          <h2>{{ t('panel.diseno.plantilla.titulo') }}</h2>
          <p>{{ t('panel.diseno.plantilla.ayuda') }}</p>
        </header>

        @if (fallo()) {
          <np-alert status="declined" [heading]="t('panel.diseno.plantilla.fallo')">
            <p>{{ store.error() }}</p>
          </np-alert>
        }

        <div
          class="sp__rejilla"
          role="radiogroup"
          [attr.aria-label]="t('panel.diseno.plantilla.titulo')"
        >
          @for (plantilla of plantillas; track plantilla.id) {
            <button
              type="button"
              role="radio"
              class="sp__opcion"
              [class.sp__opcion--elegida]="esLaElegida(plantilla.id)"
              [attr.aria-checked]="esLaElegida(plantilla.id)"
              [disabled]="guardando() !== null"
              (click)="elegir(plantilla.id)"
            >
              <!--
                Miniatura viva: mismos colores y misma tipografía que la
                plantilla de verdad. Una captura envejece en cuanto alguien toca
                el diseño y nadie se acuerda de regenerarla.
              -->
              <span class="sp__muestra" [attr.data-plantilla]="plantilla.id" aria-hidden="true">
                <span class="sp__muestra-nombres">Ana &amp; Luis</span>
                <span class="sp__muestra-fecha">12 · 06 · 2027</span>
              </span>

              <span class="sp__pie">
                <span class="sp__nombre">
                  {{ plantilla.nombre }}
                  @if (esLaElegida(plantilla.id)) {
                    <np-icon name="check-circle" weight="fill" class="sp__marca" />
                  }
                </span>
                <span class="sp__descripcion">{{ plantilla.descripcion }}</span>
              </span>
            </button>
          }
        </div>

        <p class="sp__nota">
          <np-icon name="info" />
          {{ t('panel.diseno.plantilla.nota') }}
        </p>
      </section>
    </ng-container>
  `,
  styles: `
    :host {
      display: block;
    }
    .sp {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-4);
    }
    .sp__intro h2 {
      margin: 0 0 var(--np-space-1);
      font-size: var(--np-text-xl);
      font-weight: var(--np-weight-semibold);
    }
    .sp__intro p {
      margin: 0;
      color: var(--np-surface-text-muted);
    }
    .sp__rejilla {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
      gap: var(--np-space-4);
    }
    .sp__opcion {
      display: flex;
      flex-direction: column;
      gap: 0;
      padding: 0;
      overflow: hidden;
      border: 2px solid var(--np-surface-border);
      border-radius: var(--np-radius-lg);
      background: var(--np-surface-surface);
      color: inherit;
      font: inherit;
      text-align: start;
      cursor: pointer;
    }
    .sp__opcion:hover:not(:disabled) {
      border-color: var(--np-surface-text-muted);
    }
    .sp__opcion:focus-visible {
      outline: 2px solid var(--np-info-solid);
      outline-offset: 2px;
    }
    .sp__opcion:disabled {
      cursor: progress;
      opacity: 0.7;
    }
    .sp__opcion--elegida {
      border-color: var(--np-confirmed-solid);
    }
    .sp__muestra {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--np-space-2);
      min-block-size: 9rem;
      padding: var(--np-space-4);
      text-align: center;
    }
    .sp__muestra[data-plantilla='clasica'] {
      background: #faf8f6;
      color: #241f1c;
    }
    .sp__muestra[data-plantilla='clasica'] .sp__muestra-nombres {
      font-family: 'Cormorant Garamond', georgia, serif;
      font-size: 1.75rem;
    }
    .sp__muestra[data-plantilla='clasica'] .sp__muestra-fecha {
      color: #e54d69;
    }
    .sp__muestra[data-plantilla='botanica'] {
      background: #1f4436;
      color: #f4f0e8;
    }
    .sp__muestra[data-plantilla='botanica'] .sp__muestra-nombres {
      font-family: 'DM Serif Display', georgia, serif;
      font-size: 1.75rem;
    }
    .sp__muestra[data-plantilla='botanica'] .sp__muestra-fecha {
      color: #d9c9a3;
    }
    .sp__muestra[data-plantilla='romantica'] {
      background: #fbf1ef;
      color: #4a2f35;
    }
    .sp__muestra[data-plantilla='romantica'] .sp__muestra-nombres {
      font-family: 'Great Vibes', cursive;
      font-size: 2.25rem;
    }
    .sp__muestra[data-plantilla='romantica'] .sp__muestra-fecha {
      color: #b5506a;
    }
    .sp__muestra[data-plantilla='moderna'] {
      align-items: flex-start;
      background: #ffffff;
      color: #161616;
      text-align: start;
    }
    .sp__muestra[data-plantilla='moderna'] .sp__muestra-nombres {
      font-family: 'Montserrat', system-ui, sans-serif;
      font-size: 1.4rem;
      font-weight: 800;
      text-transform: uppercase;
    }
    .sp__muestra[data-plantilla='moderna'] .sp__muestra-fecha {
      color: #d6452f;
    }
    .sp__muestra-fecha {
      font-size: var(--np-text-xs);
      letter-spacing: 0.2em;
    }
    .sp__pie {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-1);
      padding: var(--np-space-3) var(--np-space-4) var(--np-space-4);
      border-block-start: 1px solid var(--np-surface-border);
    }
    .sp__nombre {
      display: flex;
      align-items: center;
      gap: var(--np-space-2);
      font-weight: var(--np-weight-semibold);
    }
    .sp__marca {
      color: var(--np-confirmed-solid);
      --np-icon-size: 1.1em;
    }
    .sp__descripcion {
      font-size: var(--np-text-sm);
      color: var(--np-surface-text-muted);
    }
    .sp__nota {
      display: flex;
      align-items: center;
      gap: var(--np-space-2);
      margin: 0;
      font-size: var(--np-text-sm);
      color: var(--np-surface-text-muted);
    }
  `,
})
export class SelectorPlantilla {
  protected readonly store = inject(BodaStore);
  protected readonly plantillas = PLANTILLAS;

  constructor() {
    // Esta es la única pantalla del producto donde se cargan las tipografías de
    // **todas** las plantillas, y es correcto: enseñar las miniaturas con la
    // letra equivocada convierte la comparación en un adorno. En la web pública
    // sigue bajando solo la de la boda.
    const fuentes = inject(Fuentes);
    for (const plantilla of PLANTILLAS) fuentes.cargar(plantilla);
  }

  protected readonly guardando = signal<PlantillaId | null>(null);
  protected readonly fallo = signal(false);

  protected esLaElegida(id: PlantillaId): boolean {
    return this.store.boda()?.templateId === id;
  }

  protected async elegir(id: PlantillaId): Promise<void> {
    this.guardando.set(id);
    this.fallo.set(!(await this.store.cambiarPlantilla(id)));
    this.guardando.set(null);
  }
}
