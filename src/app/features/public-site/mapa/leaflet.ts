/**
 * Leaflet, cargado solo cuando alguien abre un mapa.
 *
 * La portada la abre cualquiera desde el móvil con datos, y Leaflet son unos
 * cuarenta kilobytes comprimidos más su hoja de estilos: no se pagan hasta que
 * se entra en `/mapa` (o en el selector del panel). El código va en su propio
 * trozo por el `import()`, y la hoja de estilos se copia a `/vendor/leaflet` en
 * la compilación y se enlaza aquí, en vez de colarla en el CSS de arranque.
 *
 * Los marcadores son `divIcon` con nuestros iconos, no las imágenes que trae
 * Leaflet: así no hay ficheros sueltos que se rompan con el empaquetado, y el
 * pin lleva icono, color y texto como el resto del producto.
 */

import type * as Leaflet from 'leaflet';

import type { NpIconName } from '../../../design-system/icons/icon-name.generated';
import { coordenadasValidas, type TipoUbicacion } from './ubicaciones';

export type LibreriaLeaflet = typeof Leaflet;

const HOJA = '/vendor/leaflet/leaflet.css';

let enCurso: Promise<LibreriaLeaflet> | null = null;

function enlazarHoja(documento: Document): Promise<void> {
  if (documento.querySelector(`link[data-leaflet]`)) return Promise.resolve();

  return new Promise((resolver) => {
    const enlace = documento.createElement('link');
    enlace.rel = 'stylesheet';
    enlace.href = HOJA;
    enlace.dataset['leaflet'] = '1';
    // Si la hoja no llega el mapa sigue siendo usable —feo, pero con sus
    // enlaces—: no se bloquea nada esperando por ella.
    enlace.onload = () => resolver();
    enlace.onerror = () => resolver();
    documento.head.appendChild(enlace);
  });
}

/** Carga Leaflet una sola vez y devuelve siempre la misma promesa. */
export function cargarLeaflet(documento: Document = document): Promise<LibreriaLeaflet> {
  enCurso ??= (async () => {
    const [modulo] = await Promise.all([import('leaflet'), enlazarHoja(documento)]);
    // Según cómo empaquete el constructor, el espacio de nombres viene como
    // módulo o dentro de `default`.
    return ((modulo as { default?: LibreriaLeaflet }).default ?? modulo) as LibreriaLeaflet;
  })().catch((error: unknown) => {
    // Una carga fallida no se queda cacheada: el siguiente intento vuelve a
    // probar, que es lo que quiere quien recuperó la conexión.
    enCurso = null;
    throw error;
  });

  return enCurso;
}

/** Las teselas de OpenStreetMap y la atribución que su licencia exige. */
export const TESELAS = {
  url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  atribucion: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  zoomMaximo: 19,
} as const;

/**
 * El color de cada tipo, como variable del sistema visual y con un respaldo.
 *
 * El color **nunca viaja solo**: el marcador lleva además su icono, y la ficha
 * su nombre en texto.
 */
export const ESTILO_DE_TIPO: Readonly<
  Record<TipoUbicacion, { readonly icono: NpIconName; readonly color: string }>
> = {
  preboda: { icono: 'champagne', color: 'var(--np-attention-fg, #b45309)' },
  ceremonia: { icono: 'church', color: 'var(--np-confirmed-fg, #166534)' },
  banquete: { icono: 'fork-knife', color: 'var(--np-info-fg, #1d4ed8)' },
  alojamiento: { icono: 'bed', color: 'var(--np-pending-fg, #6b21a8)' },
  parking: { icono: 'car', color: 'var(--np-surface-text-muted, #475569)' },
  otro: { icono: 'map-pin', color: 'var(--np-declined-fg, #9f1239)' },
};

/**
 * El HTML de un pin: una gota con el icono del sprite dentro.
 *
 * El icono se pide al sprite que la superficie ya descarga (`sprite` es lo que
 * provee `provideIconSprite`), así que no viaja ni un byte de imagen.
 */
export function htmlDePin(tipo: TipoUbicacion, sprite: string, activo = false): string {
  const { icono, color } = ESTILO_DE_TIPO[tipo];

  return `<span class="np-pin${activo ? ' np-pin--activo' : ''}" style="--np-pin-color:${color}">
    <svg class="np-pin__icono" aria-hidden="true" width="16" height="16"><use href="${sprite}#${icono}-fill"></use></svg>
  </span>`;
}

/** Los estilos de los pines y de los controles, que Leaflet no trae. */
export const ESTILOS_DE_PINES = `
  .np-pin-marcador { background: transparent; border: 0; }
  .np-pin {
    display: grid;
    place-items: center;
    inline-size: 34px;
    block-size: 34px;
    border: 3px solid #fff;
    border-radius: 50% 50% 50% 0;
    background: var(--np-pin-color, #1d4ed8);
    box-shadow: 0 2px 6px rgb(0 0 0 / 0.35);
    color: #fff;
    rotate: -45deg;
  }
  .np-pin__icono { rotate: 45deg; fill: currentColor; }
  .np-pin--activo { scale: 1.2; box-shadow: 0 0 0 3px rgb(255 255 255 / 0.9), 0 2px 8px rgb(0 0 0 / 0.5); }
`;

export interface PuntoDelMapa {
  readonly lat: number;
  readonly lng: number;
}

/** Un centro razonable cuando todavía no hay ningún sitio: España. */
export const CENTRO_POR_DEFECTO: PuntoDelMapa = { lat: 40.4, lng: -3.7 };

/** Para decidir si ajustar la vista a los marcadores o quedarse en el centro. */
export function hayPuntos(puntos: readonly PuntoDelMapa[]): boolean {
  return puntos.some((p) => coordenadasValidas(p.lat, p.lng));
}
