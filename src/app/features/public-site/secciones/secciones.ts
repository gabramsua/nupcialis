/**
 * Las secciones de la web pública de una boda.
 *
 * **Copia literal** de `functions/src/dominio/secciones.ts`, de la línea
 * marcadora de ahí abajo hasta el final. No se edita solo este fichero: se
 * editan los dos, o el test de las funciones falla al compararlos.
 *
 * El cliente necesita esto para pintar las secciones en la web pública y para
 * editarlas en el panel. El servidor, para sanear lo que se publica. Ninguno de
 * los dos puede importar del otro: son dos paquetes npm distintos.
 */

// === COPIA LITERAL: de aquí al final, idéntico en cliente y funciones ===

export const MAX_SECCIONES = 20;
export const MAX_ID = 40;

export const TIPOS_SECCION = ['portada', 'texto', 'evento'] as const;
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
  texto: { titulo: 80, texto: 2000 },
  evento: { titulo: 80, hora: 5, lugar: 120, direccion: 200, nota: 300 },
};

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
    id: 'contacto',
    type: 'texto',
    enabled: false,
    order: 4,
    fields: { titulo: 'Contacto', texto: '' },
  },
];
