import { describe, expect, it } from 'vitest';

import { TIPOS_EDITABLES, mover } from './catalogo-secciones';
import { CAMPOS_POR_TIPO, SECCIONES_INICIALES, TIPOS_SECCION } from './secciones';

describe('TIPOS_EDITABLES', () => {
  it('cubre todos los tipos que existen', () => {
    expect(Object.keys(TIPOS_EDITABLES).sort()).toEqual([...TIPOS_SECCION].sort());
  });

  it('ofrece exactamente los campos de la lista blanca', () => {
    // Si alguien añade un campo al modelo y no al editor, la pareja no podría
    // rellenarlo nunca. Y al revés, un campo que el editor ofrece y el saneado
    // tira se perdería al guardar sin decir nada.
    for (const tipo of TIPOS_SECCION) {
      const editables = TIPOS_EDITABLES[tipo].campos.map((c) => c.nombre).sort();
      expect(editables, tipo).toEqual(Object.keys(CAMPOS_POR_TIPO[tipo]).sort());
    }
  });

  it('hereda el máximo de cada campo en vez de repetirlo', () => {
    const titulo = TIPOS_EDITABLES.texto.campos.find((c) => c.nombre === 'titulo');
    expect(titulo?.maximo).toBe(CAMPOS_POR_TIPO.texto['titulo']);
  });
});

describe('mover', () => {
  const lista = SECCIONES_INICIALES.map((s) => ({ id: s.id, type: s.type, order: s.order }));

  it('baja una sección y renumera', () => {
    const salida = mover(lista, 'historia', 1);
    expect(salida.map((s) => s.id)).toEqual([
      'portada',
      'ceremonia',
      'historia',
      'banquete',
      'contacto',
    ]);
    expect(salida.map((s) => s.order)).toEqual([0, 1, 2, 3, 4]);
  });

  it('sube una sección', () => {
    expect(mover(lista, 'banquete', -1).map((s) => s.id)).toEqual([
      'portada',
      'historia',
      'banquete',
      'ceremonia',
      'contacto',
    ]);
  });

  it('nunca deja nada por encima de la portada', () => {
    expect(mover(lista, 'historia', -1)).toEqual(lista);
  });

  it('no mueve la portada', () => {
    expect(mover(lista, 'portada', 1)).toEqual(lista);
  });

  it('no se sale por los extremos ni con un id que no existe', () => {
    expect(mover(lista, 'contacto', 1)).toEqual(lista);
    expect(mover(lista, 'no-existe', 1)).toEqual(lista);
  });
});
