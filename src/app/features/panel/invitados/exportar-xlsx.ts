import type { Celda, Hoja } from './exportacion';

/**
 * El `.xlsx` de verdad.
 *
 * Separado de `exportacion.ts` por una razón concreta: **la librería se carga
 * al pulsar el botón, no al abrir el panel**. Son unas decenas de kilobytes que
 * solo necesita quien exporta, y el panel de la pareja se abre muchas veces por
 * cada exportación.
 *
 * El fichero se monta **en el navegador**, con la lista que ya está cargada. No
 * pasa por el servidor, no se guarda en Storage y no deja copias: la lista de
 * trescientos teléfonos no tiene por qué dar una vuelta de más (§9.4).
 */

/** Una celda de cabecera: en negrita y con el fondo del encabezado. */
function cabecera(titulo: string) {
  return { value: titulo, fontWeight: 'bold' as const };
}

/**
 * Las filas tal y como las quiere la librería: cabecera y después los datos.
 *
 * Exportada para poder probarla contra la librería de verdad: que las filas
 * salgan bien no demuestra que el `.xlsx` se escriba, y lo que se rompe en
 * silencio es el tipo de una celda.
 */
export function datosDeHoja(hoja: Hoja): unknown[][] {
  return [
    hoja.columnas.map((c) => cabecera(c.titulo)),
    ...hoja.filas.map((fila) => fila.map(celda)),
  ];
}

/**
 * Una celda con su tipo.
 *
 * Los números van como números —si no, Excel enseña un aviso verde en cada
 * celda— y el resto como texto. Un teléfono es **texto**: como número perdería
 * el `+` de un prefijo extranjero y el cero inicial.
 */
function celda(valor: Celda) {
  if (valor === null || valor === '') return null;
  if (typeof valor === 'number') return { value: valor, type: Number };
  return { value: valor, type: String };
}

/**
 * Escribe el fichero y lo descarga.
 *
 * Devuelve `false` si la librería no llega a cargar —sin conexión, un bloqueo
 * de red—, para que la pantalla lo pueda contar en vez de no hacer nada.
 */
export async function descargarXlsx(hojas: readonly Hoja[], nombre: string): Promise<boolean> {
  try {
    const { default: escribir } = await import('write-excel-file/browser');

    // La versión 4 devuelve un objeto con `toFile`, `toBlob`…, en vez de
    // descargar por el hecho de pasarle un nombre. Con la forma antigua esto no
    // hacía nada en silencio; lo cazó la prueba de al lado.
    await escribir(
      hojas.map((hoja) => ({
        data: datosDeHoja(hoja),
        sheet: hoja.nombre,
        columns: hoja.columnas.map((c) => ({ width: c.ancho })),
        // La cabecera se queda fija al bajar: una lista de trescientos
        // invitados se mira desde la fila doscientos sin saber qué columna es
        // cuál.
        stickyRowsCount: 1,
      })) as never,
    ).toFile(nombre);

    return true;
  } catch {
    return false;
  }
}
