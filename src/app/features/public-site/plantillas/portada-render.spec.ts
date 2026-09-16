import { TranslocoTestingModule } from '@jsverse/transloco';
import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { provideIconSprite } from '../../../design-system/icons/icon-sprite.providers';
import { PlantillaBotanica } from './botanica/botanica';
import { PlantillaClasica } from './clasica/clasica';

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
          fields: { titulo: 'Nuestra historia', texto: 'Nos conocimos en Cádiz.' },
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
});
