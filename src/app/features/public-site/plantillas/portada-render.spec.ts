import { TranslocoTestingModule } from '@jsverse/transloco';
import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { provideIconSprite } from '../../../design-system/icons/icon-sprite.providers';
import { PlantillaBotanica } from './botanica/botanica';
import { PlantillaClasica } from './clasica/clasica';
import { PlantillaModerna } from './moderna/moderna';
import { PlantillaRomantica } from './romantica/romantica';

/**
 * Regresión del 2026-09-16: la portada enseñaba los nombres y nada más.
 *
 * `DatePipe` lanzaba `NG0701: Missing locale data for the locale "es"` a mitad
 * de render, y la excepción se llevaba por delante todo lo que venía detrás de
 * la fecha: la fecha misma y la cuenta atrás. Las dos plantillas se prueban
 * porque las dos tenían el mismo fallo.
 */
const PLANTILLAS: readonly [string, Type<unknown>][] = [
  ['clásica', PlantillaClasica],
  ['botánica', PlantillaBotanica],
  ['romántica', PlantillaRomantica],
  ['moderna', PlantillaModerna],
];

describe.each(PLANTILLAS)('plantilla %s', (_nombre, Plantilla) => {
  it('pinta nombres, fecha y cuenta atrás', async () => {
    TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: {
            es: {
              publico: {
                nosCasamos: 'Nos casamos',
                pareja: '{{partnerA}} y {{partnerB}}',
                dias: 'días',
                horas: 'horas',
                minutos: 'minutos',
              },
            },
          },
          translocoConfig: { availableLangs: ['es'], defaultLang: 'es' },
        }),
      ],
      providers: [provideIconSprite('public')],
    });

    const fixture = TestBed.createComponent(Plantilla);
    const dentroDeUnAnio = new Date(Date.now() + 200 * 24 * 60 * 60 * 1000);
    fixture.componentRef.setInput('datos', {
      nombres: { partnerA: 'María', partnerB: 'Gabriel' },
      weddingDate: dentroDeUnAnio,
      weddingTime: '17:00',
      timezone: 'Europe/Madrid',
      locale: 'es',
      heroImageUrl: null,
      secciones: [
        { id: 'portada', type: 'portada', enabled: true, order: 0, fields: {} },
        {
          id: 'historia',
          type: 'texto',
          enabled: true,
          order: 1,
          fields: {
            titulo: 'Nuestra historia',
            texto: '<p>Nos conocimos en <strong>Cádiz</strong>.</p>',
          },
        },
        {
          id: 'apagada',
          type: 'texto',
          enabled: false,
          order: 2,
          fields: { titulo: 'No debería salir', texto: '' },
        },
      ],
    });
    fixture.detectChanges();

    const texto = fixture.nativeElement.textContent ?? '';
    expect(texto).toContain('María');
    expect(texto).toContain('Gabriel');
    // Lo que no se veía: la fecha y la cuenta atrás.
    expect(texto).toContain('días');
    expect(texto).toMatch(/\d{4}/);
    // Las secciones encendidas se pintan; las apagadas no llegan a la página.
    expect(texto).toContain('Nuestra historia');
    expect(texto).toContain('Nos conocimos en Cádiz.');
    expect(texto).not.toContain('No debería salir');
  });

  /**
   * El texto enriquecido se pinta **como HTML**, no como texto escapado.
   *
   * Llega ya saneado del servidor (regla de oro 5) y Angular lo vuelve a
   * sanear al pintarlo. Si esto se rompiera, la pareja vería sus etiquetas
   * escritas en medio de la web.
   */
  it('pinta el texto enriquecido con su formato', async () => {
    TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { es: {} },
          translocoConfig: { availableLangs: ['es'], defaultLang: 'es' },
        }),
      ],
      providers: [provideIconSprite('public')],
    });

    const fixture = TestBed.createComponent(Plantilla);
    fixture.componentRef.setInput('datos', {
      nombres: { partnerA: 'María', partnerB: 'Gabriel' },
      weddingDate: null,
      weddingTime: null,
      timezone: 'Europe/Madrid',
      locale: 'es',
      heroImageUrl: null,
      secciones: [
        {
          id: 'historia',
          type: 'texto',
          enabled: true,
          order: 1,
          fields: {
            titulo: 'Nuestra historia',
            texto: '<p>Nos conocimos en <strong>Cádiz</strong>.</p><ul><li>2019</li></ul>',
          },
        },
      ],
    });
    fixture.detectChanges();

    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.querySelector('.np-rico strong')?.textContent).toBe('Cádiz');
    expect(raiz.querySelectorAll('.np-rico li')).toHaveLength(1);
    expect(raiz.textContent).not.toContain('<strong>');
  });

  /**
   * Una boda recién creada, que es el primer estado de todas.
   *
   * Sin nombres, la clásica dibujaba un «&» suelto en mitad de la pantalla y
   * la botánica una «y» sola: parece una web rota, no una boda a medio
   * montar. Se vio en la página de muestra de desarrollo.
   */
  it('sin nombres no pinta un título a medias', async () => {
    TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { es: { publico: { pareja: '{{partnerA}} y {{partnerB}}' } } },
          translocoConfig: { availableLangs: ['es'], defaultLang: 'es' },
        }),
      ],
      providers: [provideIconSprite('public')],
    });

    const fixture = TestBed.createComponent(Plantilla);
    fixture.componentRef.setInput('datos', {
      nombres: { partnerA: '', partnerB: '' },
      weddingDate: null,
      weddingTime: null,
      timezone: 'Europe/Madrid',
      locale: 'es',
      heroImageUrl: null,
      secciones: [],
    });
    fixture.detectChanges();

    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.querySelector('h1')).toBeNull();
    expect((raiz.textContent ?? '').trim()).not.toMatch(/(^|\s)[y&](\s|$)/);
  });

  /** Con un solo nombre puesto, se escribe ese y no la conjunción. */
  it('con un nombre solo, lo escribe sin conjunción', async () => {
    TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { es: { publico: { pareja: '{{partnerA}} y {{partnerB}}' } } },
          translocoConfig: { availableLangs: ['es'], defaultLang: 'es' },
        }),
      ],
      providers: [provideIconSprite('public')],
    });

    const fixture = TestBed.createComponent(Plantilla);
    fixture.componentRef.setInput('datos', {
      nombres: { partnerA: 'María', partnerB: '' },
      weddingDate: null,
      weddingTime: null,
      timezone: 'Europe/Madrid',
      locale: 'es',
      heroImageUrl: null,
      secciones: [],
    });
    fixture.detectChanges();

    const h1 = (fixture.nativeElement as HTMLElement).querySelector('h1');
    expect(h1?.textContent?.trim()).toBe('María');
  });
});
