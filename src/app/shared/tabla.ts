/**
 * Leer una tabla pegada o subida: CSV, punto y coma, o tabuladores.
 *
 * **Por qué un parser propio y no una librería.** Lo que hace falta es poco y
 * está acotado —separar filas y columnas respetando las comillas—, y una
 * librería de CSV en condiciones son decenas de kilobytes en el panel. Lo que
 * de verdad cuesta en esto no es el algoritmo, son los tres detalles de abajo,
 * y esos hay que resolverlos igual con librería o sin ella.
 *
 * **El separador no es la coma.** Excel en español guarda CSV con **punto y
 * coma**, porque la coma es el separador decimal. Un importador que solo
 * entienda comas deja una única columna con todo dentro y la pareja no sabe por
 * qué. Se detecta mirando la primera línea.
 *
 * **Pegar desde Excel da tabuladores.** Copiar un rango de celdas pone en el
 * portapapeles filas separadas por saltos y columnas por tabulador. Para una
 * lista de treinta invitados es más rápido que guardar un fichero, así que se
 * admite igual.
 *
 * **Las comillas mandan.** `"Pérez, María";666...` son dos columnas, no tres.
 * Dentro de comillas, un separador es texto, y dos comillas seguidas son una
 * comilla.
 */

export type Separador = ',' | ';' | '\t';

export const SEPARADORES: readonly Separador[] = [';', ',', '\t'];

/**
 * Qué separa las columnas de este texto.
 *
 * Se cuenta en la **primera línea no vacía**, que es la de cabeceras: contar en
 * todo el fichero se deja engañar por un campo de notas lleno de comas.
 */
export function detectarSeparador(texto: string): Separador {
  const primera = texto.split(/\r?\n/).find((linea) => linea.trim() !== '') ?? '';

  let mejor: Separador = ';';
  let mas = 0;

  for (const separador of SEPARADORES) {
    const cuantos = contarFuera(primera, separador);
    if (cuantos > mas) {
      mas = cuantos;
      mejor = separador;
    }
  }

  return mejor;
}

/** Cuenta apariciones del separador que no estén dentro de comillas. */
function contarFuera(linea: string, separador: string): number {
  let dentro = false;
  let cuantos = 0;

  for (const c of linea) {
    if (c === '"') dentro = !dentro;
    else if (c === separador && !dentro) cuantos++;
  }

  return cuantos;
}

/**
 * Convierte el texto en filas de celdas.
 *
 * Nunca lanza: ante comillas mal cerradas devuelve lo que ha entendido. Un
 * fichero a medias es más útil que un error, porque la previsualización deja
 * ver qué se ha roto y dónde.
 */
export function parsearTabla(texto: string, separador?: Separador): readonly (readonly string[])[] {
  // Quita el BOM (U+FEFF) que pone Excel al guardar en UTF-8; si no, la
  // primera cabecera llega con un carácter invisible delante y no casa con
  // ningún alias.
  const limpio = texto.replace(/^\uFEFF/, '');
  const sep = separador ?? detectarSeparador(limpio);

  const filas: string[][] = [];
  let fila: string[] = [];
  let celda = '';
  let dentro = false;

  for (let i = 0; i < limpio.length; i++) {
    const c = limpio[i];

    if (dentro) {
      if (c === '"') {
        // Dos comillas seguidas son una comilla escapada.
        if (limpio[i + 1] === '"') {
          celda += '"';
          i++;
        } else {
          dentro = false;
        }
      } else {
        celda += c;
      }
      continue;
    }

    if (c === '"') {
      dentro = true;
    } else if (c === sep) {
      fila.push(celda);
      celda = '';
    } else if (c === '\n' || c === '\r') {
      // `\r\n` cuenta como un solo salto.
      if (c === '\r' && limpio[i + 1] === '\n') i++;
      fila.push(celda);
      filas.push(fila);
      fila = [];
      celda = '';
    } else {
      celda += c;
    }
  }

  // Lo que quede sin cerrar es la última fila.
  if (celda !== '' || fila.length > 0) {
    fila.push(celda);
    filas.push(fila);
  }

  return (
    filas
      .map((f) => f.map((c) => c.trim()))
      // Una fila vacía es la línea en blanco del final, o una separadora que
      // alguien dejó en medio. No es un invitado.
      .filter((f) => f.some((c) => c !== ''))
  );
}

/**
 * ¿Este texto llegó en latin-1 leído como UTF-8?
 *
 * Excel en Windows guarda CSV en ANSI salvo que se le diga lo contrario, y
 * entonces «María» se lee «MarÃ­a». Se detecta por las secuencias que eso deja:
 * una Ã o una Â seguidas de un carácter de control o de puntuación alta no
 * aparecen en ningún nombre real.
 */
export function pareceLatin1(texto: string): boolean {
  return /[ÃÂ][-¿]/.test(texto);
}
