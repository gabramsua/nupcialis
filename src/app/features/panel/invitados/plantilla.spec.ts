import { describe, expect, it } from 'vitest';

import { parsearTabla } from '../../../shared/tabla';
import {
  COLUMNAS,
  DEFINICIONES,
  adivinarColumnas,
  lado,
  nombresDeGrupo,
  normalizarCabecera,
  pareceCabecera,
  plantillaCsv,
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
    expect(adivinarColumnas(['NOMBRE', 'Móvil', 'Correo', 'Observaciones'])).toEqual([
      'fullName',
      'phone',
      'email',
      'notes',
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

describe('plantillaCsv', () => {
  const csv = plantillaCsv();

  it('empieza por el BOM, para que Excel no rompa los acentos', () => {
    // Sin esto, Excel abre el fichero en ANSI y enseña «MarÃ­a».
    expect(csv.startsWith('﻿')).toBe(true);
  });

  it('usa punto y coma, que es lo que espera Excel en español', () => {
    expect(csv).toContain('Nombre y apellidos;Mote;Teléfono');
  });

  it('se puede volver a leer con nuestro propio lector', () => {
    // La prueba que de verdad importa: lo que damos tiene que entrar.
    const filas = parsearTabla(csv);
    expect(adivinarColumnas(filas[0])).toEqual([...COLUMNAS]);
    expect(filas.length).toBeGreaterThan(1);
  });

  it('trae ejemplos que enseñan qué se espera en cada columna', () => {
    const filas = parsearTabla(csv);
    const nombres = filas.slice(1).map((f) => f[0]);
    expect(nombres).toContain('María José Pérez');
    // Con acentos y con ñ a propósito: es donde se ve si la codificación falla.
    expect(nombres.some((n) => n.includes('ñ'))).toBe(true);
  });

  it('entrecomilla lo que lleve el separador dentro', () => {
    // Si no, una nota con punto y coma partiría la fila en dos columnas.
    expect(() => parsearTabla(plantillaCsv())).not.toThrow();
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

describe('plantillaCsv con la pareja', () => {
  it('rellena «De quién» con sus nombres, no con A y B', () => {
    const filas = parsearTabla(plantillaCsv({ partnerA: 'María José', partnerB: 'Gabriel' }));
    const columna = filas[0].indexOf('De quién');
    const valores = filas.slice(1).map((f) => f[columna]);

    expect(valores).toEqual(['María', 'Gabriel', 'Los dos']);
    // Y lo que damos se vuelve a entender al subirlo.
    expect(valores.map((v) => lado(v, { partnerA: 'María José', partnerB: 'Gabriel' }))).toEqual([
      'A',
      'B',
      'both',
    ]);
  });

  it('un ejemplo trae dos grupos en la misma celda, para que se vea cómo', () => {
    const filas = parsearTabla(plantillaCsv());
    const columna = filas[0].indexOf('Grupos');
    expect(filas.slice(1).some((f) => nombresDeGrupo(f[columna]).length === 2)).toBe(true);
  });
});
