import { describe, expect, it } from 'vitest';

import { PLANTILLAS, PLANTILLA_POR_DEFECTO, plantillaDe, urlDeFuentes } from './catalogo';

describe('catálogo de plantillas', () => {
  it('los ids no se repiten: son la clave de `theme.templateId`', () => {
    const ids = PLANTILLAS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('la plantilla por defecto existe de verdad', () => {
    expect(PLANTILLAS.some((p) => p.id === PLANTILLA_POR_DEFECTO)).toBe(true);
  });

  it('todas tienen nombre y descripción para el selector', () => {
    for (const plantilla of PLANTILLAS) {
      expect(plantilla.nombre, plantilla.id).not.toBe('');
      expect(plantilla.descripcion, plantilla.id).not.toBe('');
    }
  });
});

describe('plantillaDe', () => {
  it('devuelve la pedida', () => {
    expect(plantillaDe('botanica').id).toBe('botanica');
  });

  // Una boda puede guardar el id de una plantilla que se retiró del catálogo.
  // El invitado ya está delante con el enlace abierto: cae a la clásica, no a
  // una página en blanco.
  it('cae a la por defecto si la plantilla ya no existe', () => {
    expect(plantillaDe('la-de-2019').id).toBe(PLANTILLA_POR_DEFECTO);
  });

  it('y aguanta cualquier basura sin lanzar', () => {
    expect(plantillaDe(null).id).toBe(PLANTILLA_POR_DEFECTO);
    expect(plantillaDe(undefined).id).toBe(PLANTILLA_POR_DEFECTO);
    expect(plantillaDe(42).id).toBe(PLANTILLA_POR_DEFECTO);
  });
});

describe('urlDeFuentes', () => {
  it('pide solo las familias de esa plantilla', () => {
    const url = urlDeFuentes(plantillaDe('botanica'));
    expect(url).toContain('family=DM+Serif+Display');
    expect(url).toContain('family=Jost');
    // Las de la clásica no se descargan en una boda botánica.
    expect(url).not.toContain('Cormorant');
  });

  it('siempre con display=swap', () => {
    expect(urlDeFuentes(plantillaDe('clasica'))).toContain('display=swap');
  });

  it('una plantilla sin fuentes propias no pide nada', () => {
    expect(urlDeFuentes({ id: 'clasica', nombre: 'x', descripcion: 'y', fuentes: [] })).toBeNull();
  });
});
