import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewEncapsulation,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoDirective } from '@jsverse/transloco';
import type * as Leaflet from 'leaflet';

import { NpButton } from '../../../design-system/components/button/button';
import { NpIcon } from '../../../design-system/icons/icon';
import { NP_ICON_SPRITE } from '../../../design-system/icons/icon-sprite.providers';
import {
  CENTRO_POR_DEFECTO,
  ESTILOS_DE_PINES,
  TESELAS,
  cargarLeaflet,
  htmlDePin,
  type LibreriaLeaflet,
} from '../../public-site/mapa/leaflet';
import { coordenadasValidas, type TipoUbicacion } from '../../public-site/mapa/ubicaciones';
import { buscarDireccion, type ResultadoDeBusqueda } from './geocodificador';
import { NpInput } from '../../../design-system/components/field/input';

export interface PuntoElegido {
  readonly lat: number;
  readonly lng: number;
  /** Lo que escribió Nominatim, si el punto vino de una búsqueda. */
  readonly direccion?: string;
}

/**
 * Donde la pareja coloca el pin.
 *
 * Dos formas de hacerlo, porque cada pareja tiene la suya: **buscar** la
 * dirección y elegir uno de los resultados, o **tocar el mapa** y arrastrar el
 * pin hasta la puerta. Arrastrar es lo que arregla lo que el buscador acierta
 * «más o menos»: una finca de campo casi nunca tiene una dirección que se
 * encuentre bien.
 *
 * Sin pin no hay marcador y la ficha no sale en la web (lo dice quien la
 * pinta): aquí se ve con un texto, no solo con la ausencia del pin.
 */
@Component({
  selector: 'np-selector-de-pin',
  imports: [FormsModule, TranslocoDirective, NpButton, NpIcon, NpInput],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <ng-container *transloco="let t">
      <div class="sp">
        <form class="sp__buscar" (submit)="buscar($event)">
          <input
            npInput
            type="search"
            name="consulta"
            [ngModel]="consulta()"
            (ngModelChange)="consulta.set($event)"
            [attr.aria-label]="t('panel.mapa.selector.buscar')"
            [placeholder]="t('panel.mapa.selector.buscarEjemplo')"
          />
          <button npButton type="submit" size="sm" [loading]="buscando()">
            <np-icon name="magnifying-glass" />
            {{ t('panel.mapa.selector.buscarBoton') }}
          </button>
        </form>

        @switch (estadoDeBusqueda()) {
          @case ('sin-resultados') {
            <p class="sp__aviso">{{ t('panel.mapa.selector.sinResultados') }}</p>
          }
          @case ('red') {
            <p class="sp__aviso sp__aviso--mal">{{ t('panel.mapa.selector.fallo') }}</p>
          }
          @case ('corta') {
            <p class="sp__aviso">{{ t('panel.mapa.selector.corta') }}</p>
          }
        }

        @if (resultados().length > 0) {
          <ul class="sp__resultados">
            @for (r of resultados(); track r.nombre) {
              <li>
                <button type="button" (click)="elegirResultado(r)">
                  <np-icon name="map-pin" />
                  <span>{{ r.nombre }}</span>
                </button>
              </li>
            }
          </ul>
        }

        <div
          #lienzo
          class="sp__mapa"
          role="application"
          [attr.aria-label]="t('panel.mapa.selector.mapa')"
        ></div>

        <p class="sp__estado" [class.sp__estado--falta]="!conPin()">
          <np-icon [name]="conPin() ? 'check-circle' : 'warning'" weight="fill" />
          {{ conPin() ? t('panel.mapa.selector.colocado') : t('panel.mapa.selector.sinColocar') }}
        </p>
        @if (falloDelMapa()) {
          <p class="sp__aviso sp__aviso--mal">{{ t('panel.mapa.selector.sinMapa') }}</p>
        }
      </div>
    </ng-container>
  `,
  styles: [
    ESTILOS_DE_PINES,
    `
      .sp {
        display: grid;
        gap: 0.5rem;
      }
      .sp__buscar {
        display: flex;
        gap: 0.5rem;
      }
      .sp__buscar input {
        flex: 1;
        min-inline-size: 0;
      }
      .sp__mapa {
        position: relative;
        z-index: 0;
        block-size: 16rem;
        border: 1px solid var(--np-surface-border);
        border-radius: var(--np-radius-md);
        overflow: hidden;
      }
      .sp__resultados {
        display: grid;
        gap: 0.25rem;
        margin: 0;
        padding: 0;
        list-style: none;
      }
      .sp__resultados button {
        display: flex;
        gap: 0.5rem;
        align-items: flex-start;
        inline-size: 100%;
        padding: 0.5rem;
        border: 1px solid var(--np-surface-border);
        border-radius: var(--np-radius-md);
        background: var(--np-surface-surface);
        color: inherit;
        font: inherit;
        font-size: var(--np-text-sm);
        text-align: start;
        cursor: pointer;
      }
      .sp__aviso {
        margin: 0;
        color: var(--np-surface-text-muted);
        font-size: var(--np-text-sm);
      }
      .sp__aviso--mal {
        color: var(--np-declined-fg);
      }
      .sp__estado {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        margin: 0;
        color: var(--np-confirmed-fg);
        font-size: var(--np-text-sm);
      }
      .sp__estado--falta {
        color: var(--np-attention-fg);
      }
    `,
  ],
})
export class NpSelectorDePin {
  /** El tipo pinta el marcador con su icono y su color. */
  readonly tipo = input<TipoUbicacion>('otro');
  readonly lat = input<number | null>(null);
  readonly lng = input<number | null>(null);
  /** La dirección escrita, para ofrecerla como búsqueda inicial. */
  readonly direccion = input('');

  readonly elegido = output<PuntoElegido>();

  private readonly sprite = inject(NP_ICON_SPRITE, { optional: true }) ?? '';
  private readonly destruir = inject(DestroyRef);
  private readonly lienzo = viewChild<ElementRef<HTMLElement>>('lienzo');

  protected readonly consulta = signal('');
  protected readonly buscando = signal(false);
  protected readonly resultados = signal<readonly ResultadoDeBusqueda[]>([]);
  protected readonly estadoDeBusqueda = signal<'' | 'sin-resultados' | 'red' | 'corta'>('');
  protected readonly falloDelMapa = signal(false);
  protected readonly conPin = signal(false);

  private leaflet: LibreriaLeaflet | null = null;
  private mapa: Leaflet.Map | null = null;
  private pin: Leaflet.Marker | null = null;

  constructor() {
    // El lienzo aparece cuando `*transloco` pinta la plantilla: se espera a él.
    effect(() => {
      const destino = this.lienzo()?.nativeElement;
      if (destino && !this.mapa && !this.montando) {
        this.montando = true;
        void this.montar(destino);
      }
    });

    // Si el padre cambia el pin o el tipo (otra ficha, o el tipo cambiado), el
    // marcador sigue. Solo se mueve lo que de verdad cambia, para no pelearse
    // con el arrastre.
    effect(() => {
      const lat = this.lat();
      const lng = this.lng();
      const tipo = this.tipo();
      this.consulta.set(this.direccion());
      this.colocar(lat, lng, tipo, false);
    });

    this.destruir.onDestroy(() => {
      this.mapa?.remove();
      this.mapa = null;
      this.pin = null;
    });
  }

  private montando = false;

  private async montar(destino: HTMLElement): Promise<void> {
    try {
      const L = await cargarLeaflet();
      this.leaflet = L;

      const lat = this.lat();
      const lng = this.lng();
      const hayPin = lat !== null && lng !== null && coordenadasValidas(lat, lng);
      const centro = hayPin ? { lat, lng } : CENTRO_POR_DEFECTO;

      const mapa = L.map(destino, {
        center: [centro.lat, centro.lng],
        zoom: hayPin ? 16 : 6,
        scrollWheelZoom: false,
      });
      L.tileLayer(TESELAS.url, {
        attribution: TESELAS.atribucion,
        maxZoom: TESELAS.zoomMaximo,
      }).addTo(mapa);

      // Tocar el mapa coloca (o mueve) el pin: lo más natural en el móvil.
      mapa.on('click', (evento: Leaflet.LeafletMouseEvent) =>
        this.elegir(evento.latlng.lat, evento.latlng.lng),
      );

      this.mapa = mapa;
      this.colocar(this.lat(), this.lng(), this.tipo(), true);
    } catch {
      this.falloDelMapa.set(true);
    }
  }

  private colocar(
    lat: number | null,
    lng: number | null,
    tipo: TipoUbicacion,
    ajustar: boolean,
  ): void {
    const valido = lat !== null && lng !== null && coordenadasValidas(lat, lng);
    this.conPin.set(valido);

    const L = this.leaflet;
    const mapa = this.mapa;
    if (!L || !mapa) return;

    if (!valido) {
      this.pin?.remove();
      this.pin = null;
      return;
    }

    const icono = L.divIcon({
      className: 'np-pin-marcador',
      html: htmlDePin(tipo, this.sprite, true),
      iconSize: [34, 34],
      iconAnchor: [17, 34],
    });

    if (this.pin) {
      this.pin.setIcon(icono);
      const actual = this.pin.getLatLng();
      if (actual.lat !== lat || actual.lng !== lng) this.pin.setLatLng([lat, lng]);
    } else {
      this.pin = L.marker([lat, lng], { icon: icono, draggable: true, keyboard: true }).addTo(mapa);
      this.pin.on('dragend', () => {
        const punto = this.pin?.getLatLng();
        if (punto) this.elegir(punto.lat, punto.lng);
      });
    }

    if (ajustar) mapa.setView([lat, lng], 16);
  }

  private elegir(lat: number, lng: number, direccion?: string): void {
    this.elegido.emit({ lat, lng, ...(direccion ? { direccion } : {}) });
  }

  protected async buscar(evento: Event): Promise<void> {
    evento.preventDefault();
    if (this.buscando()) return;

    this.buscando.set(true);
    this.estadoDeBusqueda.set('');
    const respuesta = await buscarDireccion(this.consulta());
    this.buscando.set(false);

    if (!respuesta.ok) {
      this.resultados.set([]);
      this.estadoDeBusqueda.set(respuesta.motivo === 'vacia' ? 'corta' : 'red');
      return;
    }

    this.resultados.set(respuesta.resultados);
    this.estadoDeBusqueda.set(respuesta.resultados.length === 0 ? 'sin-resultados' : '');
  }

  protected elegirResultado(r: ResultadoDeBusqueda): void {
    this.resultados.set([]);
    this.elegir(r.lat, r.lng, r.nombre);
    // El pin cae en el mapa en cuanto el padre devuelve las coordenadas; aquí
    // se acerca la vista para que se vea dónde.
    this.mapa?.setView([r.lat, r.lng], 16);
  }
}
