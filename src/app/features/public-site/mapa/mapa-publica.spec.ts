import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { provideIconSprite } from '../../../design-system/icons/icon-sprite.providers';
import type { ResultadoTenant } from '../../../core/tenant/tenant-loader';
import { DRESS_CODE_VACIO } from '../dress-code/dress-code';
import { NpMapaPublica } from './mapa-publica';
import { sanearUbicaciones, type UbicacionPublica } from './ubicaciones';

/**
 * El mapa, como lo abre el invitado.
 *
 * El mapa de Leaflet no se prueba aquí —necesita un navegador de verdad y se
 * mira a mano a 360 px—. Lo que sí: que **la lista funcione sola**, porque es
 * lo que queda cuando en la finca no hay cobertura y el mapa no carga, y que
 * los botones lleven a la aplicación de mapas con el pin correcto.
 */

const ES = JSON.parse(readFileSync('public/i18n/es.json', 'utf8')) as Record<string, unknown>;

function tenant(ubicaciones: readonly UbicacionPublica[]): ResultadoTenant {
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
      ubicaciones,
      dressCode: DRESS_CODE_VACIO,
      historia: [],
      modulos: {},
    },
  };
}

async function montar(resultado: ResultadoTenant) {
  TestBed.configureTestingModule({
    imports: [
      TranslocoTestingModule.forRoot({
        langs: { es: ES },
        translocoConfig: { availableLangs: ['es'], defaultLang: 'es' },
      }),
    ],
    providers: [provideRouter([]), provideIconSprite('public')],
  });

  const fixture = TestBed.createComponent(NpMapaPublica);
  fixture.componentRef.setInput('tenant', resultado);
  fixture.detectChanges();
  await new Promise((listo) => setTimeout(listo, 0));
  fixture.detectChanges();

  return fixture.nativeElement as HTMLElement;
}

const SITIOS = sanearUbicaciones([
  {
    id: 'ceremonia',
    type: 'ceremonia',
    name: 'Iglesia de San Miguel',
    address: 'Plaza de la Iglesia, 1',
    coords: { lat: 40.9481, lng: -4.1184 },
    description: 'Aparcad abajo.',
    time: '17:30',
    order: 1,
  },
  {
    id: 'banquete',
    type: 'banquete',
    name: 'Finca El Encinar',
    address: '',
    coords: { lat: 40.9302, lng: -4.0951 },
    description: '',
    time: null,
    order: 2,
  },
]);

describe('el mapa público', () => {
  it('lista cada sitio con su tipo, su hora y su dirección, sin depender del mapa', async () => {
    const raiz = await montar(tenant(SITIOS));
    const fichas = [...raiz.querySelectorAll('.mp__sitio')];

    expect(fichas.map((f) => f.querySelector('strong')?.textContent?.trim())).toEqual([
      'Iglesia de San Miguel',
      'Finca El Encinar',
    ]);
    expect(fichas[0]?.textContent).toContain('Ceremonia');
    expect(fichas[0]?.textContent).toContain('17:30');
    expect(fichas[0]?.textContent).toContain('Plaza de la Iglesia, 1');
    expect(fichas[0]?.textContent).toContain('Aparcad abajo.');
  });

  /** Es el botón que de verdad guía por la carretera. */
  it('«Cómo llegar» y «Abrir» llevan al pin de ese sitio', async () => {
    const raiz = await montar(tenant(SITIOS));
    const enlaces = [...raiz.querySelectorAll('.mp__sitio')[0]!.querySelectorAll('a')].map((a) =>
      a.getAttribute('href'),
    );

    expect(enlaces).toEqual([
      'https://www.google.com/maps/dir/?api=1&destination=40.9481,-4.1184',
      'https://www.google.com/maps/search/?api=1&query=40.9481,-4.1184',
    ]);
    for (const a of raiz.querySelectorAll('.mp__sitio a')) {
      expect(a.getAttribute('rel')).toContain('noopener');
    }
  });

  it('el color nunca va solo: cada sitio lleva su tipo escrito', async () => {
    const raiz = await montar(tenant(SITIOS));

    expect(raiz.querySelectorAll('.mp__sitio')[1]?.textContent).toContain('Banquete');
    expect(raiz.querySelectorAll('.mp__icono svg').length).toBe(2);
  });

  it('sin sitios no pinta un mapa vacío: dice que todavía no hay', async () => {
    const raiz = await montar(tenant([]));

    expect(raiz.querySelector('.mp__mapa')).toBeNull();
    expect(raiz.querySelector('.mp__nada')?.textContent).toContain('Todavía no');
  });

  it('una boda que no existe no enseña sitios', async () => {
    const raiz = await montar({ tipo: 'no-encontrada' });

    expect(raiz.querySelectorAll('.mp__sitio').length).toBe(0);
  });
});
