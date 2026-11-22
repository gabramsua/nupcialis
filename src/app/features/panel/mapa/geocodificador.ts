import { coordenadasValidas } from '../../public-site/mapa/ubicaciones';

/**
 * Buscar una dirección y devolver dónde cae, con Nominatim (OpenStreetMap).
 *
 * Solo se busca cuando la pareja pulsa «Buscar»: la política de uso de
 * Nominatim prohíbe el autocompletado y limita a una petición por segundo, y
 * una pareja que coloca cinco sitios no se acerca ni de lejos. No hay clave ni
 * coste. Si algún día esto fuese a más, se cambia este fichero y nada más.
 *
 * Lo que vuelve de fuera se comprueba (D-19): solo salen resultados con un
 * nombre y unas coordenadas que existen.
 */

export interface ResultadoDeBusqueda {
  readonly nombre: string;
  readonly lat: number;
  readonly lng: number;
}

export type RespuestaDeBusqueda =
  | { readonly ok: true; readonly resultados: readonly ResultadoDeBusqueda[] }
  | { readonly ok: false; readonly motivo: 'vacia' | 'red' };

export const URL_NOMINATIM = 'https://nominatim.openstreetmap.org/search';
export const MAX_RESULTADOS = 5;

export function urlDeBusqueda(consulta: string): string {
  const params = new URLSearchParams({
    q: consulta.trim(),
    format: 'jsonv2',
    limit: String(MAX_RESULTADOS),
    addressdetails: '0',
    'accept-language': 'es',
  });
  return `${URL_NOMINATIM}?${params.toString()}`;
}

/** Nominatim devuelve las coordenadas como texto. Lo que no cuadra se descarta. */
export function leerResultados(crudo: unknown): readonly ResultadoDeBusqueda[] {
  if (!Array.isArray(crudo)) return [];

  const salida: ResultadoDeBusqueda[] = [];

  for (const fila of crudo) {
    if (fila === null || typeof fila !== 'object') continue;

    const f = fila as Record<string, unknown>;
    const lat = Number(f['lat']);
    const lng = Number(f['lon']);
    const nombre = typeof f['display_name'] === 'string' ? f['display_name'].trim() : '';

    if (nombre === '' || !coordenadasValidas(lat, lng)) continue;
    salida.push({ nombre, lat, lng });
  }

  return salida.slice(0, MAX_RESULTADOS);
}

/**
 * Las coordenadas de un enlace de Google Maps pegado.
 *
 * Lo que la pareja tiene a mano suele ser «Compartir → Copiar enlace» de Google
 * Maps. Se leen las formas largas (`@40.4,-3.7,17z`, `!3d40.4!4d-3.7`,
 * `?q=40.4,-3.7`, `?ll=…`) y nada más: los enlaces cortos (`maps.app.goo.gl`)
 * esconden las coordenadas tras una redirección que un navegador no puede
 * seguir sin permiso de Google, y se dice en pantalla en vez de adivinar.
 */
export function coordenadasDeEnlace(texto: string): { lat: number; lng: number } | null {
  const limpio = texto.trim();
  if (!/^https?:\/\//i.test(limpio)) return null;

  const numero = '(-?\\d{1,3}(?:\\.\\d+)?)';
  const formas = [
    new RegExp(`!3d${numero}!4d${numero}`),
    new RegExp(`@${numero},${numero}`),
    new RegExp(`[?&](?:q|ll|query|center)=${numero}(?:,|%2C)${numero}`),
  ];

  for (const forma of formas) {
    const encontrado = forma.exec(limpio);
    if (!encontrado) continue;
    const lat = Number(encontrado[1]);
    const lng = Number(encontrado[2]);
    if (coordenadasValidas(lat, lng)) return { lat, lng };
  }

  return null;
}

export async function buscarDireccion(
  consulta: string,
  pedir: typeof fetch = fetch,
): Promise<RespuestaDeBusqueda> {
  if (consulta.trim().length < 3) return { ok: false, motivo: 'vacia' };

  // Un enlace de Google Maps no se busca: ya trae el sitio.
  const delEnlace = coordenadasDeEnlace(consulta);
  if (delEnlace) {
    return {
      ok: true,
      resultados: [
        { nombre: `${delEnlace.lat.toFixed(5)}, ${delEnlace.lng.toFixed(5)}`, ...delEnlace },
      ],
    };
  }

  try {
    const respuesta = await pedir(urlDeBusqueda(consulta), {
      headers: { Accept: 'application/json' },
    });
    if (!respuesta.ok) return { ok: false, motivo: 'red' };

    return { ok: true, resultados: leerResultados(await respuesta.json()) };
  } catch {
    return { ok: false, motivo: 'red' };
  }
}
