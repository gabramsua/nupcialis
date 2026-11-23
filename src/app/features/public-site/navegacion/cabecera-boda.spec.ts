import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { SesionInvitado } from '../../../core/firebase/sesion-invitado';
import type { ResultadoTenant } from '../../../core/tenant/tenant-loader';
import { provideIconSprite } from '../../../design-system/icons/icon-sprite.providers';
import { DRESS_CODE_VACIO } from '../dress-code/dress-code';
import type { Seccion, TipoSeccion } from '../secciones/secciones';
import { NpCabeceraBoda } from './cabecera-boda';

const ES = JSON.parse(readFileSync('public/i18n/es.json', 'utf8')) as Record<string, unknown>;

const seccion = (type: TipoSeccion, order: number, titulo = ''): Seccion => ({
  id: `${type}-${order}`,
  type,
  enabled: true,
  order,
  fields: titulo ? { titulo } : {},
});

function tenant(
  secciones: readonly Seccion[],
  modulos: Record<string, 'visible' | 'soon' | 'hidden'> = {},
  palette: ResultadoTenantPaleta = null,
): ResultadoTenant {
  return {
    tipo: 'ok',
    weddingId: 'w1',
    slug: 'juande-y-marina',
    sitio: {
      status: 'active',
      coupleNames: { partnerA: 'Juande', partnerB: 'Marina' },
      theme: { templateId: 'romantica', palette, heroImagePath: null, heroImageUrl: null },
      weddingDate: null,
      weddingTime: null,
      timezone: 'Europe/Madrid',
      locale: 'es',
      indexable: false,
      guestAccessMode: 'open',
      secciones,
      faqs: [],
      cronologia: [],
      alojamientos: [],
      ubicaciones: [],
      dressCode: DRESS_CODE_VACIO,
      historia: [],
      modulos,
      layout: 'multipage',
    },
  } as ResultadoTenant;
}

type ResultadoTenantPaleta = {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  accent: string;
} | null;

function montar(t: ResultadoTenant, identificado = true) {
  TestBed.configureTestingModule({
    imports: [
      TranslocoTestingModule.forRoot({
        langs: { es: ES },
        translocoConfig: { availableLangs: ['es'], defaultLang: 'es' },
      }),
    ],
    providers: [
      provideRouter([]),
      provideIconSprite('public'),
      { provide: SesionInvitado, useValue: { identificado: () => identificado } },
    ],
  });
  const fixture = TestBed.createComponent(NpCabeceraBoda);
  fixture.componentRef.setInput('tenant', t);
  fixture.detectChanges();
  return fixture;
}

const textos = (el: Element, selector: string) =>
  [...el.querySelectorAll(selector)].map((n) => n.textContent?.replace(/\s+/g, ' ').trim());

describe('la cabecera de la web de varias páginas', () => {
  const SECCIONES = [
    seccion('portada', 0),
    seccion('historia', 1),
    seccion('cronologia', 2),
    seccion('alojamientos', 3),
    seccion('quiz', 4),
    seccion('galeria', 5),
  ];

  it('pone el nombre de la pareja y los enlaces de lo que la pareja tiene encendido', () => {
    const el = montar(tenant(SECCIONES)).nativeElement as HTMLElement;

    expect(el.querySelector('.cb__marca')?.textContent).toContain('Juande y Marina');
    // 5 elementos caben en la barra: sin «Más».
    expect(textos(el, '.cb__nav .cb__enlace')).toEqual([
      'Inicio',
      'Historia',
      'Programa',
      'Alojamiento',
      'Quiz',
      'Galería',
    ]);
    expect(el.querySelector('.cb__boton-mas')).toBeNull();
  });

  it('lo que no cabe en la barra va tras «Más», con el candado en lo que pide identificarse', () => {
    const muchas = [
      ...SECCIONES,
      seccion('preguntas', 6),
      seccion('dressCode', 7),
      seccion('playlist', 8),
    ];
    const fixture = montar(tenant(muchas));
    const el = fixture.nativeElement as HTMLElement;

    expect(textos(el, '.cb__nav > .cb__enlace')).toEqual([
      'Inicio',
      'Historia',
      'Programa',
      'Alojamiento',
      'Preguntas',
    ]);
    const mas = el.querySelector<HTMLButtonElement>('.cb__boton-mas');
    expect(mas?.getAttribute('aria-expanded')).toBe('false');

    mas?.click();
    fixture.detectChanges();

    expect(mas?.getAttribute('aria-expanded')).toBe('true');
    expect(textos(el, '.cb__panel .cb__item')).toEqual([
      'Dress code',
      'Quiz',
      'Galería',
      'Playlist',
    ]);
    // Candado solo en las tres páginas que piden identidad.
    expect(el.querySelectorAll('.cb__panel svg[role="img"]').length).toBe(3);
  });

  it('el cajón del móvil agrupa «La boda» y «Participa»', () => {
    const fixture = montar(tenant(SECCIONES));
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('#cb-cajon')).toBeNull();

    el.querySelector<HTMLButtonElement>('.cb__burger')?.click();
    fixture.detectChanges();

    expect(textos(el, '.cb__cajon .cb__grupo')).toEqual(['La boda', 'Participa']);
    expect(textos(el, '.cb__cajon .cb__fila')).toEqual([
      'Inicio',
      'Historia',
      'Programa',
      'Alojamiento',
      'Quiz',
      'Galería',
    ]);
  });

  it('Escape cierra lo abierto', () => {
    const fixture = montar(tenant(SECCIONES));
    const el = fixture.nativeElement as HTMLElement;
    el.querySelector<HTMLButtonElement>('.cb__burger')?.click();
    fixture.detectChanges();
    expect(el.querySelector('#cb-cajon')).not.toBeNull();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(el.querySelector('#cb-cajon')).toBeNull();
  });

  it('el botón de confirmar sale con el módulo a la vista y el invitado identificado', () => {
    const conRsvp = tenant(SECCIONES, { rsvp: 'visible' });
    expect(
      (montar(conRsvp).nativeElement as HTMLElement).querySelector('.cb__confirmar'),
    ).not.toBeNull();

    TestBed.resetTestingModule();
    expect(
      (montar(conRsvp, false).nativeElement as HTMLElement).querySelector('.cb__confirmar'),
    ).toBeNull();

    TestBed.resetTestingModule();
    expect(
      (montar(tenant(SECCIONES)).nativeElement as HTMLElement).querySelector('.cb__confirmar'),
    ).toBeNull();
  });

  it('se pinta con los colores de la boda: la paleta manda sobre la plantilla', () => {
    const paleta = {
      primary: '#7a1f3a',
      secondary: '#a8546a',
      background: '#fdf3f1',
      surface: '#ffffff',
      text: '#33191f',
      accent: '#8a6420',
    };
    const el = montar(tenant(SECCIONES, {}, paleta)).nativeElement as HTMLElement;
    expect(el.style.getPropertyValue('--np-marca-background')).toBe('#fdf3f1');
    expect(el.style.getPropertyValue('--np-marca-primary')).toBe('#7a1f3a');
    // Y la letra es la de la plantilla elegida (Romántica).
    expect(el.style.getPropertyValue('--np-marca-titulos')).toContain('Great Vibes');
  });
});
