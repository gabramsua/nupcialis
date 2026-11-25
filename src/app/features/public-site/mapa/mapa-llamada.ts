import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';

import { NpIcon } from '../../../design-system/icons/icon';
import type { NpIconName } from '../../../design-system/icons/icon-name.generated';
import { ESTILO_DE_TIPO } from './leaflet';
import { direccionCorta } from './direccion-corta';
import { enlaceParaLlegar, sanearUbicaciones, type UbicacionPublica } from './ubicaciones';

/** Un sitio de la lista, o dos que son el mismo y se cuentan como uno. */
interface Sitio {
  readonly id: string;
  readonly nombre: string;
  /** Clave de `publico.mapa.tipo.*`, o `ceremoniaYBanquete`. */
  readonly tipo: string;
  readonly icono: NpIconName;
  readonly direccion: string;
  readonly descripcion: string;
  readonly hora: string | null;
  readonly llegar: string;
}

/**
 * «Cómo llegar», dentro de la web de la boda (§8.6).
 *
 * Enseña **los sitios que la pareja ha puesto en su mapa** —nombre, dirección,
 * hora— cada uno con su botón «Cómo llegar», sin salir de la página. El mapa
 * con Leaflet vive aparte porque pesa y la portada la abre cualquiera desde el
 * móvil: se llega a él desde el enlace de abajo, y la librería se descarga
 * entonces.
 *
 * La ceremonia y el banquete en el mismo punto se cuentan como un solo sitio,
 * «Ceremonia y banquete», en vez de repetir la misma dirección dos veces.
 */
@Component({
  selector: 'np-mapa-llamada',
  imports: [RouterLink, TranslocoDirective, NpIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *transloco="let t">
      @if (sitios().length === 0) {
        <a class="mp-ll" routerLink="/mapa">
          <np-icon name="map-pin" weight="fill" />
          <span class="mp-ll__que">
            <strong>{{ t('publico.mapaLlamada.titulo') }}</strong>
            <small>{{ t('publico.mapaLlamada.ayuda') }}</small>
          </span>
          <np-icon class="mp-ll__flecha" name="caret-right" />
        </a>
      } @else {
        <ul class="mp-ll__lista">
          @for (sitio of sitios(); track sitio.id) {
            <li class="mp-ll__sitio">
              <span class="mp-ll__icono"><np-icon [name]="sitio.icono" weight="fill" /></span>
              <p class="mp-ll__tipo">{{ t('publico.mapa.tipo.' + sitio.tipo) }}</p>
              <p class="mp-ll__nombre">{{ sitio.nombre }}</p>
              @if (sitio.hora) {
                <p class="mp-ll__hora">
                  <np-icon name="clock" />
                  {{ t('publico.mapa.hora', { hora: sitio.hora }) }}
                </p>
              }
              @if (sitio.direccion || sitio.descripcion) {
                <div class="mp-ll__detalle">
                  @if (sitio.direccion) {
                    <p class="mp-ll__texto">{{ sitio.direccion }}</p>
                  }
                  @if (sitio.descripcion) {
                    <p class="mp-ll__texto mp-ll__texto--nota">{{ sitio.descripcion }}</p>
                  }
                </div>
              }
              <a class="mp-ll__boton" [href]="sitio.llegar" target="_blank" rel="noopener">
                <np-icon name="navigation-arrow" weight="fill" />
                {{ t('publico.mapa.llegar') }}
              </a>
            </li>
          }
        </ul>
        <a class="mp-ll__mapa" routerLink="/mapa">
          <np-icon name="map-pin" />
          {{ t('publico.mapaLlamada.verMapa') }}
        </a>
      }
    </ng-container>
  `,
  styles: `
    :host {
      display: block;
    }
    .mp-ll {
      display: flex;
      align-items: center;
      gap: 0.9rem;
      padding: 1rem;
      border: 1px solid currentColor;
      border-radius: 1rem;
      color: inherit;
      text-decoration: none;
    }
    .mp-ll__que {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: 0.15rem;
    }
    .mp-ll__que small {
      opacity: 0.8;
    }
    .mp-ll__flecha {
      flex: none;
      opacity: 0.6;
    }
    .mp-ll__lista {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr));
      gap: 1rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .mp-ll__sitio {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.35rem;
      padding: 1.5rem 1.25rem 1.25rem;
      border: 1px solid color-mix(in srgb, currentColor 22%, transparent);
      border-radius: 1.25rem;
      background: color-mix(in srgb, currentColor 5%, transparent);
      text-align: center;
    }
    .mp-ll__sitio p {
      margin: 0;
    }
    .mp-ll__icono {
      display: grid;
      place-items: center;
      inline-size: 3rem;
      block-size: 3rem;
      margin-block-end: 0.35rem;
      border-radius: 50%;
      background: color-mix(in srgb, currentColor 10%, transparent);
      font-size: 1.4rem;
    }
    .mp-ll__tipo {
      font-size: 0.75rem;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      opacity: 0.7;
    }
    .mp-ll__nombre {
      font-size: 1.2rem;
      font-weight: 700;
      line-height: 1.25;
      text-wrap: balance;
    }
    .mp-ll__sitio .mp-ll__nombre {
      margin-block-end: 0.4rem;
    }
    .mp-ll__hora {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.15rem 0.7rem;
      border-radius: 999px;
      background: color-mix(in srgb, currentColor 10%, transparent);
      font-size: 0.9rem;
    }
    .mp-ll__detalle {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      margin-block: 0.25rem 0.65rem;
      padding-block-start: 0.75rem;
      border-block-start: 1px solid color-mix(in srgb, currentColor 18%, transparent);
      inline-size: 100%;
    }
    .mp-ll__texto {
      line-height: 1.4;
      opacity: 0.9;
    }
    .mp-ll__texto--nota {
      font-size: 0.9rem;
      font-style: italic;
      opacity: 0.75;
    }
    .mp-ll__boton,
    .mp-ll__mapa {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      color: inherit;
      text-decoration: underline;
    }
    .mp-ll__boton {
      margin-block-start: auto;
      padding: 0.5rem 1.1rem;
      border: 1px solid currentColor;
      border-radius: 999px;
      text-decoration: none;
    }
    .mp-ll__mapa {
      margin-block-start: 1.25rem;
      font-size: 0.9rem;
    }
  `,
})
export class NpMapaLlamada {
  readonly ubicaciones = input<readonly UbicacionPublica[] | null>(null);

  /** Se vuelve a sanear aquí, como las demás listas públicas. */
  protected readonly sitios = computed<readonly Sitio[]>(() => {
    const lista = this.ubicaciones() ?? [];
    // La lista ya viene saneada, pero la forma de una entrada no se da por buena.
    const limpia = sanearUbicaciones(
      lista.map((u) => ({ ...u, coords: { lat: u.lat, lng: u.lng } })),
    );

    const salida: Sitio[] = [];
    const usadas = new Set<string>();

    for (const sitio of limpia) {
      if (usadas.has(sitio.id)) continue;
      usadas.add(sitio.id);

      // La ceremonia y el banquete en el mismo punto son un solo sitio.
      const pareja = limpia.find(
        (otra) =>
          !usadas.has(otra.id) &&
          otra.lat === sitio.lat &&
          otra.lng === sitio.lng &&
          ((sitio.type === 'ceremonia' && otra.type === 'banquete') ||
            (sitio.type === 'banquete' && otra.type === 'ceremonia')),
      );
      if (pareja) usadas.add(pareja.id);

      salida.push({
        id: sitio.id,
        nombre: sitio.name,
        tipo: pareja ? 'ceremoniaYBanquete' : sitio.type,
        icono: ESTILO_DE_TIPO[sitio.type].icono,
        direccion: direccionCorta(sitio.address),
        descripcion: sitio.description,
        hora: sitio.time ?? pareja?.time ?? null,
        llegar: enlaceParaLlegar(sitio),
      });
    }
    return salida;
  });
}
