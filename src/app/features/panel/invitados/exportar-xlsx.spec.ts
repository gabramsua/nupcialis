import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { hojas } from './exportacion';
import { datosDeHoja } from './exportar-xlsx';
import { INVITADO_DE_PRUEBA } from './dobles.testing';
import { GRUPOS_DE_PRUEBA } from './dobles.testing';

/**
 * El fichero, escrito con la librería de verdad.
 *
 * Las otras pruebas comprueban **qué filas** salen; esta comprueba que con esas
 * filas se escribe un `.xlsx` que se abre. Es la mitad que no se ve: una celda
 * con el tipo mal puesto no rompe nada en las pruebas de datos y luego Excel
 * enseña un aviso verde en cada teléfono, o se come el `+34`.
 *
 * Se escribe con el punto de entrada de Node, no con el del navegador —es la
 * misma librería y el mismo formato—, y se mira dentro del ZIP.
 */

const ETIQUETAS = {
  estado: { confirmed: 'Confirmado', declined: 'No viene', pending: 'Sin contestar' },
  edad: { adult: 'Adulto', child: 'Niño', baby: 'Bebé' },
  lado: { A: 'De María', B: 'De Gabriel', both: 'De los dos' },
  si: 'Sí',
  no: 'No',
};

const ANA = {
  ...INVITADO_DE_PRUEBA,
  fullName: 'Ana Ruiz',
  phone: '+34600111222',
  rsvpStatus: 'confirmed' as const,
  menu: 'Vegano',
  allergies: 'Nueces',
  loginCount: 3,
};

describe('el .xlsx que se descarga', () => {
  it('se escribe con las dos hojas y se puede abrir', async () => {
    const { default: escribir } = await import('write-excel-file/node');

    const lista = hojas({ invitados: [ANA], grupos: GRUPOS_DE_PRUEBA, etiquetas: ETIQUETAS });
    const destino = join(mkdtempSync(join(tmpdir(), 'nupcialis-')), 'invitados.xlsx');

    await escribir(
      lista.map((hoja) => ({
        data: datosDeHoja(hoja),
        sheet: hoja.nombre,
        columns: hoja.columnas.map((c) => ({ width: c.ancho })),
        stickyRowsCount: 1,
      })) as never,
    ).toFile(destino);

    const bytes = readFileSync(destino);

    // Un .xlsx es un ZIP: empieza por PK.
    expect(bytes.subarray(0, 2).toString()).toBe('PK');
    expect(bytes.length).toBeGreaterThan(1000);

    // Y dentro están las dos hojas y lo que se ha escrito.
    const crudo = bytes.toString('latin1');
    expect(crudo).toContain('xl/worksheets/sheet1.xml');
    expect(crudo).toContain('xl/worksheets/sheet2.xml');
  });

  /**
   * El teléfono va como **texto**. Como número perdería el `+34` y el cero
   * inicial, y eso no se ve hasta que alguien llama.
   */
  it('el teléfono es texto y las veces que ha entrado, número', () => {
    const [invitados] = hojas({
      invitados: [ANA],
      grupos: GRUPOS_DE_PRUEBA,
      etiquetas: ETIQUETAS,
    });
    const filas = datosDeHoja(invitados!) as { value?: unknown; type?: unknown }[][];
    const fila = filas[1]!;

    const telefono = fila.find((c) => c?.value === '+34600111222');
    expect(telefono?.type).toBe(String);

    const entradas = fila.find((c) => c?.value === 3);
    expect(entradas?.type).toBe(Number);
  });

  it('la cabecera va en negrita, que es lo que la distingue al imprimir', () => {
    const [invitados] = hojas({
      invitados: [ANA],
      grupos: GRUPOS_DE_PRUEBA,
      etiquetas: ETIQUETAS,
    });
    const cabecera = datosDeHoja(invitados!)[0] as { fontWeight?: string }[];

    expect(cabecera.every((c) => c.fontWeight === 'bold')).toBe(true);
  });

  it('una celda vacía va vacía, no como la cadena vacía', () => {
    const [invitados] = hojas({
      invitados: [{ ...ANA, allergies: '', tableId: null }],
      grupos: GRUPOS_DE_PRUEBA,
      etiquetas: ETIQUETAS,
    });
    const fila = datosDeHoja(invitados!)[1]!;

    expect(fila).toContain(null);
  });
});
