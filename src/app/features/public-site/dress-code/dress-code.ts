/**
 * El dress code (§8.11).
 *
 * **COPIA LITERAL** de `functions/src/dominio/dress-code.ts`.
 * Si tocas una, toca la otra: lo vigila `copia-literal.spec.ts`.
 *
 * A diferencia de las preguntas, la cronología y los alojamientos, esto no es
 * una lista: es un contenido único por boda, y por eso vive en
 * `modules.dressCode.config` y no en una subcolección (§5.10).
 *
 * Lo que decide el diseño de este módulo es una frase de los requisitos: «cada
 * muestra lleva su nombre escrito», porque el color solo no comunica «verde
 * oliva» a nadie. De ahí que los colores **no sean hexadecimales libres** sino
 * ids de una lista cerrada: así cada muestra tiene nombre por construcción, y
 * no hay forma de que llegue a la web pública un color sin nombre —ni una
 * cadena cualquiera dentro de un atributo `style`, que es lo que sería un
 * hexadecimal que viene del cliente.
 */

// === COPIA LITERAL: de aquí al final, idéntico en cliente y funciones ===

export const MAX_DESCRIPCION_DRESS = 1200;
export const MAX_COLORES = 8;
export const MAX_AVISOS = 6;
export const MAX_AVISO = 140;

/**
 * Los colores que la pareja puede elegir, con su nombre.
 *
 * Son **contenido**, no tokens del sistema visual: describen una tela, no un
 * estado de la interfaz, y por eso tienen hexadecimal propio y viven aquí y no
 * en `design-system/tokens`. La lista es cerrada a propósito (ver arriba) y
 * cubre lo que se dice de verdad en una boda; si falta uno, se añade aquí y
 * aparece en los dos lados a la vez.
 */
export const COLORES_DRESS = [
  { id: 'blanco', nombre: 'Blanco', hex: '#f8f6f2' },
  { id: 'marfil', nombre: 'Marfil', hex: '#f1e9d8' },
  { id: 'beige', nombre: 'Beige', hex: '#e2d3bb' },
  { id: 'arena', nombre: 'Arena', hex: '#d6c3a5' },
  { id: 'camel', nombre: 'Camel', hex: '#bd9460' },
  { id: 'marron', nombre: 'Marrón', hex: '#7b5a3c' },
  { id: 'chocolate', nombre: 'Chocolate', hex: '#4a3122' },
  { id: 'negro', nombre: 'Negro', hex: '#1d1b1a' },
  { id: 'gris-marengo', nombre: 'Gris marengo', hex: '#4b4f55' },
  { id: 'gris-perla', nombre: 'Gris perla', hex: '#c7c9cb' },
  { id: 'plata', nombre: 'Plata', hex: '#b9bcc0' },
  { id: 'dorado', nombre: 'Dorado', hex: '#c9a349' },
  { id: 'azul-marino', nombre: 'Azul marino', hex: '#1f2d4d' },
  { id: 'azul', nombre: 'Azul', hex: '#3a5f9e' },
  { id: 'celeste', nombre: 'Celeste', hex: '#9fc3e0' },
  { id: 'turquesa', nombre: 'Turquesa', hex: '#4aa39b' },
  { id: 'verde-botella', nombre: 'Verde botella', hex: '#1f4536' },
  { id: 'verde-oliva', nombre: 'Verde oliva', hex: '#6b7045' },
  { id: 'verde-salvia', nombre: 'Verde salvia', hex: '#a9bda4' },
  { id: 'amarillo', nombre: 'Amarillo', hex: '#e9c454' },
  { id: 'mostaza', nombre: 'Mostaza', hex: '#c69a2c' },
  { id: 'naranja', nombre: 'Naranja', hex: '#d97a3c' },
  { id: 'coral', nombre: 'Coral', hex: '#e08274' },
  { id: 'rojo', nombre: 'Rojo', hex: '#a82f2c' },
  { id: 'burdeos', nombre: 'Burdeos', hex: '#6d2436' },
  { id: 'rosa-palo', nombre: 'Rosa palo', hex: '#e7c4c1' },
  { id: 'rosa', nombre: 'Rosa', hex: '#d98aa0' },
  { id: 'malva', nombre: 'Malva', hex: '#b091ab' },
  { id: 'lila', nombre: 'Lila', hex: '#9b8ec4' },
  { id: 'morado', nombre: 'Morado', hex: '#5d4178' },
] as const;

export type IdColorDress = (typeof COLORES_DRESS)[number]['id'];

export interface ColorDress {
  readonly id: string;
  readonly nombre: string;
  readonly hex: string;
}

export function colorDress(id: unknown): ColorDress | null {
  if (typeof id !== 'string') return null;
  return COLORES_DRESS.find((color) => color.id === id) ?? null;
}

/** Lo que la web pública enseña del dress code. */
export interface DressCodePublico {
  /** HTML ya saneado por quien construye la proyección. */
  readonly descripcion: string;
  readonly sugeridos: readonly ColorDress[];
  readonly evitar: readonly ColorDress[];
  /** «La ceremonia es sobre hierba: los tacones finos se hunden.» */
  readonly avisos: readonly string[];
}

export const DRESS_CODE_VACIO: DressCodePublico = {
  descripcion: '',
  sugeridos: [],
  evitar: [],
  avisos: [],
};

/**
 * Los colores de una de las dos listas, resueltos y sin repetir.
 *
 * Un id que no está en la lista cerrada se cae: no hay nombre que escribir al
 * lado de la muestra, y una muestra sin nombre no es información (§9.1).
 */
function colores(valor: unknown): readonly ColorDress[] {
  if (!Array.isArray(valor)) return [];

  const salida: ColorDress[] = [];
  const vistos = new Set<string>();

  for (const crudo of valor) {
    const color = colorDress(crudo);
    if (!color || vistos.has(color.id)) continue;
    vistos.add(color.id);
    salida.push(color);
    if (salida.length === MAX_COLORES) break;
  }

  return salida;
}

function avisos(valor: unknown): readonly string[] {
  if (!Array.isArray(valor)) return [];

  const salida: string[] = [];
  for (const crudo of valor) {
    if (typeof crudo !== 'string') continue;
    const texto = crudo.replace(/\s+/g, ' ').trim().slice(0, MAX_AVISO);
    if (texto === '') continue;
    salida.push(texto);
    if (salida.length === MAX_AVISOS) break;
  }

  return salida;
}

/**
 * Deja el dress code publicable. Nunca lanza.
 *
 * La descripción sale **sin tocar el HTML**: saneárlo es cosa de quien
 * construye la proyección (regla 5), que es el único sitio donde está
 * `sanitize-html`. Aquí solo se recorta.
 */
export function sanearDressCode(valor: unknown): DressCodePublico {
  if (valor === null || typeof valor !== 'object') return DRESS_CODE_VACIO;

  const config = valor as Record<string, unknown>;
  const descripcion = typeof config['description'] === 'string' ? config['description'] : '';

  return {
    descripcion: descripcion.slice(0, MAX_DESCRIPCION_DRESS),
    sugeridos: colores(config['suggestedColors']),
    evitar: colores(config['avoidColors']),
    avisos: avisos(config['tips']),
  };
}

/**
 * Lo mismo, pero sobre lo que ya está publicado.
 *
 * `sanearDressCode` lee la **configuración** que escribe la pareja
 * (`description`, `suggestedColors`…). Esta lee la **proyección**, que trae ya
 * los colores resueltos, y los vuelve a resolver por su id contra la lista
 * cerrada: así, aunque alguien consiguiera escribir un `hex` a mano en el
 * documento público, lo que la web pinta sigue saliendo de aquí y no de ahí.
 * Es la frontera de confianza de D-19 aplicada al color.
 */
export function dressCodePublicado(valor: unknown): DressCodePublico {
  if (valor === null || typeof valor !== 'object') return DRESS_CODE_VACIO;

  const publicado = valor as Record<string, unknown>;
  const ids = (lista: unknown): unknown[] =>
    Array.isArray(lista)
      ? lista.map((item) =>
          item !== null && typeof item === 'object'
            ? (item as Record<string, unknown>)['id']
            : item,
        )
      : [];

  return {
    descripcion:
      typeof publicado['descripcion'] === 'string'
        ? publicado['descripcion'].slice(0, MAX_DESCRIPCION_DRESS)
        : '',
    sugeridos: colores(ids(publicado['sugeridos'])),
    evitar: colores(ids(publicado['evitar'])),
    avisos: avisos(publicado['avisos']),
  };
}

/**
 * Si hay algo que enseñar.
 *
 * Una sección de dress code vacía es peor que no tenerla: el invitado entra
 * buscando qué ponerse y se encuentra un título solo.
 */
export function tieneDressCode(dress: DressCodePublico): boolean {
  return (
    dress.descripcion.trim() !== '' ||
    dress.sugeridos.length > 0 ||
    dress.evitar.length > 0 ||
    dress.avisos.length > 0
  );
}

/**
 * Un color que esté en las dos listas a la vez.
 *
 * Es el error que el panel tiene que cazar: «poneos verde oliva» y «evitad el
 * verde oliva» en la misma pantalla deja al invitado sin saber qué hacer.
 */
export function colorEnLasDos(dress: DressCodePublico): readonly ColorDress[] {
  const evitar = new Set(dress.evitar.map((color) => color.id));
  return dress.sugeridos.filter((color) => evitar.has(color.id));
}
