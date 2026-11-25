import { describe, expect, it } from 'vitest';

import { TIPOS_EDITABLES, mover, moverEntreVisibles } from './catalogo-secciones';
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
      'confirmar',
      'historia',
      'cronologia',
      'preguntas',
      'alojamientos',
      'autobuses',
      'dress-code',
      'cortejo',
      'quiz',
      'galeria',
      'regalos',
      'mapa',
      'playlist',
      'libro',
      'contacto',
    ]);
    expect(salida.map((s) => s.order)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
    ]);
  });

  it('sube una sección', () => {
    expect(mover(lista, 'cronologia', -1).map((s) => s.id)).toEqual([
      'portada',
      'historia',
      'cronologia',
      'confirmar',
      'preguntas',
      'alojamientos',
      'autobuses',
      'dress-code',
      'cortejo',
      'quiz',
      'galeria',
      'regalos',
      'mapa',
      'playlist',
      'libro',
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

describe('moverEntreVisibles', () => {
  const lista = SECCIONES_INICIALES.map((s) => ({ id: s.id, type: s.type, order: s.order }));
  // El plan básico no ve la historia: está entre la portada y el cartel de confirmar.
  const sinHistoria = (s: { type: string }) => s.type !== 'historia';

  it('sube una sección intercambiándola con su vecina visible, no con la oculta', () => {
    const salida = moverEntreVisibles(lista, sinHistoria, 'cronologia', -1);
    const ids = salida.map((s) => s.id);
    expect(ids.indexOf('cronologia')).toBeLessThan(ids.indexOf('confirmar'));
    // La oculta no se ha movido de su sitio relativo.
    expect(ids.indexOf('historia')).toBe(1);
  });

  it('la primera visible no sube por encima de la portada', () => {
    expect(moverEntreVisibles(lista, sinHistoria, 'confirmar', -1)).toEqual(lista);
  });

  it('salta las ocultas al bajar', () => {
    const ids = moverEntreVisibles(lista, (s) => s.type !== 'preguntas', 'cronologia', 1).map(
      (s) => s.id,
    );
    expect(ids.indexOf('alojamientos')).toBeLessThan(ids.indexOf('cronologia'));
  });

  it('renumera sin huecos', () => {
    const orden = moverEntreVisibles(lista, sinHistoria, 'cronologia', -1).map((s) => s.order);
    expect(orden).toEqual(orden.map((_, i) => i));
  });
});
