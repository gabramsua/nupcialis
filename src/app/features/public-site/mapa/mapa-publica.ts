import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewEncapsulation,
  effect,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';

import { NP_ICON_SPRITE } from '../../../design-system/icons/icon-sprite.providers';
import { NpIcon } from '../../../design-system/icons/icon';
import type { NpIconName } from '../../../design-system/icons/icon-name.generated';
import { NpCabeceraBoda } from '../navegacion/cabecera-boda';
import { conCabecera, usarTemaDeLaBoda } from '../tema';
import type { ResultadoTenant } from '../../../core/tenant/tenant-loader';
import {
  CENTRO_POR_DEFECTO,
  ESTILOS_DE_PINES,
  ESTILO_DE_TIPO,
  TESELAS,
  cargarLeaflet,
  htmlDePin,
} from './leaflet';
import {
  contarPorTipo,
  enlaceDeGoogleMaps,
  enlaceParaLlegar,
  type UbicacionPublica,
} from './ubicaciones';

/**
 * El mapa de la boda, como lo ve el invitado (§8.6).
 *
 * Lo abre alguien en el coche, con prisa y con una mano: «¿dónde es y dónde
 * aparco?». Por eso el mapa es **una ayuda, no la única forma de llegar**: la
 * lista de debajo lleva cada sitio con su hora, su dirección y dos botones
 * grandes —abrir en Google Maps y cómo llegar— que sacan la aplicación de mapas
 * del móvil, que es lo que de verdad le va a guiar por la carretera.
 *
 * Leaflet se carga aquí y solo aquí (`cargarLeaflet`): la portada no paga por
 * él. Si no llega —sin cobertura en la finca— la lista sigue funcionando, que
 * es por lo que existe.
 */
@Component({
  selector: 'np-mapa-publica',
  imports: [NpCabeceraBoda, RouterLink, TranslocoDirective, NpIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Los pines los pinta Leaflet fuera de Angular: sus estilos tienen que ser
  // globales o no los alcanza el encapsulado.
  encapsulation: ViewEncapsulation.None,
  host: { '[style]': 'colores()' },
  template: `
    <ng-container *transloco="let t">
      @if (cabecera()) {
        <np-cabecera-boda [tenant]="tenant()" />
      }
      <main class="mp">
        @if (!cabecera()) {
          <a class="mp__volver" routerLink="/">
            <np-icon name="caret-left" />
            {{ t('publico.mapa.volver') }}
          </a>
        }

        <header class="mp__cabecera">
          <h1>{{ t('publico.mapa.titulo') }}</h1>
          <p>{{ t('publico.mapa.ayuda') }}</p>
        </header>

        @if (ubicaciones().length === 0) {
          <p class="mp__nada">
            <np-icon name="map-pin" />
            {{ t('publico.mapa.ninguno') }}
          </p>
        } @else {
          <div
            #lienzo
            class="mp__mapa"
            role="region"
            [attr.aria-label]="t('publico.mapa.etiquetaDelMapa')"
          >
            @if (fallo()) {
              <p class="mp__sinMapa">{{ t('publico.mapa.sinMapa') }}</p>
            }
          </div>

          <ul class="mp__lista">
            @for (sitio of ubicaciones(); track sitio.id) {
              <li
                class="mp__sitio"
                [class.mp__sitio--elegido]="elegido() === sitio.id"
                [attr.id]="'sitio-' + sitio.id"
                [style.--np-pin-color]="color(sitio)"
              >
                <p class="mp__que">
                  <span class="mp__icono"><np-icon [name]="icono(sitio)" weight="fill" /></span>
                  <span class="mp__texto">
                    <strong>{{ sitio.name }}</strong>
                    <small>
                      {{ t('publico.mapa.tipo.' + sitio.type) }}
                      @if (sitio.time) {
                        · {{ t('publico.mapa.hora', { hora: sitio.time }) }}
                      }
                    </small>
                  </span>
                </p>

                @if (sitio.address) {
                  <p class="mp__direccion">{{ sitio.address }}</p>
                }
                @if (sitio.description) {
                  <p class="mp__descripcion">{{ sitio.description }}</p>
                }

                <div class="mp__acciones">
                  <a
                    class="mp__boton mp__boton--principal"
                    [href]="llegar(sitio)"
                    target="_blank"
                    rel="noopener"
                  >
                    <np-icon name="navigation-arrow" weight="fill" />
                    {{ t('publico.mapa.llegar') }}
                  </a>
                  <a class="mp__boton" [href]="abrir(sitio)" target="_blank" rel="noopener">
                    <np-icon name="map-pin" />
                    {{ t('publico.mapa.abrir') }}
                  </a>
                  <button type="button" class="mp__boton" (click)="verEnElMapa(sitio)">
                    {{ t('publico.mapa.verEnElMapa') }}
                  </button>
                </div>
              </li>
            }
          </ul>
        }
      </main>
    </ng-container>
  `,
  styles: [
    ESTILOS_DE_PINES,
    `
      .mp {
        display: grid;
        gap: 1rem;
        max-inline-size: 42rem;
        margin-inline: auto;
        padding: 1rem;
      }
      .mp__volver {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        color: inherit;
        font-size: 0.9rem;
        text-decoration: none;
        opacity: 0.75;
      }
      .mp__cabecera h1 {
        margin: 0;
        font-size: 1.6rem;
      }
      .mp__cabecera p {
        margin: 0.25rem 0 0;
        opacity: 0.8;
      }
      .mp__mapa {
        position: relative;
        z-index: 0;
        block-size: min(60dvh, 28rem);
        min-block-size: 16rem;
        border: 1px solid currentColor;
        border-radius: 1rem;
        overflow: hidden;
      }
      .mp__sinMapa,
      .mp__nada {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 1rem;
        opacity: 0.85;
      }
      .mp__lista {
        display: grid;
        gap: 0.75rem;
        margin: 0;
        padding: 0;
        list-style: none;
      }
      .mp__sitio {
        display: grid;
        gap: 0.5rem;
        padding: 1rem;
        border: 1px solid currentColor;
        border-radius: 1rem;
        scroll-margin-block: 1rem;
      }
      .mp__sitio--elegido {
        border-width: 3px;
      }
      .mp__que {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin: 0;
      }
      .mp__icono {
        display: grid;
        flex: none;
        place-items: center;
        inline-size: 2.5rem;
        block-size: 2.5rem;
        border-radius: 50%;
        background: var(--np-pin-color, currentColor);
        color: #fff;
      }
      .mp__texto {
        display: flex;
        flex-direction: column;
      }
      .mp__texto small {
        opacity: 0.8;
      }
      .mp__direccion,
      .mp__descripcion {
        margin: 0;
      }
      .mp__descripcion {
        opacity: 0.85;
      }
      .mp__acciones {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }
      .mp__boton {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        min-block-size: 2.75rem;
        padding: 0 1rem;
        border: 1px solid currentColor;
        border-radius: 999px;
        background: transparent;
        color: inherit;
        font: inherit;
        text-decoration: none;
        cursor: pointer;
      }
      .mp__boton--principal {
        font-weight: 600;
        border-width: 2px;
      }
    `,
  ],
})
export class NpMapaPublica {
  /** Lo que resuelve la ruta: la boda, con sus sitios ya saneados. */
  readonly tenant = input.required<ResultadoTenant>();

  private readonly sprite = inject(NP_ICON_SPRITE);
  private readonly documento = inject(ElementRef<HTMLElement>);
  private readonly lienzo = viewChild<ElementRef<HTMLElement>>('lienzo');

  /** Los colores de la pareja, como en el resto de la web pública. */
  protected readonly colores = usarTemaDeLaBoda(this.tenant);
  protected readonly cabecera = computed(() => conCabecera(this.tenant()));

  protected readonly elegido = signal<string | null>(null);
  protected readonly fallo = signal(false);

  protected readonly ubicaciones = computed<readonly UbicacionPublica[]>(() => {
    const t = this.tenant();
    return t.tipo === 'ok' ? t.sitio.ubicaciones : [];
  });

  /** Cuántas hay de cada tipo, por si la plantilla quiere una leyenda. */
  protected readonly resumen = computed(() => contarPorTipo(this.ubicaciones()));

  private mapa: import('leaflet').Map | null = null;
  private marcadores = new Map<string, import('leaflet').Marker>();

  constructor() {
    // El lienzo no existe hasta que `*transloco` pinta la plantilla, que es
    // después del primer render: se espera a que aparezca en vez de buscarlo
    // en un momento fijo.
    effect(() => {
      const destino = this.lienzo()?.nativeElement;
      if (destino && !this.mapa && !this.montando) {
        this.montando = true;
        void this.montar(destino);
      }
    });
    inject(DestroyRef).onDestroy(() => {
      this.mapa?.remove();
      this.mapa = null;
    });
  }

  protected icono(sitio: UbicacionPublica): NpIconName {
    return ESTILO_DE_TIPO[sitio.type].icono;
  }

  protected color(sitio: UbicacionPublica): string {
    return ESTILO_DE_TIPO[sitio.type].color;
  }

  protected abrir(sitio: UbicacionPublica): string {
    return enlaceDeGoogleMaps(sitio);
  }

  protected llegar(sitio: UbicacionPublica): string {
    return enlaceParaLlegar(sitio);
  }

  /** Desde la lista: lleva el mapa al sitio y lo marca. */
  protected verEnElMapa(sitio: UbicacionPublica): void {
    this.elegir(sitio.id);
    this.mapa?.flyTo([sitio.lat, sitio.lng], Math.max(this.mapa.getZoom(), 15), { duration: 0.6 });
    this.lienzo()?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  private elegir(id: string): void {
    this.elegido.set(id);
    for (const sitio of this.ubicaciones()) {
      const marcador = this.marcadores.get(sitio.id);
      marcador?.setIcon(this.iconoDelPin(sitio, sitio.id === id));
    }
  }

  private iconoDelPin(sitio: UbicacionPublica, activo: boolean): import('leaflet').DivIcon {
    return this.leaflet!.divIcon({
      className: 'np-pin-marcador',
      html: htmlDePin(sitio.type, this.sprite, activo),
      iconSize: [34, 34],
      iconAnchor: [17, 34],
    });
  }

  private leaflet: typeof import('leaflet') | null = null;

  private montando = false;

  private async montar(destino: HTMLElement): Promise<void> {
    const sitios = this.ubicaciones();
    if (sitios.length === 0) return;

    try {
      const L = (this.leaflet = await cargarLeaflet(this.documento.nativeElement.ownerDocument));

      const mapa = (this.mapa = L.map(destino, {
        center: [CENTRO_POR_DEFECTO.lat, CENTRO_POR_DEFECTO.lng],
        zoom: 6,
        // El mapa no se come el scroll de la página en el móvil: con un dedo se
        // baja por la página, con dos se mueve el mapa.
        scrollWheelZoom: false,
      }));

      L.tileLayer(TESELAS.url, {
        attribution: TESELAS.atribucion,
        maxZoom: TESELAS.zoomMaximo,
      }).addTo(mapa);

      for (const sitio of sitios) {
        const marcador = L.marker([sitio.lat, sitio.lng], {
          icon: this.iconoDelPin(sitio, false),
          title: sitio.name,
          alt: sitio.name,
        }).addTo(mapa);

        marcador.on('click', () => {
          this.elegir(sitio.id);
          this.documento.nativeElement
            .querySelector(`#sitio-${CSS.escape(sitio.id)}`)
            ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
        this.marcadores.set(sitio.id, marcador);
      }

      // Todos los sitios a la vista a la vez: es lo que ve quien abre el mapa.
      if (sitios.length === 1) {
        mapa.setView([sitios[0]!.lat, sitios[0]!.lng], 15);
      } else {
        mapa.fitBounds(L.latLngBounds(sitios.map((s) => [s.lat, s.lng] as [number, number])), {
          padding: [40, 40],
          maxZoom: 16,
        });
      }
    } catch {
      this.fallo.set(true);
    }
  }
}
