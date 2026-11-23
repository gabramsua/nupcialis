import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

import { SesionInvitado } from '../../../core/firebase/sesion-invitado';
import type { ResultadoTenant } from '../../../core/tenant/tenant-loader';
import { EntrarModulo } from './entrar-modulo';

/**
 * La puerta de los módulos (D-56): el quiz, la galería, los regalos y la
 * playlist piden saber quién es el invitado, también en una boda abierta.
 */

const ES = JSON.parse(readFileSync('public/i18n/es.json', 'utf8')) as Record<string, unknown>;

function tenant(modo: 'open' | 'name_phone4' | 'phone'): ResultadoTenant {
  return {
    tipo: 'ok',
    weddingId: 'w1',
    slug: 'ana-y-leo',
    sitio: {
      guestAccessMode: modo,
      coupleNames: { partnerA: 'Ana', partnerB: 'Leo' },
      theme: { templateId: 'clasica', palette: null },
    },
  } as unknown as ResultadoTenant;
}

function montar(modo: 'open' | 'name_phone4' | 'phone', volver: string) {
  const verificado = signal(false);
  const navegar = vi.fn(async () => true);

  TestBed.configureTestingModule({
    imports: [
      TranslocoTestingModule.forRoot({
        langs: { es: ES },
        translocoConfig: { availableLangs: ['es'], defaultLang: 'es' },
      }),
    ],
    providers: [
      provideRouter([]),
      {
        provide: SesionInvitado,
        useValue: { verificado, entrar: async () => ({ ok: false, fallo: { tipo: 'error' } }) },
      },
    ],
  });
  vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockImplementation(navegar);

  const fixture = TestBed.createComponent(EntrarModulo);
  fixture.componentRef.setInput('tenant', tenant(modo));
  fixture.componentRef.setInput('volver', volver);
  fixture.detectChanges();

  const raiz = fixture.nativeElement as HTMLElement;
  return {
    verificado,
    navegar,
    fixture,
    texto: () => raiz.textContent?.replace(/\s+/g, ' ') ?? '',
    campos: () => [...raiz.querySelectorAll('input')].map((i) => i.getAttribute('formcontrolname')),
  };
}

describe('la puerta de los módulos', () => {
  it('en una boda abierta pide nombre y cuatro dígitos, y dice para qué', () => {
    const p = montar('open', 'quiz');
    expect(p.campos()).toEqual(['nombre', 'digitos']);
    expect(p.texto()).toContain('Para jugar y salir en el ranking');
    expect(p.texto()).toContain('Ana & Leo');
  });

  it('el motivo cambia con la página a la que se iba', () => {
    expect(montar('open', 'galeria').texto()).toContain('subir fotos');
  });

  it('en una boda con teléfono, pide el teléfono', () => {
    expect(montar('phone', 'quiz').campos()).toEqual(['telefono']);
  });

  it('al identificarse vuelve a la página a la que iba', async () => {
    const p = montar('open', 'galeria');
    expect(p.navegar).not.toHaveBeenCalled();

    p.verificado.set(true);
    p.fixture.detectChanges();
    await p.fixture.whenStable();

    expect(p.navegar).toHaveBeenCalledWith('/galeria');
  });

  it('un destino que no es una de las páginas conocidas vuelve a la portada, nunca a donde diga la URL', async () => {
    const p = montar('open', 'https://malo.example/robo');
    expect(p.texto()).not.toContain('malo.example');

    p.verificado.set(true);
    p.fixture.detectChanges();
    await p.fixture.whenStable();

    expect(p.navegar).toHaveBeenCalledWith('/');
  });
});
