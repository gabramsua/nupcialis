import { readFileSync } from 'node:fs';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { describe, expect, it } from 'vitest';

import { provideIconSprite } from '../../../design-system/icons/icon-sprite.providers';
import { Consejo } from './consejo';
import { ConsejosDelPanel } from './consejos-panel';

const ES = JSON.parse(readFileSync('public/i18n/es.json', 'utf8')) as Record<string, unknown>;

function montar(modulo: string | null, consejos?: Record<string, string>) {
  TestBed.configureTestingModule({
    imports: [
      TranslocoTestingModule.forRoot({
        langs: { es: ES },
        translocoConfig: { availableLangs: ['es'], defaultLang: 'es' },
      }),
    ],
    providers: [
      provideIconSprite('panel'),
      ...(consejos
        ? [{ provide: ConsejosDelPanel, useValue: { consejos: signal(consejos) } }]
        : []),
    ],
  });
  const fixture = TestBed.createComponent(Consejo);
  fixture.componentRef.setInput('modulo', modulo);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('el consejo de cada módulo', () => {
  it('sale como un desplegable cerrado, con un párrafo por bloque', () => {
    const raiz = montar('rsvp', { rsvp: 'Primero.\n\nSegundo.' });
    const detalles = raiz.querySelector('details')!;

    expect(detalles.open).toBe(false);
    expect(raiz.querySelector('summary')?.textContent).toContain('Consejo');
    expect([...raiz.querySelectorAll('p')].map((p) => p.textContent)).toEqual([
      'Primero.',
      'Segundo.',
    ]);
  });

  it('no pinta nada si el módulo no tiene consejo', () => {
    expect(montar('rsvp', { guests: 'Otro' }).querySelector('details')).toBeNull();
  });

  it('no pinta nada en una pantalla que no es de un módulo', () => {
    expect(montar(null, { rsvp: 'Algo' }).querySelector('details')).toBeNull();
  });

  it('el texto va como texto, nunca como HTML', () => {
    const raiz = montar('rsvp', { rsvp: '<img src=x onerror=alert(1)>' });
    expect(raiz.querySelector('img')).toBeNull();
    expect(raiz.textContent).toContain('<img src=x');
  });

  it('sin el servicio (una pantalla probada sola) no rompe', () => {
    expect(montar('rsvp').querySelector('details')).toBeNull();
  });
});
