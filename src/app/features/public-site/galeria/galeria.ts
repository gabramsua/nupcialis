/**
 * La galería de fotos (§8.5).
 *
 * **COPIA LITERAL** de `functions/src/dominio/galeria.ts`.
 * Si tocas una, toca la otra: lo vigila su `.spec.ts`.
 *
 * Es el módulo con la lógica de permisos más delicada del producto, y por eso
 * la colección está cerrada a todos (regla de oro 2): quién ve qué lo decide
 * siempre `listPhotos` en servidor.
 */

// === COPIA LITERAL: de aquí al final, idéntico en cliente y funciones ===

/** Lo que el navegador puede mandar. HEIC no: no lo pinta ni el canvas. */
export const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type TipoFoto = (typeof TIPOS_PERMITIDOS)[number];

export function esTipoPermitido(valor: unknown): valor is TipoFoto {
  return typeof valor === 'string' && (TIPOS_PERMITIDOS as readonly string[]).includes(valor);
}

/**
 * Cuántas fotos se suben de una vez.
 *
 * Tres, como el prototipo. No es una limitación técnica: es que subirlas de
 * tres en tres da una barra de progreso que acaba, y elegir cuarenta de golpe
 * en un móvil con mala cobertura acaba en una pantalla colgada.
 */
export const MAX_POR_SUBIDA = 3;

/**
 * El lado largo al que el **navegador** reduce la foto antes de mandarla.
 *
 * Reducir en el móvil y no en el servidor es lo que hace que esto funcione en
 * una finca con una barra de cobertura: una foto de cámara son ocho megas y
 * esto la deja en menos de uno. De paso, el servidor no necesita ninguna
 * librería de imagen.
 */
export const LADO_MAXIMO = 1600;

/** La miniatura de la rejilla. La manda el móvil en la misma llamada. */
export const LADO_MINIATURA = 480;

export const CALIDAD_JPEG = 0.82;

/** Tope de seguridad del servidor. El cliente manda mucho menos. */
export const MAX_BYTES = 8 * 1024 * 1024;

/** Cuántas fotos trae cada página de la galería. */
export const POR_PAGINA = 24;

export const MAX_PIE = 140;

export type EstadoFoto = 'pending' | 'approved' | 'rejected';

export interface FotoPublica {
  readonly id: string;
  /** URL de la foto grande, con su token. */
  readonly url: string;
  /** URL de la miniatura: es lo que carga la rejilla. */
  readonly urlMiniatura: string;
  readonly guestId: string;
  /** Cómo firma quien la subió. El mote si lo tiene; si no, su nombre. */
  readonly autor: string;
  readonly pie: string;
  /** ISO. Se ordena por aquí, de lo último a lo primero. */
  readonly creadoEn: string;
}

function texto(valor: unknown, maximo: number): string {
  if (typeof valor !== 'string') return '';
  return valor.replace(/\s+/g, ' ').trim().slice(0, maximo);
}

/**
 * Deja la lista pintable. Nunca lanza.
 *
 * Una foto sin URL no es una foto: se cae. Pasa si la subida se quedó a medias
 * y el documento se escribió sin el fichero detrás.
 */
export function sanearFotos(valor: unknown): readonly FotoPublica[] {
  if (!Array.isArray(valor)) return [];

  const salida: FotoPublica[] = [];
  const vistas = new Set<string>();

  for (const crudo of valor) {
    if (crudo === null || typeof crudo !== 'object') continue;

    const f = crudo as Record<string, unknown>;
    const id = texto(f['id'], 60);
    const url = typeof f['url'] === 'string' ? f['url'] : '';
    if (id === '' || url === '' || vistas.has(id)) continue;

    vistas.add(id);
    salida.push({
      id,
      url,
      urlMiniatura:
        typeof f['urlMiniatura'] === 'string' && f['urlMiniatura'] !== '' ? f['urlMiniatura'] : url,
      guestId: texto(f['guestId'], 60),
      autor: texto(f['autor'], 80),
      pie: texto(f['pie'], MAX_PIE),
      creadoEn: typeof f['creadoEn'] === 'string' ? f['creadoEn'] : '',
    });
  }

  return salida;
}

/**
 * Quién puede borrar una foto.
 *
 * La suya, y la pareja cualquiera. Es la regla del prototipo y es la correcta:
 * el invitado se arrepiente de la suya, y la pareja responde de toda la
 * galería porque es su boda y su web.
 */
export function puedeBorrar(
  foto: Pick<FotoPublica, 'guestId'>,
  quien: { readonly guestId: string | null; readonly esPareja: boolean },
): boolean {
  if (quien.esPareja) return true;
  return quien.guestId !== null && quien.guestId === foto.guestId;
}

/** La extensión que le toca al fichero, para que Storage sirva bien el tipo. */
export function extensionDe(contentType: string): string {
  if (contentType === 'image/png') return 'png';
  if (contentType === 'image/webp') return 'webp';
  return 'jpg';
}

/**
 * Cuánto ocupa de verdad un base64.
 *
 * Se comprueba **antes** de convertirlo a bytes: así una cadena de cien megas
 * se rechaza por su longitud y no después de reservar cien megas de memoria
 * en la función.
 */
export function bytesDeBase64(base64: string): number {
  const limpio = base64.replace(/=+$/, '');
  return Math.floor((limpio.length * 3) / 4);
}

/** El pie de foto, tal como se guarda. */
export function sanearPie(valor: unknown): string {
  return texto(valor, MAX_PIE);
}
