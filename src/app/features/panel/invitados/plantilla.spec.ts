import { describe, expect, it } from 'vitest';

import {
  COLUMNAS,
  DEFINICIONES,
  adivinarColumnas,
  lado,
  nombresDeGrupo,
  normalizarCabecera,
  pareceCabecera,
  hojaDePlantilla,
} from './plantilla';

describe('normalizarCabecera', () => {
  it('quita acentos, mayúsculas y puntuación', () => {
    expect(normalizarCabecera('  Teléfono / Móvil ')).toBe('telefono movil');
    expect(normalizarCabecera('E-mail')).toBe('e mail');
  });
});

describe('adivinarColumnas', () => {
  it('reconoce las cabeceras de nuestra plantilla sin un solo clic', () => {
    const cabeceras = DEFINICIONES.map((d) => d.etiqueta);
    expect(adivinarColumnas(cabeceras)).toEqual([...COLUMNAS]);
  });

  it('reconoce cómo llama la gente a las columnas en sus propias hojas', () => {
    expect(adivinarColumnas(['NOMBRE', 'Móvil', 'Observaciones'])).toEqual([
      'fullName',
      'phone',
      'notes',
    ]);
  });

  /** No guardamos el correo de los invitados para nada: una columna así se ignora. */
  it('no reconoce una columna de correo', () => {
    expect(adivinarColumnas(['Nombre', 'Email', 'Correo electrónico'])).toEqual([
      'fullName',
      null,
      null,
    ]);
  });

  it('deja sin asignar lo que no reconoce, en vez de adivinar', () => {
    expect(adivinarColumnas(['Nombre', 'Regalo previsto', 'Mesa'])).toEqual([
      'fullName',
      null,
      null,
    ]);
  });

  it('no asigna la misma columna dos veces', () => {
    // Una hoja con «Teléfono» y «Teléfono 2»: la segunda se queda sin asignar
    // y decide la pareja. Asignarla en silencio pisaría el primer número.
    expect(adivinarColumnas(['Teléfono', 'Telefono'])).toEqual(['phone', null]);
  });

  it('ignora las columnas sin cabecera', () => {
    expect(adivinarColumnas(['Nombre', '', '   '])).toEqual(['fullName', null, null]);
  });
});

describe('pareceCabecera', () => {
  it('reconoce una fila de cabeceras', () => {
    expect(pareceCabecera(['Nombre y apellidos', 'Teléfono'])).toBe(true);
  });

  it('no confunde un invitado con una cabecera', () => {
    // Si se tragara la primera fila como cabecera, la pareja perdería un
    // invitado sin enterarse.
    expect(pareceCabecera(['María José Pérez', '666123456'])).toBe(false);
  });
});

/** La plantilla como la ve quien la abre: cabeceras y filas de texto. */
function tabla(pareja?: { partnerA: string; partnerB: string }): string[][] {
  const hoja = hojaDePlantilla(pareja);
  return [
    hoja.columnas.map((c) => c.titulo),
    ...hoja.filas.map((fila) => fila.map((celda) => String(celda ?? ''))),
  ];
}

describe('hojaDePlantilla', () => {
  it('se puede volver a leer con nuestro propio reconocimiento', () => {
    // La prueba que de verdad importa: lo que damos tiene que entrar solo.
    const filas = tabla();
    expect(adivinarColumnas(filas[0])).toEqual([...COLUMNAS]);
    expect(filas.length).toBeGreaterThan(1);
  });

  it('ya no trae columna de acompañantes: el cupo se quitó (D-51)', () => {
    expect(tabla()[0]).not.toContain('Acompañantes');
    expect(COLUMNAS).not.toContain('maxCompanions' as never);
  });

  it('cada fila tiene tantas celdas como columnas', () => {
    const filas = tabla();
    for (const fila of filas) expect(fila).toHaveLength(filas[0].length);
  });

  it('trae ejemplos que enseñan qué se espera en cada columna', () => {
    const nombres = tabla()
      .slice(1)
      .map((f) => f[0]);
    expect(nombres).toContain('María José Pérez');
    // Con acentos y con ñ a propósito: es donde se ve si la codificación falla.
    expect(nombres.some((n) => n.includes('ñ'))).toBe(true);
  });

  it('el teléfono de ejemplo es texto y no lleva +34', () => {
    const filas = tabla();
    const columna = filas[0].indexOf('Teléfono');
    expect(filas.slice(1).some((f) => /^[6789]\d{8}$/.test(f[columna]))).toBe(true);
  });
});

describe('lado', () => {
  const PAREJA = { partnerA: 'María José', partnerB: 'Gabriel Ramos' };

  it('entiende el nombre de cada uno, entero o solo el primero, con o sin tildes', () => {
    expect(lado('María José', PAREJA)).toBe('A');
    expect(lado('maria', PAREJA)).toBe('A');
    expect(lado('De Gabriel', PAREJA)).toBe('B');
  });

  it('entiende A y B, por si la hoja ya venía así', () => {
    expect(lado('a', PAREJA)).toBe('A');
    expect(lado('B', PAREJA)).toBe('B');
  });

  it('entiende las formas habituales de «los dos»', () => {
    for (const valor of ['Ambos', 'los dos', 'Común', 'de los dos']) {
      expect(lado(valor, PAREJA)).toBe('both');
    }
  });

  it('lo que no entiende es de los dos, que es lo que menos decide', () => {
    expect(lado('Pepe', PAREJA)).toBe('both');
  });

  it('una celda vacía no dice nada, y el servidor pone su defecto', () => {
    expect(lado('  ', PAREJA)).toBeUndefined();
  });
});

describe('nombresDeGrupo', () => {
  it('separa por comas y quita espacios y repetidos', () => {
    expect(nombresDeGrupo(' Universidad ,  Pádel,Universidad, ')).toEqual(['Universidad', 'Pádel']);
  });

  it('no parte por «y»: «Amigos y vecinos» es un grupo', () => {
    expect(nombresDeGrupo('Amigos y vecinos')).toEqual(['Amigos y vecinos']);
  });
});

describe('hojaDePlantilla con la pareja', () => {
  it('rellena «De quién» con sus nombres, no con A y B', () => {
    const pareja = { partnerA: 'María José', partnerB: 'Gabriel' };
    const filas = tabla(pareja);
    const columna = filas[0].indexOf('De quién');
    const valores = filas.slice(1).map((f) => f[columna]);

    expect(valores).toEqual(['María', 'Gabriel', 'Los dos']);
    // Y lo que damos se vuelve a entender al subirlo.
    expect(valores.map((v) => lado(v, pareja))).toEqual(['A', 'B', 'both']);
  });

  it('un ejemplo trae dos grupos en la misma celda, para que se vea cómo', () => {
    const filas = tabla();
    const columna = filas[0].indexOf('Grupos');
    expect(filas.slice(1).some((f) => nombresDeGrupo(f[columna]).length === 2)).toBe(true);
  });
});
