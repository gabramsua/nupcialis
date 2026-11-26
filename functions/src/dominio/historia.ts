/**
 * «Nuestra historia» (plan extendido).
 *
 * **COPIA LITERAL** de `src/app/features/public-site/historia/historia.ts`.
 * Si tocas una, toca la otra: lo vigila `historia.spec.ts`.
 *
 * Cinco apartados fijos, cada uno con un texto enriquecido y hasta dos fotos
 * que van **después** del texto (así, entre un apartado y el siguiente). El
 * contenido es único por boda y vive en `content.story`, no en una subcolección.
 *
 * Lo que sale a la web pública se reconstruye con lista blanca: las fotos solo
 * pueden ser URLs de descarga de Firebase Storage, y el HTML pasa por el
 * saneador del servidor justo antes de publicarse (regla de oro 5).
 */

// === COPIA LITERAL: de aquí al final, idéntico en cliente y funciones ===

export const CLAVES_HISTORIA = ['conocemos', 'beso', 'recuerdo', 'viaje', 'pedida'] as const;
export type ClaveHistoria = (typeof CLAVES_HISTORIA)[number];

export const FOTOS_POR_APARTADO = 2;
export const MAX_TEXTO_HISTORIA = 4000;
export const MAX_URL_FOTO = 800;
export const MAX_RUTA_FOTO = 240;

/** `path` es de la pareja (para borrar el fichero); no sale a la web pública. */
export interface FotoDeHistoria {
  readonly url: string;
  readonly path: string;
}

/** Lo que llega a la web pública: la foto sin su ruta de Storage. */
export interface ApartadoPublicoDeHistoria {
  readonly clave: ClaveHistoria;
  /** HTML ya saneado por el servidor. */
  readonly html: string;
  readonly fotos: readonly { readonly url: string }[];
}

export interface ApartadoDeHistoria {
  readonly clave: ClaveHistoria;
  /** HTML tal como lo escribe la pareja. Se sanea al publicarlo. */
  readonly html: string;
  readonly fotos: readonly FotoDeHistoria[];
}

/** Solo URLs de descarga de Storage: nada de `javascript:` ni de dominios ajenos. */
export function esUrlDeFoto(valor: unknown): valor is string {
  return (
    typeof valor === 'string' &&
    valor.length <= MAX_URL_FOTO &&
    /^https:\/\/(firebasestorage\.googleapis\.com|storage\.googleapis\.com)\//.test(valor)
  );
}

function esRutaDeFoto(valor: unknown): valor is string {
  return (
    typeof valor === 'string' &&
    valor.length <= MAX_RUTA_FOTO &&
    /^weddings\/[^/]+\/story\/[^/]+$/.test(valor)
  );
}

function objeto(valor: unknown): Record<string, unknown> {
  return valor !== null && typeof valor === 'object' ? (valor as Record<string, unknown>) : {};
}

/**
 * Los cinco apartados, siempre en su orden y siempre los cinco, vengan como
 * vengan los datos. Nunca lanza.
 *
 * Una foto sin URL válida se descarta; si falta la ruta (se subió por otra vía)
 * se conserva con la ruta vacía: se ve, pero no se podrá borrar el fichero.
 */
export function sanearHistoria(valor: unknown): readonly ApartadoDeHistoria[] {
  const crudo = objeto(valor);

  return CLAVES_HISTORIA.map((clave) => {
    const apartado = objeto(crudo[clave]);
    const html = typeof apartado['html'] === 'string' ? apartado['html'] : '';
    const brutas = Array.isArray(apartado['fotos']) ? apartado['fotos'] : [];

    const fotos: FotoDeHistoria[] = [];
    for (const bruta of brutas) {
      const f = objeto(bruta);
      if (!esUrlDeFoto(f['url'])) continue;
      fotos.push({ url: f['url'], path: esRutaDeFoto(f['path']) ? f['path'] : '' });
      if (fotos.length === FOTOS_POR_APARTADO) break;
    }

    return { clave, html: html.slice(0, MAX_TEXTO_HISTORIA * 2), fotos };
  });
}

/** ¿Hay algo que enseñar? (Un texto vacío del editor es `<p><br></p>`.) */
export function historiaConContenido(
  apartados: readonly { readonly html: string; readonly fotos: readonly unknown[] }[],
  tieneTexto: (html: string) => boolean,
): boolean {
  return apartados.some((a) => a.fotos.length > 0 || tieneTexto(a.html));
}
