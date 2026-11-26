import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { PUERTA_AUTH } from '../../core/auth/auth-gateway';
import { SessionStore } from '../../core/auth/session.store';
import { provideIconSprite } from '../../design-system/icons/icon-sprite.providers';
import { menuDeModulos } from '../../features/panel/boda';
import { BodaStore } from '../../features/panel/boda.store';
import { BODA_DE_PRUEBA } from '../../features/panel/boda.testing';
import { PanelShell } from './panel-shell';

const ES = JSON.parse(readFileSync('public/i18n/es.json', 'utf8')) as Record<string, unknown>;

@Component({ template: '' })
class Vacia {}

async function montar(url = '/panel', conSenal = false) {
  const sesion = signal<{ email: string | null; rol: string }>({ email: 'a@b.c', rol: 'owner' });
  const boda = {
    ...BODA_DE_PRUEBA,
    modulos: {
      publicSite: { enabled: true, visibility: 'visible' as const },
      guests: { enabled: true, visibility: 'hidden' as const },
      checklist: { enabled: true, visibility: 'hidden' as const },
    },
  };

  TestBed.configureTestingModule({
    imports: [
      TranslocoTestingModule.forRoot({
        langs: { es: ES },
        translocoConfig: { availableLangs: ['es'], defaultLang: 'es' },
      }),
    ],
    providers: [
      provideIconSprite('panel'),
      provideRouter([
        { path: 'panel', component: Vacia },
        { path: 'panel/datos', component: Vacia },
        { path: 'panel/guests', component: Vacia },
        { path: 'panel/checklist', component: Vacia },
        { path: 'panel/acceso', component: Vacia },
      ]),
      { provide: PUERTA_AUTH, useValue: { salir: async () => undefined } },
      {
        provide: SessionStore,
        useValue: { sesion: () => sesion(), resuelta: () => true },
      },
      {
        provide: BodaStore,
        useValue: {
          boda: () => boda,
          menu: () => menuDeModulos(boda),
          sinPublicar: () => false,
          estado: () => 'listo',
          error: () => null,
          cargar: async () => undefined,
        },
      },
    ],
  });

  await TestBed.inject(Router).navigateByUrl(url);
  const fixture = TestBed.createComponent(PanelShell);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  void conSenal;
  return { fixture, sesion, raiz: fixture.nativeElement as HTMLElement };
}

describe('el menú del panel de la pareja', () => {
  it('«Vuestra web» sale una sola vez, con un solo ojo', async () => {
    const { raiz } = await montar();
    const enlaces = [...raiz.querySelectorAll('a.np-panel__enlace')];

    const web = enlaces.filter((a) => a.textContent?.includes('Vuestra web'));
    expect(web).toHaveLength(1);
    expect(raiz.querySelectorAll('nav use[href$="#eye"], nav use[href*="eye"]').length).toBe(1);
  });

  it('los módulos activos salen en el menú', async () => {
    const { raiz } = await montar();
    const texto = raiz.querySelector('nav')?.textContent ?? '';
    expect(texto).toContain('Invitados');
  });

  it('marca la pantalla abierta como la actual', async () => {
    const { raiz } = await montar('/panel/datos');
    const actuales = [...raiz.querySelectorAll('a[aria-current="page"]')];

    expect(actuales).toHaveLength(1);
    expect(actuales[0]?.getAttribute('href')).toBe('/panel/datos');
    expect(actuales[0]?.classList).toContain('np-panel__enlace--activo');
  });

  it('si la sesión se cierra con el panel abierto, lleva al acceso', async () => {
    const { fixture, sesion } = await montar('/panel/datos', true);
    sesion.set({ email: null, rol: 'anonimo' });
    fixture.detectChanges();
    await fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/panel/acceso');
  });
});
