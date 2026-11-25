/**
 * Las ubicaciones del mapa (§8.6).
 *
 * **COPIA LITERAL** de `src/app/features/public-site/mapa/ubicaciones.ts`.
 * Si tocas una, toca la otra: lo vigila su `.spec.ts`.
 *
 * La pareja apunta los sitios que importan —la ceremonia, el banquete, dónde
 * aparcar— y el invitado los ve en un mapa con su ficha y un botón que abre la
 * aplicación de mapas del móvil. No es un plano de la finca: es un «dónde es».
 */

// === COPIA LITERAL: de aquí al final, idéntico en cliente y funciones ===

export const MAX_UBICACIONES = 30;
export const MAX_NOMBRE = 80;
export const MAX_DIRECCION = 200;
export const MAX_DESCRIPCION = 300;

/**
 * Qué tipo de sitio es.
 *
 * El tipo decide el icono y el color del marcador y deja al invitado leer el
 * mapa de un vistazo: la iglesia, el banquete y dónde aparcar son tres cosas
 * distintas que se buscan con prisa.
 */
export const TIPOS_UBICACION = [
  'preboda',
  'ceremonia',
  'banquete',
  'alojamiento',
  'parking',
  'otro',
] as const;

export type TipoUbicacion = (typeof TIPOS_UBICACION)[number];

export function esTipoUbicacion(valor: unknown): valor is TipoUbicacion {
  return typeof valor === 'string' && (TIPOS_UBICACION as readonly string[]).includes(valor);
}

/** Una ubicación tal y como llega a la web pública. */
export interface UbicacionPublica {
  readonly id: string;
  readonly type: TipoUbicacion;
  readonly name: string;
  readonly address: string;
  readonly lat: number;
  readonly lng: number;
  readonly description: string;
  /** «17:30», o `null` si el sitio no tiene hora. */
  readonly time: string | null;
  readonly order: number;
}

function texto(valor: unknown, maximo: number): string {
  if (typeof valor !== 'string') return '';
  return valor.replace(/\r\n/g, '\n').trim().slice(0, maximo);
}

/**
 * Una coordenada que existe en la Tierra.
 *
 * `0, 0` **no** vale: es el punto del golfo de Guinea al que va a parar todo lo
 * que no se ha geolocalizado, y un marcador ahí significa «alguien no ha
 * colocado el pin», no «la ceremonia es en el mar».
 */
export function coordenadasValidas(lat: unknown, lng: unknown): boolean {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
  return !(lat === 0 && lng === 0);
}

/** «17:30». Lo que no es una hora del día es `null`. */
export function horaDelSitio(valor: unknown): string | null {
  if (typeof valor !== 'string') return null;
  const limpia = valor.trim();
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(limpia) ? limpia : null;
}

/** Con cinco decimales —un metro— basta para que el pin caiga en la puerta. */
function redondear(valor: number): number {
  return Math.round(valor * 100000) / 100000;
}

/**
 * Deja la lista publicable. Nunca lanza.
 *
 * Se cae lo que la pareja ha marcado como **no visible**, lo que no tiene
 * nombre y lo que no tiene **coordenadas de verdad**: un marcador sin sitio no
 * es un marcador. Es lo que protege que no se publique, por ejemplo, el punto
 * donde la pareja deja el coche de los proveedores.
 */
export function sanearUbicaciones(valor: unknown): readonly UbicacionPublica[] {
  if (!Array.isArray(valor)) return [];

  const salida: UbicacionPublica[] = [];
  const vistas = new Set<string>();

  for (const crudo of valor) {
    if (crudo === null || typeof crudo !== 'object') continue;

    const u = crudo as Record<string, unknown>;
    const id = texto(u['id'], 60);
    const name = texto(u['name'], MAX_NOMBRE);

    if (id === '' || vistas.has(id) || name === '') continue;
    if (u['visibleToGuests'] === false) continue;

    // Las coordenadas viven en `coords`, como dice el modelo (§5.7), y salen
    // **planas** (`lat`, `lng`) en lo publicado. El saneador tiene que valer
    // para las dos formas: el servidor lo aplica a lo que escribe la pareja
    // (`coords`) y el navegador lo vuelve a aplicar a lo ya publicado (`lat`,
    // `lng`). Si solo entendiera una, la web pública tiraría todos los sitios.
    const coords = (
      u['coords'] !== null && typeof u['coords'] === 'object' ? u['coords'] : u
    ) as Record<string, unknown>;
    if (!coordenadasValidas(coords['lat'], coords['lng'])) continue;

    vistas.add(id);
    salida.push({
      id,
      type: esTipoUbicacion(u['type']) ? u['type'] : 'otro',
      name,
      address: texto(u['address'], MAX_DIRECCION),
      lat: redondear(coords['lat'] as number),
      lng: redondear(coords['lng'] as number),
      description: texto(u['description'], MAX_DESCRIPCION),
      time: horaDelSitio(u['time']),
      order: typeof u['order'] === 'number' && Number.isFinite(u['order']) ? u['order'] : 0,
    });
  }

  return salida.sort(porOrden).slice(0, MAX_UBICACIONES);
}

/** El orden de la pareja; a igualdad, por hora y por nombre. */
export function porOrden(a: UbicacionPublica, b: UbicacionPublica): number {
  return (
    a.order - b.order ||
    (a.time ?? '99:99').localeCompare(b.time ?? '99:99') ||
    a.id.localeCompare(b.id)
  );
}

/**
 * «Abrir en Google Maps»: la ficha del sitio, centrada en el pin.
 *
 * Es un enlace profundo, no la API: no hay clave, ni facturación, ni coste por
 * carga (D-04). En el móvil abre la aplicación de mapas.
 */
export function enlaceDeGoogleMaps(u: Pick<UbicacionPublica, 'lat' | 'lng'>): string {
  return `https://www.google.com/maps/search/?api=1&query=${u.lat},${u.lng}`;
}

/** «Cómo llegar»: la ruta desde donde esté el invitado hasta el pin. */
export function enlaceParaLlegar(u: Pick<UbicacionPublica, 'lat' | 'lng'>): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${u.lat},${u.lng}`;
}

/** Cuántas hay de cada tipo, para el resumen. Los tipos vacíos no salen. */
export function contarPorTipo(
  ubicaciones: readonly UbicacionPublica[],
): readonly { readonly type: TipoUbicacion; readonly cuantas: number }[] {
  return TIPOS_UBICACION.map((type) => ({
    type,
    cuantas: ubicaciones.filter((u) => u.type === type).length,
  })).filter((fila) => fila.cuantas > 0);
}
