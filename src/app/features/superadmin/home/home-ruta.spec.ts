import { describe, expect, it } from 'vitest';

import { HOME_DE_FABRICA } from '../../home/home';
import { cambiarLista, leerEn, moverEn, ponerEn, rutasDeImagenes } from './home-ruta';

describe('home-ruta', () => {
  it('lee por ruta con puntos, también dentro de listas', () => {
    expect(leerEn(HOME_DE_FABRICA, 'hero.cta.label')).toBe(HOME_DE_FABRICA.hero.cta.label);
    expect(leerEn(HOME_DE_FABRICA, 'promesa.items.1.title')).toBe(
      HOME_DE_FABRICA.promesa.items[1]!.title,
    );
    expect(leerEn(HOME_DE_FABRICA, 'no.existe')).toBeUndefined();
  });

  it('escribe sin tocar el original', () => {
    const antes = JSON.stringify(HOME_DE_FABRICA);
    const nuevo = ponerEn(HOME_DE_FABRICA, 'promesa.items.0.title', 'Otro');

    expect(nuevo.promesa.items[0]!.title).toBe('Otro');
    expect(nuevo.promesa.items[1]).toBe(HOME_DE_FABRICA.promesa.items[1]);
    expect(JSON.stringify(HOME_DE_FABRICA)).toBe(antes);
  });

  it('una ruta que no existe no inventa claves', () => {
    expect(ponerEn(HOME_DE_FABRICA, 'hero.nada.mas', 'x')).toBe(HOME_DE_FABRICA);
    expect(ponerEn(HOME_DE_FABRICA, 'promesa.items.99.title', 'x')).toBe(HOME_DE_FABRICA);
  });

  it('cambia listas y las reordena', () => {
    const sin = cambiarLista(HOME_DE_FABRICA, 'promesa.items', (l) => l.slice(1));
    expect(sin.promesa.items).toHaveLength(HOME_DE_FABRICA.promesa.items.length - 1);
    expect(cambiarLista(HOME_DE_FABRICA, 'hero.title', () => [])).toBe(HOME_DE_FABRICA);
    expect(moverEn(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
    expect(moverEn(['a', 'b'], 0, 5)).toEqual(['a', 'b']);
  });

  it('solo cuenta como de Storage las imágenes con ruta', () => {
    expect(rutasDeImagenes(HOME_DE_FABRICA).size).toBe(0);
    const con = ponerEn(HOME_DE_FABRICA, 'hero.image', {
      path: 'platform/home/1.jpg',
      url: 'https://firebasestorage.googleapis.com/x',
      alt: '',
    });
    expect([...rutasDeImagenes(con)]).toEqual(['platform/home/1.jpg']);
  });
});
