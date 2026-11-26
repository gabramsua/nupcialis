import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PUERTA_ALTA } from '../core/alta/alta-gateway';
import { PUERTA_AUTH, type PuertaAuth } from '../core/auth/auth-gateway';
import { SessionStore } from '../core/auth/session.store';
import { FIRESTORE } from '../core/firebase/firestore.providers';
import { provideIconSprite } from '../design-system/icons/icon-sprite.providers';
import { BodaStore } from '../features/panel/boda.store';
import { AdminShell } from './admin-shell/admin-shell';
import { SuperadminLayout } from './superadmin-layout/superadmin-layout';
import { PanelShell } from './panel-shell/panel-shell';

/**
 * Cerrar sesión, en los dos paneles.
 *
 * Lo que se vigila: que el botón **existe y se ve con su nombre**, que cierra la
 * sesión en Firebase y que después se sale a la pantalla de acceso del panel que
 * toca —el de la pareja y el del superadmin no comparten puerta—.
 */

const ES = JSON.parse(readFileSync('public/i18n/es.json', 'utf8')) as Record<string, unknown>;

function puertaAuth(salidas: string[]): PuertaAuth {
  return {
    observar: (alCambiar) => {
      alCambiar({ rol: 'owner', weddingId: 'w1', uid: 'u', email: 'a@b.c' } as never);
      return () => undefined;
    },
    entrarConEmail: async () => undefined,
    entrarConGoogle: async () => undefined,
    enviarRecuperacion: async () => undefined,
    refrescarClaims: async () => undefined,
    salir: async () => {
      salidas.push('salir');
    },
  };
}

function configurar(salidas: string[], extra: unknown[] = []) {
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
      { provide: PUERTA_AUTH, useValue: puertaAuth(salidas) },
      { provide: FIRESTORE, useValue: {} },
      { provide: PUERTA_ALTA, useValue: {} },
      ...(extra as never[]),
    ],
  });
}

function botonSalir(raiz: HTMLElement) {
  return [...raiz.querySelectorAll('button')].find((b) => b.textContent?.includes('Cerrar sesión'));
}

afterEach(() => vi.unstubAllGlobals());

describe('cerrar sesión', () => {
  it('el panel de la pareja cierra la sesión y vuelve a su acceso', async () => {
    const salidas: string[] = [];
    const asignar = vi.fn();
    vi.stubGlobal('location', { assign: asignar });
    configurar(salidas, [
      SessionStore,
      {
        provide: BodaStore,
        useValue: {
          boda: signal(null),
          estado: signal('cargando'),
          error: signal(''),
          async cargar() {
            return;
          },
        },
      },
    ]);

    const fixture = TestBed.createComponent(PanelShell);
    fixture.detectChanges();
    const boton = botonSalir(fixture.nativeElement);
    expect(boton).toBeTruthy();

    boton!.click();
    await new Promise((listo) => setTimeout(listo, 0));

    expect(salidas).toEqual(['salir']);
    expect(asignar).toHaveBeenCalledWith('/panel/acceso');
  });

  it('el panel del superadmin tiene el botón, cierra y vuelve a su acceso', async () => {
    const salidas: string[] = [];
    const asignar = vi.fn();
    vi.stubGlobal('location', { assign: asignar });
    configurar(salidas);

    // El botón vive ahora en el menú lateral, que es el marco de todas las secciones.
    const fixture = TestBed.createComponent(SuperadminLayout);
    fixture.detectChanges();
    const boton = botonSalir(fixture.nativeElement);
    expect(boton).toBeTruthy();

    boton!.click();
    await new Promise((listo) => setTimeout(listo, 0));

    expect(salidas).toEqual(['salir']);
    expect(asignar).toHaveBeenCalledWith('/superadmin/acceso');
  });

  it('el superadmin puede añadir los módulos nuevos a las bodas existentes', async () => {
    const llamadas: string[] = [];
    const puerta = {
      async completarBodas() {
        llamadas.push('completar');
        return {
          ok: true as const,
          revisadas: 3,
          actualizadas: 2,
          modulosAnadidos: 4,
          seccionesAnadidas: 2,
        };
      },
    };
    configurar([], [{ provide: PUERTA_ALTA, useValue: puerta }]);

    const fixture = TestBed.createComponent(AdminShell);
    fixture.detectChanges();
    const boton = [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Añadir módulos nuevos'),
    );
    expect(boton).toBeTruthy();

    boton!.click();
    await new Promise((listo) => setTimeout(listo, 0));
    fixture.detectChanges();

    expect(llamadas).toEqual(['completar']);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('2 bodas puestas al día');
  });
});
