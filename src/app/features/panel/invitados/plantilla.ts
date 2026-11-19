/**
 * La plantilla de importación y el reconocimiento de columnas.
 *
 * Dos caminos para la misma pantalla, y hacen falta los dos:
 *
 * - **La plantilla** es para quien empieza de cero: se la descarga, la rellena
 *   y no tiene que adivinar nada. Como las cabeceras coinciden, el mapeo se
 *   resuelve solo y no hay ni un clic que dar.
 * - **El reconocimiento** es para quien ya tiene su lista, que son la mayoría:
 *   el Excel que hizo su madre, la hoja que les pasó la finca, un Google Sheets
 *   a medias. Obligarles a copiar doscientos nombres a nuestro formato es lo
 *   que hace que lo dejen para «otro día».
 */

/** Las columnas que se pueden importar, en el orden de la plantilla. */
export const COLUMNAS = [
  'fullName',
  'nickname',
  'phone',
  'email',
  'groups',
  'side',
  'ageGroup',
  'maxCompanions',
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
    clave: 'email',
    etiqueta: 'Email',
    obligatoria: false,
    alias: ['email', 'correo', 'correo electronico', 'e mail', 'mail'],
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
    clave: 'maxCompanions',
    etiqueta: 'Acompañantes',
    obligatoria: false,
    alias: ['acompanantes', 'acompanante', 'plazas', 'invitados extra', 'companions'],
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
    [
      'María José Pérez',
      'Majo',
      '666123456',
      'majo@ejemplo.com',
      'Familia',
      a,
      'adulto',
      '1',
      'Viene en autobús',
    ],
    ['Íñigo Muñoz', '', '+34677000111', '', 'Universidad, Pádel', b, 'adulto', '0', ''],
    ['Lucía Muñoz', 'Lu', '', '', 'Familia', 'Los dos', 'niño', '0', 'Menú infantil'],
  ];
}

/**
 * El contenido de la plantilla descargable.
 *
 * **Punto y coma y BOM**, los dos a propósito: Excel en español espera punto y
 * coma porque la coma es el separador decimal, y sin el BOM abre el fichero en
 * ANSI y enseña «MarÃ­a» en vez de «María». Las dos cosas juntas hacen que se
 * abra bien con doble clic, que es lo único que la pareja va a intentar.
 */
export function plantillaCsv(pareja: Pareja = { partnerA: '', partnerB: '' }): string {
  const filas = [DEFINICIONES.map((d) => d.etiqueta), ...ejemplos(pareja)];
  return '﻿' + filas.map((fila) => fila.map(entrecomillar).join(';')).join('\r\n') + '\r\n';
}

function entrecomillar(celda: string): string {
  return /[;"\n\r]/.test(celda) ? `"${celda.replace(/"/g, '""')}"` : celda;
}

export const NOMBRE_PLANTILLA = 'invitados-nupcialis.csv';

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
