import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

import { NpAlert } from '../../../design-system/components/alert/alert';
import { NpButton } from '../../../design-system/components/button/button';
import { NpIcon } from '../../../design-system/icons/icon';
import {
  CLAVES_PALETA,
  PALETAS,
  paletaDeColores,
  type Paleta,
} from '../../public-site/paletas/paletas';
import { BodaStore } from '../boda.store';

/**
 * Elegir los colores de la web.
 *
 * Catálogo cerrado, como el de plantillas y por el mismo motivo: seis
 * selectores de color sueltos producen texto gris claro sobre fondo beige con
 * una fiabilidad asombrosa, y esa web la abre un invitado de pie en la calle a
 * pleno sol. Cada paleta de aquí ha pasado un test de contraste.
 *
 * Se puede no elegir ninguna, y es una opción de verdad: entonces manda la
 * paleta de la plantilla, que está pensada para verse bien sola.
 */
@Component({
  selector: 'np-selector-paleta',
  imports: [TranslocoDirective, NpAlert, NpButton, NpIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      <section class="sp">
        <header class="sp__intro">
          <h2>{{ t('panel.diseno.paleta.titulo') }}</h2>
          <p>{{ t('panel.diseno.paleta.ayuda') }}</p>
        </header>

        @if (fallo()) {
          <np-alert status="declined" [heading]="t('panel.diseno.paleta.fallo')">
            <p>{{ store.error() }}</p>
          </np-alert>
        }

        <div
          class="sp__rejilla"
          role="radiogroup"
          [attr.aria-label]="t('panel.diseno.paleta.titulo')"
        >
          @for (paleta of paletas; track paleta.id) {
            <button
              type="button"
              role="radio"
              class="sp__opcion"
              [class.sp__opcion--elegida]="elegida()?.id === paleta.id"
              [attr.aria-checked]="elegida()?.id === paleta.id"
              [disabled]="guardando()"
              (click)="elegir(paleta)"
            >
              <!-- La muestra se dibuja con los colores de verdad. El nombre va
                   siempre debajo: el color nunca viaja solo. -->
              <span class="sp__muestra" [style.background]="paleta.colores.background">
                @for (clave of claves; track clave) {
                  <span class="sp__gota" [style.background]="paleta.colores[clave]"></span>
                }
              </span>
              <span class="sp__nombre">
                {{ paleta.nombre }}
                @if (elegida()?.id === paleta.id) {
                  <np-icon name="check-circle" weight="fill" />
                }
              </span>
            </button>
          }
        </div>

        <div class="sp__pie">
          @if (personalizada()) {
            <p class="sp__aviso">
              <np-icon name="info" />
              {{ t('panel.diseno.paleta.personalizada') }}
            </p>
          }
          @if (store.boda()?.palette) {
            <button
              npButton
              variant="ghost"
              type="button"
              [disabled]="guardando()"
              (click)="quitar()"
            >
              <np-icon name="x" />
              {{ t('panel.diseno.paleta.quitar') }}
            </button>
          } @else {
            <p class="sp__aviso">
              <np-icon name="palette" />
              {{ t('panel.diseno.paleta.sinPaleta') }}
            </p>
          }
        </div>
      </section>
    </ng-container>
  `,
  styles: `
    .sp {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-4);
    }
    .sp__intro h2 {
      margin: 0 0 var(--np-space-1);
      font-size: var(--np-text-lg);
      font-weight: var(--np-weight-semibold);
    }
    .sp__intro p {
      margin: 0;
      color: var(--np-surface-text-muted);
    }
    /* Primero móvil: dos columnas en un teléfono, más según quepan. */
    .sp__rejilla {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(8.5rem, 1fr));
      gap: var(--np-space-3);
    }
    .sp__opcion {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-2);
      padding: var(--np-space-2);
      border: 2px solid var(--np-surface-border);
      border-radius: var(--np-radius-lg);
      background: var(--np-surface-surface);
      color: inherit;
      font: inherit;
      text-align: start;
      cursor: pointer;
    }
    .sp__opcion--elegida {
      border-color: var(--np-brand-primary, var(--np-surface-text));
    }
    .sp__muestra {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--np-space-1);
      block-size: 4rem;
      border-radius: var(--np-radius-md);
    }
    .sp__gota {
      inline-size: 0.9rem;
      block-size: 2.2rem;
      border-radius: var(--np-radius-sm);
    }
    .sp__nombre {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--np-space-1);
      font-size: var(--np-text-sm);
      font-weight: var(--np-weight-medium);
    }
    .sp__pie {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--np-space-2);
    }
    .sp__aviso {
      display: flex;
      align-items: center;
      gap: var(--np-space-2);
      margin: 0;
      font-size: var(--np-text-sm);
      color: var(--np-surface-text-muted);
    }
  `,
})
export class SelectorPaleta {
  protected readonly store = inject(BodaStore);

  protected readonly paletas = PALETAS;
  protected readonly claves = CLAVES_PALETA;

  protected readonly guardando = signal(false);
  protected readonly fallo = signal(false);

  protected readonly elegida = computed(() => paletaDeColores(this.store.boda()?.palette ?? null));

  /**
   * Tiene colores, pero no son los de ninguna paleta del catálogo.
   *
   * Pasa si se retira una paleta, o si alguien escribió los colores a mano. No
   * se le cambian por las bravas: se le avisa y decide ella.
   */
  protected readonly personalizada = computed(
    () => !!this.store.boda()?.palette && this.elegida() === null,
  );

  protected async elegir(paleta: Paleta): Promise<void> {
    if (this.elegida()?.id === paleta.id) return;
    await this.escribir(paleta.colores);
  }

  protected async quitar(): Promise<void> {
    await this.escribir(null);
  }

  private async escribir(colores: Paleta['colores'] | null): Promise<void> {
    this.guardando.set(true);
    const ok = await this.store.guardarPaleta(colores);
    this.guardando.set(false);
    this.fallo.set(!ok);
  }
}
