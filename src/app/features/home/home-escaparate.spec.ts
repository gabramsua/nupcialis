import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { PALETAS } from '../public-site/paletas/paletas';
import { PLANTILLAS } from '../public-site/plantillas/catalogo';
import { HOME_DE_FABRICA, type EscaparateHome } from './home';
import { NpHomePagina } from './home-pagina';

function pintar(escaparate: Partial<EscaparateHome> | EscaparateHome): HTMLElement {
  const fixture = TestBed.createComponent(NpHomePagina);
  fixture.componentRef.setInput('contenido', {
    ...HOME_DE_FABRICA,
    escaparate: { ...HOME_DE_FABRICA.escaparate, ...escaparate },
  });
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('el escaparate de plantillas', () => {
  it('de fábrica enseña el mosaico, el diseño y el carrusel con las ocho capturas, cada una con su etiqueta', () => {
    const raiz = pintar({});
    expect(raiz.querySelector('.he__mosaico img')?.getAttribute('src')).toBe('/home/mosaico.webp');
    const diapos = [...raiz.querySelectorAll('.he__diapo')];
    expect(diapos).toHaveLength(8);
    expect(diapos[1]?.textContent).toContain('Botánica · Salvia');
    expect(raiz.querySelectorAll('.he__diapo img[alt=""]')).toHaveLength(0);
  });

  it('el mosaico se apaga solo, y el carrusel se queda', () => {
    const raiz = pintar({
      mosaic: { ...HOME_DE_FABRICA.escaparate.mosaic, enabled: false },
    });
    expect(raiz.querySelector('.he__mosaico')).toBeNull();
    expect(raiz.querySelector('.he__carrusel')).not.toBeNull();
  });

  it('el carrusel se apaga solo, y el mosaico se queda', () => {
    const raiz = pintar({
      carousel: { ...HOME_DE_FABRICA.escaparate.carousel, enabled: false },
    });
    expect(raiz.querySelector('.he__carrusel')).toBeNull();
    expect(raiz.querySelector('.he__mosaico')).not.toBeNull();
  });

  it('de fábrica el mosaico es solo de escritorio y el carrusel y el diseño salen en todas partes', () => {
    const raiz = pintar({});
    expect(raiz.querySelector('.he__mosaico')?.classList.contains('he--escritorio')).toBe(true);
    expect(raiz.querySelector('.he__carrusel')?.classList.contains('he--todos')).toBe(true);
    expect(raiz.querySelector('.he__diseno')?.classList.contains('he--todos')).toBe(true);
  });

  it('el carrusel se puede dejar solo para móvil o solo para escritorio', () => {
    for (const show of ['movil', 'escritorio'] as const) {
      const raiz = pintar({ carousel: { ...HOME_DE_FABRICA.escaparate.carousel, show } });
      expect(raiz.querySelector('.he__carrusel')?.classList.contains(`he--${show}`)).toBe(true);
    }
  });

  it('la captura de «Diseño» va debajo del mosaico, con su pie, y se apaga sola', () => {
    const raiz = pintar({});
    const mosaico = raiz.querySelector('.he__mosaico') as HTMLElement;
    const diseno = raiz.querySelector('.he__diseno') as HTMLElement;
    expect(diseno.querySelector('img')?.getAttribute('src')).toBe('/home/diseno.webp');
    expect(diseno.querySelector('img')?.getAttribute('alt')).toContain('plantillas');
    expect(diseno.querySelector('figcaption')?.textContent).toContain('plantilla y colores');
    expect(mosaico.compareDocumentPosition(diseno) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    const apagada = pintar({ design: { ...HOME_DE_FABRICA.escaparate.design, enabled: false } });
    expect(apagada.querySelector('.he__diseno')).toBeNull();
    expect(apagada.querySelector('.he__mosaico')).not.toBeNull();
  });

  it('sin imagen de mosaico, de diseño o sin capturas, esa pieza no se pinta aunque esté encendida', () => {
    const e = HOME_DE_FABRICA.escaparate;
    const raiz = pintar({
      mosaic: { ...e.mosaic, enabled: true, image: null },
      design: { ...e.design, enabled: true, image: null },
      carousel: { ...e.carousel, enabled: true, slides: [] },
    });
    expect(raiz.querySelector('.he__mosaico')).toBeNull();
    expect(raiz.querySelector('.he__diseno')).toBeNull();
    expect(raiz.querySelector('.he__carrusel')).toBeNull();
  });

  it('el escaparate entero se apaga', () => {
    const raiz = pintar({ enabled: false });
    expect(raiz.querySelector('#plantillas')).toBeNull();
  });

  it('las flechas desplazan el carrusel una captura', () => {
    const fixture = TestBed.createComponent(NpHomePagina);
    fixture.componentRef.setInput('contenido', HOME_DE_FABRICA);
    fixture.detectChanges();
    const raiz = fixture.nativeElement as HTMLElement;
    const pista = raiz.querySelector('.he__pista') as HTMLElement;
    let pedido: ScrollToOptions | null = null;
    pista.scrollBy = ((opciones: ScrollToOptions) => {
      pedido = opciones;
    }) as typeof pista.scrollBy;

    (raiz.querySelector('.he__flecha--sig') as HTMLButtonElement).click();
    expect(pedido!.left).toBeGreaterThan(0);
    (raiz.querySelector('.he__flecha--ant') as HTMLButtonElement).click();
    expect(pedido!.left).toBeLessThan(0);
  });

  it('las flechas tienen nombre accesible', () => {
    const raiz = pintar({});
    expect(raiz.querySelector('.he__flecha--sig')?.getAttribute('aria-label')).toBe(
      'Plantilla siguiente',
    );
    expect(raiz.querySelector('.he__flecha--ant')?.getAttribute('aria-label')).toBe(
      'Plantilla anterior',
    );
  });

  it('las imágenes de plantillas y paletas están al día con el catálogo', () => {
    // `public/home/diseno.webp` (8 plantillas y 18 paletas), `mosaico.webp` y las
    // capturas del carrusel se fotografían, no se dibujan: si esto falla, se ha
    // añadido o quitado una plantilla o una paleta. Hay que regenerarlas con
    // `tools/capturas-escaparate.cjs` y `tools/componer-escaparate.py`, añadir su
    // captura al carrusel y retocar la introducción y el texto alternativo.
    const e = HOME_DE_FABRICA.escaparate;
    expect(PLANTILLAS).toHaveLength(8);
    expect(PALETAS).toHaveLength(18);
    expect(e.carousel.slides).toHaveLength(PLANTILLAS.length);
    expect(e.intro).toContain('Ocho plantillas y dieciocho paletas');
    expect(e.design.image?.alt).toContain('ocho plantillas');
    expect(e.design.image?.alt).toContain('dieciocho paletas');
  });
});
