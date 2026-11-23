import { readFileSync } from 'node:fs';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PUERTA_AUTH } from '../../core/auth/auth-gateway';
import { provideIconSprite } from '../../design-system/icons/icon-sprite.providers';
import { SECCIONES_SUPERADMIN, SuperadminLayout } from './superadmin-layout';

const ES = JSON.parse(readFileSync('public/i18n/es.json', 'utf8')) as Record<string, unknown>;

function montar() {
  TestBed.configureTestingModule({
    imports: [
      TranslocoTestingModule.forRoot({
        langs: { es: ES },
        translocoConfig: { availableLangs: ['es'], defaultLang: 'es' },
      }),
    ],
    providers: [
      provideRouter([]),
      provideIconSprite('panel'),
      { provide: PUERTA_AUTH, useValue: { salir: async () => undefined } },
    ],
  });
  const fixture = TestBed.createComponent(SuperadminLayout);
  fixture.detectChanges();
  return { fixture, raiz: fixture.nativeElement as HTMLElement };
}

beforeEach(() => {
  try {
    localStorage.removeItem('np.superadmin.menuPlegado');
  } catch {
    // Sin almacenamiento no hay nada que limpiar.
  }
});
afterEach(() => vi.unstubAllGlobals());

describe('el menú lateral del superadmin', () => {
  it('enseña todas las secciones con su texto', () => {
    const { raiz } = montar();
    const enlaces = [...raiz.querySelectorAll('a.sl__enlace')].map((a) => a.textContent?.trim());

    expect(enlaces).toEqual([
      'Bodas',
      'Estadísticas',
      'Finanzas',
      'Recordatorios',
      'Catálogos',
      'Planes y módulos',
      'Correos',
      'Cola de correos',
      'Consejos',
    ]);
    expect(SECCIONES_SUPERADMIN).toHaveLength(9);
  });

  it('se pliega y se despliega, y lo dice a los lectores de pantalla', () => {
    const { fixture, raiz } = montar();
    const boton = raiz.querySelector<HTMLButtonElement>('.sl__boton')!;
    expect(boton.getAttribute('aria-expanded')).toBe('true');

    boton.click();
    fixture.detectChanges();

    expect(raiz.querySelector('.sl--plegado')).toBeTruthy();
    expect(boton.getAttribute('aria-expanded')).toBe('false');
    // Plegado, cada enlace conserva su nombre como `title` para el ratón.
    expect(raiz.querySelector('a.sl__enlace')?.getAttribute('title')).toBe('Bodas');
  });

  it('recuerda que estaba plegado', () => {
    montar().raiz.querySelector<HTMLButtonElement>('.sl__boton')!.click();
    TestBed.resetTestingModule();

    const { raiz } = montar();
    expect(raiz.querySelector('.sl--plegado')).toBeTruthy();
  });
});
