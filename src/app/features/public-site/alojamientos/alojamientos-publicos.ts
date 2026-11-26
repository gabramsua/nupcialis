import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

import { NpIcon } from '../../../design-system/icons/icon';
import { enlaceParaLlegar, type UbicacionPublica } from '../mapa/ubicaciones';
import {
  plazoDeReserva,
  sanearAlojamientos,
  type AlojamientoPublico,
  type EstadoPlazo,
} from './alojamientos';

/**
 * Dónde dormir, como lo ve el invitado de fuera (§8.10).
 *
 * Esta pantalla la abre alguien que vive a trescientos kilómetros y necesita
 * reservar esta semana. Por eso el orden lo decide la pareja —el primero es el
 * recomendado— y por eso **el plazo de las habitaciones bloqueadas va en
 * grande y dice los días que quedan**: es lo que de verdad angustia, y un
 * «hasta el 1 de mayo» obliga a hacer la cuenta.
 *
 * El teléfono y la web son enlaces pulsables: desde el móvil, llamar es la
 * forma más rápida de reservar en un hotel pequeño.
 */
@Component({
  selector: 'np-alojamientos-publicos',
  imports: [TranslocoDirective, NpIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      @if (sitios().length === 0) {
        <p class="al__nada">{{ t('publico.alojamientos.pronto') }}</p>
      } @else {
        <ul class="al">
          @for (sitio of sitios(); track sitio.id) {
            <li class="al__ficha">
              <p class="al__que">
                <np-icon [name]="icono(sitio)" />
                <strong>{{ sitio.name }}</strong>
                @if (sitio.recommended) {
                  <span class="al__recomendado">{{ t('publico.alojamientos.recomendado') }}</span>
                }
              </p>

              <p class="al__datos">
                <span>{{ t('publico.alojamientos.tipo.' + sitio.category) }}</span>
                @if (sitio.pricePerNight !== null) {
                  <span>{{
                    t('publico.alojamientos.precio', { euros: sitio.pricePerNight })
                  }}</span>
                }
                @if (sitio.distanceKm !== null) {
                  <span>{{ t('publico.alojamientos.distancia', { km: sitio.distanceKm }) }}</span>
                }
              </p>

              @if (sitio.description) {
                <p class="al__descripcion">{{ sitio.description }}</p>
              }

              <!--
                El bloqueo de habitaciones y su plazo: lo que de verdad decide
                si el invitado reserva hoy o lo deja para mañana. El color no
                viaja solo: lleva icono y texto (§9.1).
              -->
              @if (sitio.blockedRooms !== null || plazo(sitio).estado !== 'sin-plazo') {
                <p class="al__bloqueo" [attr.data-plazo]="plazo(sitio).estado">
                  <np-icon [name]="iconoDelPlazo(plazo(sitio))" />
                  <span>
                    @if (sitio.blockedRooms !== null) {
                      {{ t('publico.alojamientos.bloqueadas', { n: sitio.blockedRooms }) }}
                    }
                    @switch (plazo(sitio).estado) {
                      @case ('abierto') {
                        {{ t('publico.alojamientos.plazo.abierto', { n: dias(sitio) }) }}
                      }
                      @case ('ultimos') {
                        {{ t('publico.alojamientos.plazo.ultimos', { n: dias(sitio) }) }}
                      }
                      @case ('hoy') {
                        {{ t('publico.alojamientos.plazo.hoy') }}
                      }
                      @case ('cerrado') {
                        {{ t('publico.alojamientos.plazo.cerrado') }}
                      }
                    }
                  </span>
                </p>
              }

              @if (sitio.discountCode) {
                <p class="al__codigo">
                  <np-icon name="hand-heart" />
                  {{ sitio.discountCode }}
                </p>
              }

              <p class="al__contacto">
                @if (sitio.phone) {
                  <a [href]="'tel:' + sitio.phone">
                    <np-icon name="device-mobile" />
                    {{ t('publico.alojamientos.llamar') }}
                  </a>
                }
                @if (sitioDe(sitio); as lugar) {
                  <a [href]="llegar(lugar)" target="_blank" rel="noopener noreferrer">
                    <np-icon name="map-pin" />
                    {{ t('publico.alojamientos.llegar') }}
                  </a>
                }
                @if (sitio.website) {
                  <a [href]="sitio.website" target="_blank" rel="noopener noreferrer">
                    <np-icon name="link-simple" />
                    {{ t('publico.alojamientos.web') }}
                  </a>
                }
              </p>
            </li>
          }
        </ul>
      }
    </ng-container>
  `,
  styles: `
    :host {
      display: block;
    }
    .al {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-3);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .al__ficha {
      display: flex;
      flex-direction: column;
      gap: var(--np-space-2);
      padding-block-end: var(--np-space-3);
      border-block-end: 1px solid color-mix(in srgb, currentColor 20%, transparent);
    }
    .al__ficha > p {
      margin: 0;
    }
    .al__que {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--np-space-2);
    }
    .al__recomendado {
      padding: 0 var(--np-space-2);
      border: 1px solid currentColor;
      border-radius: var(--np-radius-full);
      font-size: var(--np-text-xs);
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .al__datos {
      display: flex;
      flex-wrap: wrap;
      gap: var(--np-space-1) var(--np-space-3);
      font-size: var(--np-text-sm);
      opacity: 0.8;
    }
    .al__descripcion {
      font-size: var(--np-text-sm);
      opacity: 0.9;
    }
    /* Icono y texto en la misma línea, con el texto sangrado debajo de sí
       mismo y no debajo del icono. Con el ajuste de línea del flex, la frase
       entera era un solo elemento flexible y, al no caber en 360 px, se iba
       a la línea siguiente dejando el icono solo arriba. Se vio en una
       captura. */
    .al__bloqueo,
    .al__codigo {
      display: flex;
      align-items: flex-start;
      gap: var(--np-space-2);
      font-size: var(--np-text-sm);
    }
    .al__bloqueo np-icon,
    .al__codigo np-icon {
      flex: none;
      /* Centrado con la primera línea, no con el bloque entero. */
      margin-block-start: 0.1em;
    }
    .al__contacto {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--np-space-2);
      font-size: var(--np-text-sm);
    }
    /* Los últimos días se marcan, pero con icono y texto al lado: el color por
       sí solo no informa a quien no lo distingue. */
    .al__bloqueo[data-plazo='ultimos'],
    .al__bloqueo[data-plazo='hoy'] {
      font-weight: var(--np-weight-medium);
    }
    .al__bloqueo[data-plazo='cerrado'] {
      opacity: 0.7;
      text-decoration: line-through currentColor 1px;
    }
    .al__contacto a {
      display: inline-flex;
      align-items: center;
      gap: var(--np-space-1);
      min-block-size: var(--np-tap-target);
      color: inherit;
    }
    .al__nada {
      margin: 0;
      opacity: 0.7;
    }
  `,
})
export class NpAlojamientosPublicos {
  readonly alojamientos = input.required<readonly AlojamientoPublico[]>();
  /** Las ubicaciones publicadas: de ahí sale el «Cómo llegar» de cada alojamiento (F2.4b). */
  readonly ubicaciones = input<readonly UbicacionPublica[]>([]);

  private readonly porId = computed(() => new Map(this.ubicaciones().map((u) => [u.id, u])));

  /** El sitio del mapa enlazado, solo si **está publicado**. */
  protected sitioDe(sitio: AlojamientoPublico): UbicacionPublica | null {
    return sitio.locationId === null ? null : (this.porId().get(sitio.locationId) ?? null);
  }

  protected llegar(lugar: UbicacionPublica): string {
    return enlaceParaLlegar(lugar);
  }

  /**
   * Se vuelve a sanear en el cliente, como las demás listas publicadas: el
   * documento lo pudo escribir una versión anterior de la función.
   */
  protected readonly sitios = computed(() => sanearAlojamientos(this.alojamientos()));

  protected plazo(sitio: AlojamientoPublico): EstadoPlazo {
    return plazoDeReserva(sitio.bookingDeadline);
  }

  /** Los días, ya desempaquetados: la plantilla no sabe de uniones. */
  protected dias(sitio: AlojamientoPublico): number {
    const plazo = this.plazo(sitio);
    return plazo.estado === 'abierto' || plazo.estado === 'ultimos' ? plazo.dias : 0;
  }

  protected icono(sitio: AlojamientoPublico) {
    return sitio.category === 'camping' ? 'tent' : 'bed';
  }

  protected iconoDelPlazo(plazo: EstadoPlazo) {
    if (plazo.estado === 'cerrado') return 'x-circle';
    return plazo.estado === 'ultimos' || plazo.estado === 'hoy' ? 'clock-countdown' : 'bed';
  }
}
