/**
 * La plantilla de importación y el reconocimiento de columnas.
 *
 * **Solo hay un camino: nuestra plantilla** (D-52). Antes se aceptaba también
 * el CSV de cada cual y celdas pegadas, y cada hoja distinta era un error
 * nuevo: columnas cambiadas de sitio, tildes rotas, el teléfono en las notas.
 * Ahora se descarga la hoja, se rellena y se sube; las cabeceras coinciden y
 * no hay nada que asignar.
 *
 * El reconocimiento sigue tolerando que alguien retoque el nombre de una
 * cabecera («Móvil» por «Teléfono»), pero lo que no encaje se ignora y se dice.
 */

import type { Hoja } from './exportacion';

/** Las columnas que se pueden importar, en el orden de la plantilla. */
export const COLUMNAS = [
  'fullName',
  'nickname',
  'phone',
  'groups',
  'side',
  'ageGroup',
  'notes',
] as const;

export type Columna = (typeof COLUMNAS)[number];

export interface DefinicionColumna {
  readonly clave: Columna;
  /** Cabecera de la plantilla. */
  readonly etiqueta: string;
  readonly obligatoria: boolean;
  /**
   * Cómo la llama la gente en sus propias hojas.
   *
   * Se comparan normalizados —sin acentos ni mayúsculas—, así que aquí van las
   * formas, no cada variante ortográfica.
   */
  readonly alias: readonly string[];
}

export const DEFINICIONES: readonly DefinicionColumna[] = [
  {
    clave: 'fullName',
    etiqueta: 'Nombre y apellidos',
    obligatoria: true,
    alias: ['nombre', 'nombre y apellidos', 'nombre completo', 'invitado', 'name', 'full name'],
  },
  {
    clave: 'nickname',
    etiqueta: 'Mote',
    obligatoria: false,
    alias: ['mote', 'apodo', 'alias', 'nickname', 'como le llaman'],
  },
  {
    clave: 'phone',
    etiqueta: 'Teléfono',
    obligatoria: false,
    alias: ['telefono', 'movil', 'celular', 'tlf', 'tfno', 'phone', 'mobile'],
  },
  {
    clave: 'groups',
    etiqueta: 'Grupos',
    obligatoria: false,
    alias: ['grupo', 'grupos', 'categoria', 'relacion', 'circulo', 'groups', 'group'],
  },
  {
    clave: 'side',
    etiqueta: 'De quién',
    obligatoria: false,
    alias: ['de quien', 'lado', 'parte', 'invitado de', 'por parte de', 'side'],
  },
  {
    clave: 'ageGroup',
    etiqueta: 'Edad',
    obligatoria: false,
    alias: ['edad', 'tipo', 'adulto o nino', 'age'],
  },
  {
    clave: 'notes',
    etiqueta: 'Notas',
    obligatoria: false,
    alias: ['notas', 'observaciones', 'comentarios', 'notes'],
  },
];

/** Sin acentos, sin mayúsculas y sin puntuación, para comparar cabeceras. */
export function normalizarCabecera(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Adivina qué columna es cada cabecera. `null` donde no lo sabe.
 *
 * Nunca asigna la misma columna dos veces: si una hoja trae «Teléfono» y
 * «Teléfono 2», la segunda se queda sin asignar y la pareja decide. Asignarla
 * en silencio pisaría el primer número.
 */
export function adivinarColumnas(cabeceras: readonly string[]): readonly (Columna | null)[] {
  const usadas = new Set<Columna>();

  return cabeceras.map((cabecera) => {
    const limpia = normalizarCabecera(cabecera);
    if (limpia === '') return null;

    const definicion = DEFINICIONES.find(
      (d) => !usadas.has(d.clave) && d.alias.some((alias) => alias === limpia),
    );

    if (definicion) usadas.add(definicion.clave);
    return definicion?.clave ?? null;
  });
}

/** ¿La primera fila son cabeceras o ya es un invitado? */
export function pareceCabecera(fila: readonly string[]): boolean {
  return adivinarColumnas(fila).some((columna) => columna !== null);
}

export interface Pareja {
  readonly partnerA: string;
  readonly partnerB: string;
}

/**
 * Filas de ejemplo, para que se vea qué se espera en cada columna.
 *
 * «De quién» lleva **los nombres de la pareja**, no A y B: la plantilla se
 * genera para su boda, y «De Gabriel» se rellena sin pensar mientras que
 * «Lado B» obliga a recordar quién era B.
 */
function ejemplos(pareja: Pareja): readonly (readonly string[])[] {
  const a = primerNombre(pareja.partnerA) || 'A';
  const b = primerNombre(pareja.partnerB) || 'B';

  return [
    ['María José Pérez', 'Majo', '666123456', 'Familia', a, 'adulto', 'Viene en autobús'],
    ['Íñigo Muñoz', '', '+34677000111', 'Universidad, Pádel', b, 'adulto', ''],
    ['Lucía Muñoz', 'Lu', '', 'Familia', 'Los dos', 'niño', 'Menú infantil'],
  ];
}

/**
 * La plantilla descargable, como hoja para `descargarXlsx`.
 *
 * Un `.xlsx` y no un CSV: se abre con doble clic en cualquier Excel, Numbers o
 * Google Sheets sin separadores ni codificaciones, que era donde se rompían las
 * listas. Todas las celdas van como texto, así el teléfono conserva su `+34`.
 */
export function hojaDePlantilla(pareja: Pareja = { partnerA: '', partnerB: '' }): Hoja {
  const anchos = [28, 14, 16, 24, 14, 10, 30];

  return {
    nombre: 'Invitados',
    columnas: DEFINICIONES.map((d, i) => ({ titulo: d.etiqueta, ancho: anchos[i] ?? 16 })),
    filas: ejemplos(pareja),
  };
}

export const NOMBRE_PLANTILLA = 'invitados-nupcialis.xlsx';

/**
 * Tope de filas por fichero. **Copia del de la función** (`MAX_FILAS`).
 *
 * Duplicado a propósito: aquí sirve para decirlo antes de mandar un megabyte
 * de pegado al servidor, pero quien decide sigue siendo la función. Si algún
 * día se cambia allí, aquí se queda corto y como mucho avisa de más.
 */
export const MAX_FILAS = 1000;

/** Sin acentos ni mayúsculas, para comparar valores de celda. */
function limpio(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

function primerNombre(nombre: string): string {
  return nombre.trim().split(/\s+/)[0] ?? '';
}

const AMBOS = ['ambos', 'los dos', 'los 2', 'dos', 'comun', 'de los dos', 'both', 'todos'];

/**
 * «De quién» es un invitado, escrito como lo escribe la gente.
 *
 * Acepta el nombre de cada uno —entero o solo el primero—, «A»/«B» y las
 * formas habituales de «los dos». Lo que no entiende es **de los dos**, que es
 * lo que menos decide: un invitado mal repartido se corrige con un clic, pero
 * uno asignado al lado equivocado sin avisar sale en la lista del otro.
 *
 * `undefined` si la celda está vacía, para que el servidor ponga su defecto.
 */
export function lado(valor: string, pareja: Pareja): 'A' | 'B' | 'both' | undefined {
  const v = limpio(valor).replace(/^de /, '');
  if (v === '') return undefined;
  if (AMBOS.includes(v)) return 'both';

  const coincide = (nombre: string) => {
    const completo = limpio(nombre);
    return completo !== '' && (v === completo || v === limpio(primerNombre(nombre)));
  };

  if (v === 'a' || coincide(pareja.partnerA)) return 'A';
  if (v === 'b' || coincide(pareja.partnerB)) return 'B';
  return 'both';
}

/**
 * Los grupos de una celda. Varios, separados por comas: «Universidad, Pádel».
 *
 * Solo la coma. Partir por « y » sería más cómodo y rompería «Amigos y
 * vecinos», que es un grupo, no dos.
 */
export function nombresDeGrupo(valor: string): readonly string[] {
  return [
    ...new Set(
      valor
        .split(',')
        .map((n) => n.trim().replace(/\s+/g, ' '))
        .filter((n) => n !== ''),
    ),
  ];
}
