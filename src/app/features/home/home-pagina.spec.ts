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

  it('enseña una galería de capturas por plan, empezando por la primera', () => {
    const raiz = pintar(HOME_DE_FABRICA);
    const galerias = raiz.querySelectorAll('#paneles np-home-galeria');
    const fuentes = [...galerias].map((g) => g.querySelector('img')?.getAttribute('src'));

    expect(galerias).toHaveLength(2);
    expect(fuentes).toEqual(['/home/galeria-basico-1.webp', '/home/galeria-extendido-1.webp']);
  });

  it('las flechas de la galería pasan de una captura a otra y dan la vuelta', () => {
    const raiz = pintar(HOME_DE_FABRICA);
    const galeria = raiz.querySelector('#paneles np-home-galeria') as HTMLElement;
    const fuente = () => galeria.querySelector('img')?.getAttribute('src');
    const sig = galeria.querySelector('[aria-label="Captura siguiente"]') as HTMLButtonElement;
    const ant = galeria.querySelector('[aria-label="Captura anterior"]') as HTMLButtonElement;

    sig.click();
    TestBed.tick();
    expect(fuente()).toBe('/home/galeria-basico-2.webp');
    expect(galeria.textContent).toContain('Cómo llegar');
    expect(galeria.textContent).toContain('2 / 3');

    ant.click();
    ant.click();
    TestBed.tick();
    expect(fuente()).toBe('/home/galeria-basico-3.webp');
  });

  it('una galería de una sola captura no lleva flechas, y sin capturas no hay galería', () => {
    const { basico, extendido } = HOME_DE_FABRICA.paneles;
    const raiz = pintar({
      ...HOME_DE_FABRICA,
      paneles: {
        ...HOME_DE_FABRICA.paneles,
        basico: { ...basico, shots: basico.shots.slice(0, 1) },
        extendido: { ...extendido, shots: [] },
      },
    });

    expect(raiz.querySelectorAll('#paneles np-home-galeria')).toHaveLength(1);
    expect(raiz.querySelector('#paneles [aria-label="Captura siguiente"]')).toBeNull();
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

  it('cada plan sale de fábrica con su cartel de precio, «pago único» y su botón', () => {
    const raiz = pintar(HOME_DE_FABRICA);
    const cifras = [...raiz.querySelectorAll('#paneles .hn__cifra')].map((p) => p.textContent);
    const notas = [...raiz.querySelectorAll('#paneles .hn__nota')].map((p) => p.textContent);
    const botones = [...raiz.querySelectorAll('#paneles .hn__compra a')].map((a) => ({
      texto: a.textContent?.trim(),
      destino: a.getAttribute('href'),
    }));

    expect(cifras).toEqual(['85 €', '250 €']);
    expect(notas).toEqual(['pago único', 'pago único']);
    expect(botones).toEqual([
      { texto: 'Quiero el básico', destino: '#contacto' },
      { texto: 'Quiero el extendido', destino: '#contacto' },
    ]);
  });

  it('un plan sin precio no enseña cartel; sin letra pequeña, solo la cifra', () => {
    const { basico, extendido } = HOME_DE_FABRICA.paneles;
    const raiz = pintar({
      ...HOME_DE_FABRICA,
      paneles: {
        ...HOME_DE_FABRICA.paneles,
        basico: { ...basico, price: '' },
        extendido: { ...extendido, priceNote: '' },
      },
    });
    const carteles = raiz.querySelectorAll('#paneles .hn__precio');
    expect(carteles).toHaveLength(1);
    expect(carteles[0]?.textContent?.trim()).toBe('250 €');
  });

  it('ya no hay una sección aparte de planes: el precio vive en los paneles', () => {
    const raiz = pintar(HOME_DE_FABRICA);
    expect(raiz.querySelector('#planes')).toBeNull();
    expect(raiz.textContent).not.toContain('Elegid vuestro plan');
    expect(raiz.querySelector('#paneles')?.textContent).toContain('Dos formas de vivirlo');
    expect(raiz.querySelector('#paneles')?.textContent).toContain(
      'Podéis empezar con el básico y pasar al extendido cuando lo necesitéis.',
    );
  });

  it('enseña el escaparate y el formulario de contacto, que es a donde apunta el botón principal', () => {
    const raiz = pintar(HOME_DE_FABRICA);
    expect(raiz.querySelector('#plantillas')).not.toBeNull();
    expect(raiz.querySelector('form')).not.toBeNull();
    expect(raiz.querySelector('#contacto')).not.toBeNull();
    expect(HOME_DE_FABRICA.hero.cta.url).toBe('#contacto');
  });

  it('el formulario apagado no se pinta', () => {
    const raiz = pintar({
      ...HOME_DE_FABRICA,
      contacto: { ...HOME_DE_FABRICA.contacto, enabled: false },
    });
    expect(raiz.querySelector('form')).toBeNull();
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

    expect(raiz.querySelector('#escribenos')).toBeNull();
    expect(raiz.textContent).toContain(HOME_DE_FABRICA.pie.text);
  });
});
