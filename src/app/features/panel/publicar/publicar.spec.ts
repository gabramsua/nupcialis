import { describe, expect, it } from 'vitest';

import { BODA_DE_PRUEBA } from '../boda.testing';
import { faltaParaPublicar } from './publicar';

describe('lo que falta para publicar', () => {
  it('con todo lo necesario no falta nada', () => {
    expect(faltaParaPublicar(BODA_DE_PRUEBA)).toEqual([]);
  });

  it('pide los dos nombres, la fecha y la dirección', () => {
    const vacia = {
      ...BODA_DE_PRUEBA,
      pareja: { partnerA: 'María', partnerB: '  ' },
      weddingDate: null,
      slug: '',
    };
    expect(faltaParaPublicar(vacia)).toEqual(['nombres', 'fecha', 'direccion']);
  });
});
