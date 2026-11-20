/**
 * Las secciones de la web pública de una boda.
 *
 * **Copia literal.** Este fichero y
 * `src/app/features/public-site/secciones/secciones.ts` son idénticos desde la
 * línea marcadora de ahí abajo, y un test lo comprueba comparando los dos
 * ficheros en disco. Se duplica porque las funciones y el cliente son dos
 * paquetes npm distintos, y porque esto lo necesitan los dos: el servidor para
 * sanear lo que se publica, el cliente para pintarlo y editarlo. Una copia que
 * nadie compara deja de ser una copia el día que alguien toca una.
 *
 * **Por qué se sanea.** `content` no es campo de sistema: la pareja lo escribe
 * directamente desde su panel. Y la proyección pública es el único documento
 * que puede leer un anónimo. Sin este filtro, cualquier cosa que la pareja —o
 * quien le robe la sesión— metiera en `content` se publicaría tal cual. Por eso
 * se reconstruye campo a campo con lista blanca, igual que la proyección
 * entera, y no se copia y se borra lo sospechoso.
 *
 * Aquí todo es **texto plano**. El editor de texto enriquecido llega con su
 * saneado en servidor (`sanitizeRichContent`, regla 5) y no antes: HTML libre
 * publicado a trescientos invitados sin sanear es un XSS almacenado.
 */

// === COPIA LITERAL: de aquí al final, idéntico en cliente y funciones ===

export const MAX_SECCIONES = 20;
export const MAX_ID = 40;

export const TIPOS_SECCION = [
  'portada',
  'texto',
  'evento',
  'preguntas',
  'cronologia',
  'alojamientos',
  'dressCode',
  'quiz',
  'galeria',
  'regalos',
  'mapa',
  'playlist',
] as const;
export type TipoSeccion = (typeof TIPOS_SECCION)[number];

export interface Seccion {
  readonly id: string;
  readonly type: TipoSeccion;
  readonly enabled: boolean;
  readonly order: number;
  readonly fields: Readonly<Record<string, string>>;
}

/**
 * Qué campos admite cada tipo y hasta dónde.
 *
 * El límite no es decoración: sin él, una sección con cien mil caracteres se
 * publica en el documento que descarga cada invitado desde el móvil, y de paso
 * roza el tope de 1 MiB por documento de Firestore.
 */
export const CAMPOS_POR_TIPO: Record<TipoSeccion, Readonly<Record<string, number>>> = {
  // La portada se pinta con los nombres, la fecha y la foto de la boda. No
  // tiene campos propios, y por eso no se puede desactivar ni borrar.
  portada: {},
  texto: { titulo: 80, texto: 5000 },
  evento: { titulo: 80, hora: 5, lugar: 120, direccion: 200, nota: 300 },
  // Las preguntas no se escriben aquí: viven en su colección (§8.9). Esta
  // sección solo decide **dónde** van en la página y con qué título.
  preguntas: { titulo: 80 },
  // Igual la cronología del día (§8.13).
  cronologia: { titulo: 80 },
  // Y los alojamientos (§8.10).
  alojamientos: { titulo: 80 },
  // Y el dress code (§8.11), que tampoco se escribe aquí: vive en
  // `modules.dressCode.config` porque es un contenido único y no una lista.
  dressCode: { titulo: 80 },
  // El quiz (§8.7) no se pinta dentro de la página: esta sección es el cartel
  // que lleva a `/quiz`, que es donde está el juego.
  quiz: { titulo: 80 },
  // Y la galería (§8.5), que tampoco se pinta dentro: esta sección es el
  // cartel que lleva a su página.
  galeria: { titulo: 80 },
  // Y los regalos (§8.8). Tampoco se pintan dentro: el número de cuenta no
  // puede viajar en la proyección pública, así que esta sección es el cartel
  // que lleva a la página, y la página la sirve una función a quien se
  // identifica.
  regalos: { titulo: 80 },
  // Y el mapa (§8.6): esta sección es el cartel que lleva a su página, donde
  // Leaflet se carga solo para quien la abre.
  mapa: { titulo: 80 },
  // La playlist (§8.14), igual: el cartel que lleva a su página.
  playlist: { titulo: 80 },
};

/**
 * Qué campos llevan **texto enriquecido** y no texto a secas.
 *
 * Son los que la pareja escribe con la barra de formato del panel, y los
 * únicos que la web pública pinta como HTML. Todo lo demás viaja como texto y
 * se escapa al pintarse, que es lo que lo hace inofensivo.
 *
 * El saneado de estos vive **solo en el servidor** (`dominio/html.ts` de las
 * funciones): lo que decidiera el navegador de la pareja no protege a nadie.
 */
export const CAMPOS_RICOS: Record<TipoSeccion, readonly string[]> = {
  portada: [],
  texto: ['texto'],
  evento: [],
  preguntas: [],
  cronologia: [],
  alojamientos: [],
  dressCode: [],
  quiz: [],
  galeria: [],
  regalos: [],
  mapa: [],
  playlist: [],
};

export function esCampoRico(tipo: TipoSeccion, campo: string): boolean {
  return CAMPOS_RICOS[tipo].includes(campo);
}

function texto(valor: unknown, maximo: number): string {
  if (typeof valor !== 'string') return '';
  // Se normalizan los saltos y se recortan, en ese orden: cortar antes dejaría
  // finales con media secuencia de escape.
  return valor.replace(/\r\n/g, '\n').trim().slice(0, maximo);
}

function esTipo(valor: unknown): valor is TipoSeccion {
  return TIPOS_SECCION.includes(valor as TipoSeccion);
}

/** Ids: solo minúsculas, números y guiones. Es lo que va a una clave y a un ancla. */
function id(valor: unknown): string | null {
  if (typeof valor !== 'string') return null;
  const limpio = valor.trim().toLowerCase().slice(0, MAX_ID);
  return /^[a-z0-9][a-z0-9-]*$/.test(limpio) ? limpio : null;
}

/**
 * Deja una lista de secciones publicable. Nunca lanza.
 *
 * Ante cualquier cosa rara devuelve lo que sí ha entendido, y en el peor caso
 * las secciones iniciales: una web sin secciones es una página en blanco, y el
 * invitado ya está delante con el enlace abierto.
 */
export function sanearSecciones(valor: unknown): readonly Seccion[] {
  if (!Array.isArray(valor)) return SECCIONES_INICIALES;

  const vistos = new Set<string>();
  const salida: Seccion[] = [];

  for (const crudo of valor) {
    if (salida.length >= MAX_SECCIONES) break;
    if (crudo === null || typeof crudo !== 'object') continue;

    const s = crudo as Record<string, unknown>;
    const clave = id(s['id']);
    const tipo = s['type'];

    if (!clave || !esTipo(tipo) || vistos.has(clave)) continue;
    vistos.add(clave);

    const permitidos = CAMPOS_POR_TIPO[tipo];
    const fields: Record<string, string> = {};
    const escritos =
      s['fields'] !== null && typeof s['fields'] === 'object'
        ? (s['fields'] as Record<string, unknown>)
        : {};

    // Lista blanca: se recorren los campos **permitidos**, no los escritos. Al
    // revés, un campo inventado por el cliente acabaría publicado.
    for (const [campo, maximo] of Object.entries(permitidos)) {
      fields[campo] = texto(escritos[campo], maximo);
    }

    salida.push({
      id: clave,
      type: tipo,
      // La portada no se puede apagar: sin ella no hay web, solo un hueco.
      enabled: tipo === 'portada' ? true : s['enabled'] === true,
      order: typeof s['order'] === 'number' && Number.isFinite(s['order']) ? s['order'] : 0,
      fields,
    });
  }

  if (salida.length === 0) return SECCIONES_INICIALES;

  // La portada siempre primero, pase lo que pase con los `order` que lleguen.
  salida.sort((a, b) => {
    if (a.type === 'portada') return -1;
    if (b.type === 'portada') return 1;
    return a.order - b.order;
  });

  return salida.map((seccion, indice) => ({ ...seccion, order: indice }));
}

/**
 * Con lo que nace una boda.
 *
 * Nace con secciones de verdad y **apagadas salvo la portada**: la pareja entra
 * y encuentra un guion que rellenar en vez de un lienzo vacío, pero su web no
 * anuncia una ceremonia de la que aún no sabe nada. Los títulos son editables;
 * lo que importa es que exista la estructura.
 */
export const SECCIONES_INICIALES: readonly Seccion[] = [
  { id: 'portada', type: 'portada', enabled: true, order: 0, fields: {} },
  {
    id: 'historia',
    type: 'texto',
    enabled: false,
    order: 1,
    fields: { titulo: 'Nuestra historia', texto: '' },
  },
  {
    id: 'ceremonia',
    type: 'evento',
    enabled: false,
    order: 2,
    fields: { titulo: 'Ceremonia', hora: '', lugar: '', direccion: '', nota: '' },
  },
  {
    id: 'banquete',
    type: 'evento',
    enabled: false,
    order: 3,
    fields: { titulo: 'Banquete', hora: '', lugar: '', direccion: '', nota: '' },
  },
  {
    id: 'cronologia',
    type: 'cronologia',
    enabled: false,
    order: 4,
    fields: { titulo: 'El día' },
  },
  {
    id: 'preguntas',
    type: 'preguntas',
    enabled: false,
    order: 5,
    fields: { titulo: 'Preguntas frecuentes' },
  },
  {
    id: 'alojamientos',
    type: 'alojamientos',
    enabled: false,
    order: 6,
    fields: { titulo: 'Dónde dormir' },
  },
  {
    id: 'dress-code',
    type: 'dressCode',
    enabled: false,
    order: 7,
    fields: { titulo: 'Cómo vestir' },
  },
  {
    id: 'quiz',
    type: 'quiz',
    enabled: false,
    order: 8,
    fields: { titulo: 'El juego de la boda' },
  },
  {
    id: 'galeria',
    type: 'galeria',
    enabled: false,
    order: 9,
    fields: { titulo: 'Las fotos' },
  },
  {
    id: 'regalos',
    type: 'regalos',
    enabled: false,
    order: 10,
    fields: { titulo: 'Regalos' },
  },
  {
    id: 'mapa',
    type: 'mapa',
    enabled: false,
    order: 11,
    fields: { titulo: 'Cómo llegar' },
  },
  {
    id: 'playlist',
    type: 'playlist',
    enabled: false,
    order: 12,
    fields: { titulo: 'La música' },
  },
  {
    id: 'contacto',
    type: 'texto',
    enabled: false,
    order: 13,
    fields: { titulo: 'Contacto', texto: '' },
  },
];
