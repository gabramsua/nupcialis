import { describe, expect, it } from 'vitest';

import { detectarSeparador, pareceLatin1, parsearTabla } from './tabla';

describe('detectarSeparador', () => {
  it('reconoce el punto y coma, que es lo que da Excel en español', () => {
    // El fallo clásico: un importador que solo entiende comas deja una única
    // columna con todo dentro y nadie sabe por qué.
    expect(detectarSeparador('Nombre;Teléfono;Email\nMaría;666;a@b.c')).toBe(';');
  });

  it('reconoce la coma', () => {
    expect(detectarSeparador('Nombre,Teléfono\nMaría,666')).toBe(',');
  });

  it('reconoce el tabulador, que es lo que se pega desde Excel', () => {
    expect(detectarSeparador('Nombre\tTeléfono\nMaría\t666')).toBe('\t');
  });

  it('mira la cabecera, no el fichero entero', () => {
    // Un campo de notas lleno de comas no puede decidir el separador.
    const texto = 'Nombre;Notas\nMaría;"viene en coche, con su madre, y llega tarde"';
    expect(detectarSeparador(texto)).toBe(';');
  });

  it('no se deja engañar por separadores entre comillas', () => {
    expect(detectarSeparador('"Apellidos, Nombre";Teléfono')).toBe(';');
  });
});

describe('parsearTabla', () => {
  it('separa filas y columnas', () => {
    expect(parsearTabla('Nombre;Teléfono\nMaría;666123456')).toEqual([
      ['Nombre', 'Teléfono'],
      ['María', '666123456'],
    ]);
  });

  it('respeta las comillas: un separador dentro es texto', () => {
    expect(parsearTabla('"Pérez, María";666123456')).toEqual([['Pérez, María', '666123456']]);
  });

  it('entiende la comilla escapada', () => {
    expect(parsearTabla('"Le dicen ""Pepito""";666')).toEqual([['Le dicen "Pepito"', '666']]);
  });

  it('admite saltos de línea dentro de una celda entrecomillada', () => {
    const filas = parsearTabla('Nombre;Notas\nMaría;"alérgica\nal marisco"');
    expect(filas[1]).toEqual(['María', 'alérgica\nal marisco']);
  });

  it('trata \\r\\n como un solo salto', () => {
    expect(parsearTabla('a;b\r\nc;d')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('se come el BOM que pone Excel', () => {
    // Sin esto la primera cabecera llega con el BOM pegado y no casa con nada.
    expect(parsearTabla('﻿Nombre;Teléfono')[0][0]).toBe('Nombre');
  });

  it('descarta las filas vacías', () => {
    expect(parsearTabla('a;b\n\n;\nc;d')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('recorta los espacios de cada celda', () => {
    expect(parsearTabla('  Nombre ;  Teléfono  ')).toEqual([['Nombre', 'Teléfono']]);
  });

  it('con las comillas mal cerradas devuelve lo entendido, sin lanzar', () => {
    // Un fichero a medias es más útil que un error: la previsualización deja
    // ver qué se ha roto y dónde.
    expect(() => parsearTabla('Nombre;"sin cerrar\nMaría;666')).not.toThrow();
    expect(parsearTabla('Nombre;"sin cerrar\nMaría;666').length).toBeGreaterThan(0);
  });

  it('con texto vacío devuelve una tabla vacía', () => {
    expect(parsearTabla('')).toEqual([]);
    expect(parsearTabla('\n\n  \n')).toEqual([]);
  });

  it('acepta un separador impuesto', () => {
    // Por si la detección se equivoca y la pareja lo corrige a mano.
    expect(parsearTabla('a,b;c', ';')).toEqual([['a,b', 'c']]);
  });
});

describe('pareceLatin1', () => {
  it('reconoce un CSV guardado en ANSI por Excel', () => {
    // «María» guardada en latin-1 y leída como UTF-8.
    expect(pareceLatin1('MarÃ­a PÃ©rez')).toBe(true);
  });

  it('no se inventa el problema con texto correcto', () => {
    expect(pareceLatin1('María Pérez, Begoña Agüero')).toBe(false);
    expect(pareceLatin1('')).toBe(false);
  });
});
