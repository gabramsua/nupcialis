import { describe, expect, it } from 'vitest';

import {
  TIPOS_ACEPTADOS,
  comoTexto,
  esCsv,
  esXlsx,
  parsearCsv,
  filasDeLaPrimeraHoja,
  leerXlsx,
  sinFilasVacias,
} from './leer-xlsx';

/**
 * Subir el Excel tal cual.
 *
 * La mitad de las listas de invitados son un Excel, y hasta ahora había que
 * guardarlo como CSV con punto y coma y BOM —que es justo donde la gente se
 * atasca— o copiar y pegar las celdas.
 *
 * Lo que se vigila:
 *
 * 1. **Que un libro de verdad se lea**, escrito con la misma librería que usa
 *    la exportación. Con una tabla inventada no se demuestra nada.
 * 2. **Las fechas y los números**, que es lo que Excel entrega en un formato que
 *    nadie quiere ver en una celda («45678» por una fecha).
 * 3. **Las filas vacías del final**, que una hoja trae siempre a decenas.
 */

describe('esXlsx', () => {
  it('reconoce la extensión, en mayúsculas también', () => {
    expect(esXlsx('invitados.xlsx')).toBe(true);
    expect(esXlsx('Invitados.XLSX')).toBe(true);
    expect(esXlsx(' lista.xlsx ')).toBe(true);
  });

  it('un CSV no es un xlsx, y un .xls antiguo tampoco', () => {
    expect(esXlsx('invitados.csv')).toBe(false); // el CSV se lee aparte (esCsv)
    expect(esXlsx('invitados.xls')).toBe(false);
    expect(esXlsx('invitados.xlsx.txt')).toBe(false);
  });

  it('el campo de fichero los acepta', () => {
    expect(TIPOS_ACEPTADOS).toContain('.xlsx');
    // Excel y CSV (D-55); los `.xls` antiguos y el texto, no.
    expect(TIPOS_ACEPTADOS).toContain('.csv');
    expect(TIPOS_ACEPTADOS).not.toContain('.xls,');
  });
});

describe('comoTexto', () => {
  /** Excel da las fechas como objeto; en una celda de texto queremos la fecha. */
  it('una fecha sale en ISO, no como número de serie', () => {
    expect(comoTexto(new Date('2027-06-12T00:00:00.000Z'))).toBe('2027-06-12');
  });

  it('los números salen enteros, sin notación científica', () => {
    expect(comoTexto(600111222)).toBe('600111222');
    expect(comoTexto(0)).toBe('0');
    expect(comoTexto(Number.NaN)).toBe('');
  });

  it('las celdas vacías son cadena vacía, no «null»', () => {
    expect(comoTexto(null)).toBe('');
    expect(comoTexto(undefined)).toBe('');
  });

  it('un sí/no de Excel se lee como sí/no', () => {
    expect(comoTexto(true)).toBe('sí');
    expect(comoTexto(false)).toBe('no');
  });

  it('el texto se recorta', () => {
    expect(comoTexto('  María  ')).toBe('María');
  });
});

describe('sinFilasVacias', () => {
  /** Una hoja de Excel trae decenas de filas vacías debajo de los datos. */
  it('quita las vacías del final, no las de dentro', () => {
    const filas = sinFilasVacias([
      ['Nombre', 'Teléfono'],
      ['María', '600111222'],
      ['', ''],
      ['Ana', '600333444'],
      ['', ''],
      ['', ''],
    ]);

    expect(filas).toEqual([
      ['Nombre', 'Teléfono'],
      ['María', '600111222'],
      ['', ''],
      ['Ana', '600333444'],
    ]);
  });

  it('una hoja entera vacía se queda en nada', () => {
    expect(sinFilasVacias([['', ''], ['  ']])).toEqual([]);
  });
});

describe('leerXlsx', () => {
  /** El libro se escribe con la misma librería que la exportación. */
  async function libroDePrueba(filas: unknown[][]): Promise<Blob> {
    const { default: escribir } = await import('write-excel-file/node');
    const buffer = await escribir(
      filas.map((fila) => fila.map((valor) => ({ value: valor }))) as never,
    ).toBuffer();

    return new Blob([new Uint8Array(buffer)]);
  }

  it('lee la hoja de un libro de verdad', async () => {
    const libro = await libroDePrueba([
      ['Nombre', 'Teléfono'],
      ['María José Pérez', '600111222'],
      ['Ana Ruiz', '600333444'],
    ]);

    const lectura = await leerXlsx(libro);

    expect(lectura.ok).toBe(true);
    if (lectura.ok) {
      expect(lectura.filas).toEqual([
        ['Nombre', 'Teléfono'],
        ['María José Pérez', '600111222'],
        ['Ana Ruiz', '600333444'],
      ]);
    }
  });

  it('un libro vacío se dice, no se da por bueno', async () => {
    const lectura = await leerXlsx(await libroDePrueba([['']]));

    expect(lectura).toEqual({ ok: false, motivo: 'vacio' });
  });

  /** Un `.xls` antiguo renombrado, un libro con contraseña, un PDF… */
  it('lo que no se puede abrir se cuenta como tal', async () => {
    const lectura = await leerXlsx(new Blob(['esto no es un xlsx']));

    expect(lectura).toEqual({ ok: false, motivo: 'no-se-puede-leer' });
  });
});

describe('filasDeLaPrimeraHoja', () => {
  /**
   * La librería devuelve **las hojas**, también cuando se le pide una sola. Dar
   * eso por filas no fallaba con un error claro: daba «no se puede leer» para
   * cualquier fichero, bueno o malo.
   */
  it('entra en la hoja cuando llega una lista de hojas', () => {
    expect(filasDeLaPrimeraHoja([{ sheet: 'Hoja1', data: [['Nombre'], ['María']] }])).toEqual([
      ['Nombre'],
      ['María'],
    ]);
  });

  it('solo la primera: las demás son el reparto de mesas o una copia vieja', () => {
    const filas = filasDeLaPrimeraHoja([
      { sheet: 'Invitados', data: [['María']] },
      { sheet: 'Mesas', data: [['Mesa 1']] },
    ]);

    expect(filas).toEqual([['María']]);
  });

  it('si ya son filas, las deja', () => {
    expect(filasDeLaPrimeraHoja([['Nombre'], ['María']])).toEqual([['Nombre'], ['María']]);
  });

  it('con nada, nada', () => {
    expect(filasDeLaPrimeraHoja([])).toEqual([]);
    expect(filasDeLaPrimeraHoja(null)).toEqual([]);
    expect(filasDeLaPrimeraHoja({ raro: 1 })).toEqual([]);
  });
});

describe('CSV (D-55)', () => {
  it('reconoce el nombre del fichero', () => {
    expect(esCsv('invitados.csv')).toBe(true);
    expect(esCsv('Invitados.CSV')).toBe(true);
    expect(esCsv('invitados.csv.xlsx')).toBe(false);
  });

  it('lee un CSV de Excel en español: punto y coma, BOM y comillas', () => {
    const filas = parsearCsv(
      '﻿Nombre y apellidos;Teléfono;Notas\r\n"Pérez, Ana";600111222;"dice ""hola"""\r\nLeo;;\r\n',
    );
    expect(filas).toEqual([
      ['Nombre y apellidos', 'Teléfono', 'Notas'],
      ['Pérez, Ana', '600111222', 'dice "hola"'],
      ['Leo', '', ''],
    ]);
  });

  it('lee un CSV con comas y uno con tabuladores', () => {
    expect(parsearCsv('a,b\n1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
    expect(parsearCsv('a\tb\n1\t2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('una celda con salto de línea dentro de comillas sigue siendo una celda', () => {
    expect(parsearCsv('a;b\n"uno\ndos";3')).toEqual([
      ['a', 'b'],
      ['uno\ndos', '3'],
    ]);
  });

  it('quita las filas vacías del final y un fichero vacío no da filas', () => {
    expect(parsearCsv('a;b\n1;2\n;\n\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
    expect(parsearCsv('')).toEqual([]);
  });
});
