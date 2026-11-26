import { TestBed } from '@angular/core/testing';
import { Meta, Title } from '@angular/platform-browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PUERTA_HOME_PUBLICA, type PuertaHomePublica } from '../../core/home/home-gateway';
import { HOME_DE_FABRICA, sanearHome, type ContenidoHome } from './home';
import { ESPERA_MAXIMA_MS, NpHomeLanding } from './home-landing';

const GUARDADA: ContenidoHome = sanearHome({
  ...HOME_DE_FABRICA,
  seo: { title: 'Título guardado', description: 'Descripción guardada' },
  hero: { ...HOME_DE_FABRICA.hero, title: 'Titular guardado' },
});

function montar(puerta: PuertaHomePublica | null) {
  TestBed.configureTestingModule({
    providers: puerta ? [{ provide: PUERTA_HOME_PUBLICA, useValue: puerta }] : [],
  });
  const fixture = TestBed.createComponent(NpHomeLanding);
  fixture.detectChanges();
  return fixture;
}

const texto = (f: { nativeElement: HTMLElement }): string => f.nativeElement.textContent ?? '';

describe('la HOME pública', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('pinta lo que dejó el superadmin y pone su SEO', async () => {
    const f = montar({ leer: async () => GUARDADA });
    await vi.advanceTimersByTimeAsync(0);
    f.detectChanges();

    expect(texto(f)).toContain('Titular guardado');
    expect(TestBed.inject(Title).getTitle()).toBe('Título guardado');
    expect(TestBed.inject(Meta).getTag('name="description"')?.content).toBe('Descripción guardada');
  });

  it('sin nada guardado pinta lo de fábrica', async () => {
    const f = montar({ leer: async () => null });
    await vi.advanceTimersByTimeAsync(0);
    f.detectChanges();

    expect(texto(f)).toContain(HOME_DE_FABRICA.hero.title);
    expect(TestBed.inject(Title).getTitle()).toBe(HOME_DE_FABRICA.seo.title);
  });

  it('sin puerta (la ruta no la provee) también pinta lo de fábrica', async () => {
    const f = montar(null);
    await vi.advanceTimersByTimeAsync(0);
    f.detectChanges();

    expect(texto(f)).toContain(HOME_DE_FABRICA.hero.title);
  });

  it('si la lectura falla, no se queda en blanco', async () => {
    const f = montar({
      leer: async () => {
        throw new Error('sin red');
      },
    });
    await vi.advanceTimersByTimeAsync(0);
    f.detectChanges();

    expect(texto(f)).toContain(HOME_DE_FABRICA.hero.title);
  });

  it('si tarda demasiado, pinta lo de fábrica y no espera más', async () => {
    const f = montar({ leer: () => new Promise<ContenidoHome | null>(() => undefined) });

    await vi.advanceTimersByTimeAsync(ESPERA_MAXIMA_MS - 1);
    f.detectChanges();
    expect(texto(f)).not.toContain(HOME_DE_FABRICA.hero.title);

    await vi.advanceTimersByTimeAsync(2);
    f.detectChanges();
    expect(texto(f)).toContain(HOME_DE_FABRICA.hero.title);
  });
});
