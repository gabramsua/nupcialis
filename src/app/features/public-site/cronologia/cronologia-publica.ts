import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

import { NpIcon } from '../../../design-system/icons/icon';
import { enlaceParaLlegar, type UbicacionPublica } from '../mapa/ubicaciones';
import { sanearCronologia, type HitoPublico } from './cronologia';

/**
 * La cronología del día, como la ve el invitado (§8.13).
 *
 * Línea de tiempo vertical con **la hora destacada**, porque la pregunta que
 * trae el invitado es siempre «¿a qué hora es X?». Está pensada para mirarse en
 * el móvil a las tres de la madrugada, con poca batería y peor cobertura: nada
 * de animaciones, nada que cargar, y la hora en grande.
 *
 * Vive fuera de las plantillas por lo mismo que las preguntas frecuentes: el
 * comportamiento es idéntico para las doce del catálogo y lo que cambia —color
 * y tipografía— se hereda.
 */
@Component({
  selector: 'np-cronologia-publica',
  imports: [TranslocoDirective, NpIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      @if (hitos().length === 0) {
        <p class="cr__nada">{{ t('publico.cronologia.pronto') }}</p>
      } @else {
        <ol class="cr">
          @for (hito of hitos(); track hito.id) {
            <li class="cr__hito" [style.--cr-color]="'var(--np-cat-' + hito.color + ')'">
              <p class="cr__hora">
                <time>{{ hito.time }}</time>
                @if (hito.endTime) {
                  <small>{{ t('publico.cronologia.hasta', { hora: hito.endTime }) }}</small>
                }
              </p>
              <span class="cr__marca" aria-hidden="true">
                <np-icon [name]="hito.icon" />
              </span>
              <div class="cr__que">
                <h3>{{ hito.title }}</h3>
                @if (hito.description) {
                  <p>{{ hito.description }}</p>
                }
                @if (sitioDe(hito); as sitio) {
                  <a
                    class="cr__llegar"
                    [href]="llegar(sitio)"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <np-icon name="map-pin" />
                    {{ t('publico.cronologia.llegar', { sitio: sitio.name }) }}
                  </a>
                }
              </div>
            </li>
          }
        </ol>
      }
    </ng-container>
  `,
  styles: `
    :host {
      display: block;
    }
    /* Las tres columnas son **las de la lista entera**, no las de cada hito: con
       una rejilla por fila, «hasta las 17:45» ensanchaba la columna de la hora
       solo en esa fila y los iconos quedaban en columnas distintas, escalonados.
       Cada hito toma las columnas de la lista con subgrid. */
    .cr {
      display: grid;
      grid-template-columns: auto auto 1fr;
      column-gap: var(--np-space-3);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    /* La hora primero porque es lo que se viene a mirar. */
    .cr__hito {
      display: grid;
      grid-column: 1 / -1;
      grid-template-columns: subgrid;
    }
    .cr__hora {
      margin: 0;
      padding-block: var(--np-space-1);
      font-variant-numeric: tabular-nums;
      font-weight: var(--np-weight-medium);
      line-height: 1.5rem;
      text-align: end;
    }
    .cr__hora small {
      display: block;
      max-inline-size: 5.5rem;
      margin-inline-start: auto;
      line-height: 1.25;
      font-weight: var(--np-weight-regular);
      opacity: 0.7;
    }
    /* La línea que une los hitos la dibuja la propia marca, con un borde: así
       no hace falta ni un pseudoelemento absoluto ni saber cuántos hay. */
    /* El icono ocupa la misma altura de línea que la hora y el título, con el
       mismo aire arriba: así sus centros coinciden y no «cuelga» más arriba. */
    .cr__marca {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--np-space-1);
      padding-block-start: var(--np-space-1);
      color: var(--cr-color);
    }
    .cr__marca np-icon {
      display: flex;
      align-items: center;
      block-size: 1.5rem;
    }
    .cr__hito:not(:last-child) .cr__marca::after {
      content: '';
      flex: 1;
      inline-size: 2px;
      min-block-size: var(--np-space-4);
      background: color-mix(in srgb, var(--cr-color) 45%, transparent);
    }
    .cr__que {
      padding-block: var(--np-space-1) var(--np-space-4);
    }
    .cr__que h3 {
      margin: 0;
      font-size: var(--np-text-base);
      font-weight: var(--np-weight-medium);
      line-height: 1.5rem;
    }
    .cr__que p {
      margin: var(--np-space-1) 0 0;
      font-size: var(--np-text-sm);
      opacity: 0.85;
    }
    .cr__llegar {
      display: inline-flex;
      align-items: center;
      gap: var(--np-space-1);
      margin-block-start: var(--np-space-1);
      min-block-size: 2.75rem;
      color: inherit;
      font-size: var(--np-text-sm);
      font-weight: var(--np-weight-medium);
    }
    .cr__nada {
      margin: 0;
      opacity: 0.7;
    }
  `,
})
export class NpCronologiaPublica {
  readonly cronologia = input.required<readonly HitoPublico[]>();
  /** Las ubicaciones publicadas: de ahí sale el «Cómo llegar» de cada hito (F2.2b). */
  readonly ubicaciones = input<readonly UbicacionPublica[]>([]);

  /**
   * Se vuelve a sanear aquí aunque el servidor ya lo haya hecho.
   *
   * No es desconfianza: este documento lo pudo escribir una versión anterior de
   * la función, y una web de boda no puede quedarse sin su cronología por un
   * despliegue a medias. Además es lo que garantiza el orden por hora.
   */
  protected readonly hitos = computed(() => sanearCronologia(this.cronologia()));

  private readonly porId = computed(() => new Map(this.ubicaciones().map((u) => [u.id, u])));

  /** El sitio enlazado, solo si **está publicado**: un enlace al vacío no se pinta. */
  protected sitioDe(hito: HitoPublico): UbicacionPublica | null {
    return hito.locationId === null ? null : (this.porId().get(hito.locationId) ?? null);
  }

  protected llegar(sitio: UbicacionPublica): string {
    return enlaceParaLlegar(sitio);
  }
}
