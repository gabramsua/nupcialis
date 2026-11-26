import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { HOME_DE_FABRICA, PLANTILLAS_HOME, type ContenidoHome } from './home';
import { NpHomePagina } from './home-pagina';

function pintar(contenido: ContenidoHome): HTMLElement {
  const fixture = TestBed.createComponent(NpHomePagina);
  fixture.componentRef.setInput('contenido', contenido);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('la página de la HOME', () => {
  for (const template of PLANTILLAS_HOME) {
    it(`${template}: pinta la portada y marca su plantilla`, () => {
      const raiz = pintar({ ...HOME_DE_FABRICA, template });

      expect(raiz.getAttribute('data-plantilla')).toBe(template);
      expect(raiz.querySelector('h1')?.textContent).toContain(HOME_DE_FABRICA.hero.title);
      expect(raiz.getAttribute('style')).toContain('--h-accent');
    });
  }

  it('es una sola página: sin menú de navegación', () => {
    const raiz = pintar(HOME_DE_FABRICA);

    expect(raiz.querySelector('nav')).toBeNull();
    expect(raiz.querySelector('[role=navigation]')).toBeNull();
  });

  it('enseña las capturas de los dos paneles', () => {
    const raiz = pintar(HOME_DE_FABRICA);
    const fuentes = [...raiz.querySelectorAll('img')].map((i) => i.getAttribute('src'));

    expect(fuentes).toContain('/home/panel-basico.webp');
    expect(fuentes).toContain('/home/panel-extendido.webp');
  });

  it('una sección apagada no se pinta', () => {
    const raiz = pintar({
      ...HOME_DE_FABRICA,
      pasos: { ...HOME_DE_FABRICA.pasos, enabled: false },
      paneles: { ...HOME_DE_FABRICA.paneles, enabled: false },
    });

    expect(raiz.querySelector('#como-funciona')).toBeNull();
    expect(raiz.querySelector('#paneles')).toBeNull();
  });

  it('los planes no se enseñan de fábrica: los precios no están decididos', () => {
    expect(pintar(HOME_DE_FABRICA).querySelector('#planes')).toBeNull();
    const con = pintar({
      ...HOME_DE_FABRICA,
      planes: { ...HOME_DE_FABRICA.planes, enabled: true },
    });
    expect(con.querySelector('#planes')).not.toBeNull();
  });

  it('el contenido es solo texto: un título con HTML no se interpreta', () => {
    const raiz = pintar({
      ...HOME_DE_FABRICA,
      hero: { ...HOME_DE_FABRICA.hero, title: '<img src=x onerror=alert(1)>Hola' },
    });

    expect(raiz.querySelector('h1 img')).toBeNull();
    expect(raiz.querySelector('h1')?.textContent).toContain('<img');
  });

  it('el cierre apagado no se pinta, pero el pie sí', () => {
    const raiz = pintar({
      ...HOME_DE_FABRICA,
      cierre: { ...HOME_DE_FABRICA.cierre, enabled: false },
    });

    expect(raiz.querySelector('#contacto')).toBeNull();
    expect(raiz.textContent).toContain(HOME_DE_FABRICA.pie.text);
  });
});
