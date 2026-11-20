/**
 * Leer un `.xlsx` que suba la pareja.
 *
 * La mitad de las listas de invitados del mundo son un Excel. Hasta ahora había
 * que guardarlo como CSV —con el punto y coma y el BOM, que es donde la gente se
 * atasca— o copiar y pegar las celdas. Esto quita ese paso.
 *
 * La librería se carga **al elegir el fichero**, no al abrir la pantalla: es la
 * misma que escribe la exportación y no la necesita quien pega celdas.
 *
 * Devuelve una tabla de texto, exactamente con la forma que ya produce el
 * pegado, para que el resto de la importación no distinga de dónde vino.
 */

/** Lo que se acepta en el campo de fichero. */
export const TIPOS_ACEPTADOS = '.csv,.tsv,.txt,.xlsx,text/csv';

export function esXlsx(nombre: string): boolean {
  return /\.xlsx$/i.test(nombre.trim());
}

/**
 * Una celda de Excel, en texto.
 *
 * Las fechas se escriben en ISO —así una fecha de boda llega legible y no como
 * «45678»—, los números sin notación científica y lo que no se entiende, vacío.
 */
export function comoTexto(valor: unknown): string {
  if (valor === null || valor === undefined) return '';
  if (valor instanceof Date) return valor.toISOString().slice(0, 10);
  if (typeof valor === 'number') return Number.isFinite(valor) ? String(valor) : '';
  if (typeof valor === 'boolean') return valor ? 'sí' : 'no';
  return String(valor).trim();
}

/**
 * Quita las filas del final que estén vacías.
 *
 * Una hoja de Excel trae casi siempre decenas de filas vacías debajo de los
 * datos: la pareja ha borrado contenido pero las filas siguen ahí. Sin esto, la
 * importación diría «trescientas cincuenta filas» de doscientos invitados.
 */
export function sinFilasVacias(filas: readonly (readonly string[])[]): readonly string[][] {
  const limpias = filas.map((fila) => fila.map((celda) => celda.trim()));

  let ultima = limpias.length;
  while (ultima > 0 && limpias[ultima - 1]!.every((celda) => celda === '')) ultima--;

  return limpias.slice(0, ultima);
}

/**
 * Lo que devuelve la librería: una hoja con su nombre y sus filas.
 *
 * Devuelve **las hojas**, también pidiéndole una sola, así que hay que entrar
 * en la primera. Pasarle el resultado directo a un `map` de filas no fallaba
 * con un error claro: daba «no se puede leer» para cualquier fichero, incluido
 * uno bueno. Lo cazó la prueba contra un libro de verdad.
 */
interface HojaLeida {
  readonly sheet?: unknown;
  readonly data?: unknown;
}

/** Las filas de la primera hoja, venga la librería como venga. */
export function filasDeLaPrimeraHoja(crudo: unknown): unknown[][] {
  if (!Array.isArray(crudo)) return [];

  const primera = crudo[0] as HojaLeida | unknown[] | undefined;
  if (primera === undefined) return [];

  // Una lista de hojas: `[{ sheet, data }]`.
  if (!Array.isArray(primera) && Array.isArray((primera as HojaLeida).data)) {
    return (primera as { data: unknown[][] }).data;
  }

  // Ya son filas.
  return crudo as unknown[][];
}

export type LecturaXlsx =
  | { readonly ok: true; readonly filas: readonly string[][] }
  | { readonly ok: false; readonly motivo: 'no-se-puede-leer' | 'vacio' };

/**
 * Lee la **primera hoja** del libro.
 *
 * Solo la primera, a propósito: en la hoja de una boda las demás son el reparto
 * de mesas a medias, las cuentas o una copia vieja. Importar todas metería
 * invitados duplicados y nadie entendería de dónde salen.
 */
export async function leerXlsx(fichero: Blob): Promise<LecturaXlsx> {
  try {
    const { default: leer } = await import('read-excel-file/browser');
    const crudas = filasDeLaPrimeraHoja(await leer(fichero as never, { sheet: 1 } as never));

    const filas = sinFilasVacias(
      crudas.map((fila) => (Array.isArray(fila) ? fila.map(comoTexto) : [])),
    );

    return filas.length === 0 ? { ok: false, motivo: 'vacio' } : { ok: true, filas };
  } catch {
    // Un `.xlsx` que no es un `.xlsx`, un `.xls` antiguo renombrado, o un libro
    // protegido con contraseña. La pantalla lo cuenta; aquí no hay nada que
    // hacer.
    return { ok: false, motivo: 'no-se-puede-leer' };
  }
}
