import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import type { ResultadoTenant } from '../../../core/tenant/tenant-loader';
import { provideIconSprite } from '../../../design-system/icons/icon-sprite.providers';
import { DRESS_CODE_VACIO } from '../dress-code/dress-code';
import { historiaPublicada } from './historia-publicada';
import { NpHistoriaPublica } from './historia-publica';
import type { ApartadoPublicoDeHistoria } from './historia';

const ES = JSON.parse(readFileSync('public/i18n/es.json', 'utf8')) as Record<string, unknown>;
const FOTO = 'https://firebasestorage.googleapis.com/v0/b/x/o/a.jpg?alt=media';

function tenant(historia: readonly ApartadoPublicoDeHistoria[]): ResultadoTenant {
  return {
    tipo: 'ok',
    weddingId: 'w1',
    slug: 'maria-y-gabriel',
    sitio: {
      status: 'active',
      coupleNames: { partnerA: 'María', partnerB: 'Gabriel' },
      theme: { templateId: 'clasica', palette: null, heroImagePath: null, heroImageUrl: null },
      weddingDate: null,
      weddingTime: null,
      timezone: 'Europe/Madrid',
      locale: 'es',
      indexable: false,
      guestAccessMode: 'open',
      secciones: [],
      faqs: [],
      cronologia: [],
      alojamientos: [],
      autobuses: [],
      cortejo: [],
      ubicaciones: [],
      dressCode: DRESS_CODE_VACIO,
      historia,
      modulos: {},
      layout: 'onepage',
    },
  } as ResultadoTenant;
}

function montar(historia: readonly ApartadoPublicoDeHistoria[]) {
  TestBed.configureTestingModule({
    imports: [
      TranslocoTestingModule.forRoot({
        langs: { es: ES },
        translocoConfig: { availableLangs: ['es'], defaultLang: 'es' },
      }),
    ],
    providers: [provideRouter([]), provideIconSprite('public')],
  });
  const fixture = TestBed.createComponent(NpHistoriaPublica);
  fixture.componentRef.setInput('tenant', tenant(historia));
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

const apartado = (
  clave: ApartadoPublicoDeHistoria['clave'],
  html: string,
  fotos: readonly string[] = [],
): ApartadoPublicoDeHistoria => ({ clave, html, fotos: fotos.map((url) => ({ url })) });

describe('historiaPublicada (lo que llega de la proyección)', () => {
  it('sin lista, o vacía, no hay historia', () => {
    expect(historiaPublicada(undefined)).toEqual([]);
    expect(historiaPublicada([])).toEqual([]);
    expect(historiaPublicada('texto')).toEqual([]);
  });

  it('devuelve siempre los cinco apartados en orden y sin rutas', () => {
    const r = historiaPublicada([
      {
        clave: 'pedida',
        html: '<p>Sí</p>',
        fotos: [{ url: FOTO }, { url: 'https://malo.com/x.jpg' }],
      },
      { clave: 'beso', html: '<p>Lisboa</p>', fotos: [] },
    ]);
    expect(r.map((a) => a.clave)).toEqual(['conocemos', 'beso', 'recuerdo', 'viaje', 'pedida']);
    expect(r[4].fotos).toEqual([{ url: FOTO }]);
    expect(JSON.stringify(r)).not.toContain('path');
  });
});

describe('Nuestra historia, como la lee el invitado', () => {
  it('pinta solo los apartados con algo, con su título, su texto y sus fotos', () => {
    const el = montar([
      apartado('conocemos', ''),
      apartado('beso', '<p>Fue en <b>Lisboa</b></p>', [FOTO]),
      apartado('recuerdo', '<p><br></p>'),
      apartado('viaje', ''),
      apartado('pedida', '', [FOTO]),
    ]);

    const titulos = [...el.querySelectorAll('h2')].map((h) => h.textContent?.trim());
    expect(titulos).toEqual(['El primer beso', 'La pedida']);
    expect(el.querySelector('.hp__texto b')?.textContent).toBe('Lisboa');
    expect(el.querySelectorAll('img')).toHaveLength(2);
  });

  it('si no hay nada dice que aún se está escribiendo', () => {
    const el = montar([]);
    expect(el.textContent).toContain('Todavía estamos escribiendo');
    expect(el.querySelectorAll('section')).toHaveLength(0);
  });
});
