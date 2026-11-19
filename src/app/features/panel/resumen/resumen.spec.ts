import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { provideIconSprite } from '../../../design-system/icons/icon-sprite.providers';
import {
  PUERTA_INVITADOS,
  type Invitado,
  type PuertaInvitados,
} from '../../../core/invitados/invitados-gateway';
import { BODA_DE_PRUEBA } from '../boda.testing';
import type { BodaDelPanel } from '../boda';
import { menuDeModulos } from '../boda';
import { INVITADO_DE_PRUEBA } from '../invitados/dobles.testing';
import { BodaStore } from '../boda.store';
import { PanelResumen } from './resumen';

/**
 * La primera pantalla del panel, vista como la ve la pareja.
 *
 * Lo que se vigila:
 *
 * 1. **Las dos cifras que vienen a mirar**: cuántos han dicho que vienen y
 *    cuántos han abierto la web.
 * 2. **Que lo que falta se vea y lleve a donde se arregla.**
 * 3. **Que un módulo encendido sin pantalla no se enlace**, que es como se
 *    llegaba a una página en blanco desde el menú.
 */

const ES = JSON.parse(readFileSync('public/i18n/es.json', 'utf8')) as Record<string, unknown>;

function invitado(parcial: Partial<Invitado>): Invitado {
  return { ...INVITADO_DE_PRUEBA, ...parcial };
}

function puertaCon(invitados: readonly Invitado[]): PuertaInvitados {
  return {
    async listar() {
      return { ok: true, invitados };
    },
    async importar() {
      throw new Error('no se usa');
    },
    async guardar() {
      throw new Error('no se usa');
    },
    async borrar() {
      throw new Error('no se usa');
    },
    async cupoEnLote() {
      return { ok: true as const, cambiados: 0, omitidos: 0 };
    },
  };
}

async function montar(boda: BodaDelPanel, invitados: readonly Invitado[] = []) {
  TestBed.configureTestingModule({
    imports: [
      TranslocoTestingModule.forRoot({
        langs: { es: ES },
        translocoConfig: { availableLangs: ['es'], defaultLang: 'es' },
      }),
    ],
    providers: [
      provideIconSprite('panel'),
      provideRouter([]),
      { provide: PUERTA_INVITADOS, useValue: puertaCon(invitados) },
      {
        provide: BodaStore,
        useValue: { boda: () => boda, menu: () => menuDeModulos(boda) },
      },
    ],
  });

  const fixture = TestBed.createComponent(PanelResumen);
  fixture.detectChanges();
  await new Promise((listo) => setTimeout(listo, 0));
  fixture.detectChanges();

  const raiz = fixture.nativeElement as HTMLElement;
  return { fixture, raiz, texto: () => raiz.textContent?.replace(/\s+/g, ' ') ?? '' };
}

const MONTADA: BodaDelPanel = { ...BODA_DE_PRUEBA, heroImageUrl: 'https://ejemplo/portada.jpg' };

describe('el resumen del panel', () => {
  it('saluda y dice cuánto queda', async () => {
    const p = await montar(MONTADA);

    expect(p.texto()).toContain('María y Gabriel');
    expect(p.texto()).toContain('Faltan');
  });

  it('enseña cuántos vienen y cuántos han abierto la web', async () => {
    const p = await montar(MONTADA, [
      invitado({ id: '1', rsvpStatus: 'confirmed', loginCount: 2 }),
      invitado({ id: '2', rsvpStatus: 'pending', loginCount: 1 }),
      invitado({ id: '3', rsvpStatus: 'pending', loginCount: 0 }),
    ]);

    const cifras = [...p.raiz.querySelectorAll('.re__cifra')].map((c) =>
      c.textContent?.replace(/\s+/g, ' ').trim(),
    );

    expect(cifras[0]).toContain('1/3');
    expect(cifras[1]).toContain('2/3');
  });

  it('lo que falta lleva a la pantalla donde se arregla', async () => {
    const p = await montar({ ...MONTADA, weddingDate: null }, []);

    expect(p.texto()).toContain('Poned la fecha de la boda');
    const enlaces = [...p.raiz.querySelectorAll('.re__pendientes a')].map((a) =>
      a.getAttribute('href'),
    );
    expect(enlaces).toContain('/panel/datos');
  });

  /** Una boda hecha del todo no tiene por qué inventarse deberes. */
  it('cuando no falta nada lo dice, en vez de dejar un hueco', async () => {
    const p = await montar(MONTADA, [invitado({ rsvpStatus: 'confirmed', loginCount: 1 })]);

    expect(p.texto()).toContain('No os falta nada');
  });

  it('lleva a las respuestas del formulario y a los invitados', async () => {
    const p = await montar(MONTADA);
    const enlaces = [...p.raiz.querySelectorAll('a')].map((a) => a.getAttribute('href'));

    expect(enlaces).toContain('/panel/rsvp/respuestas');
    expect(enlaces).toContain('/panel/guests');
  });

  /**
   * El fallo que esto evita: la galería está encendida, el menú la enlazaba y
   * llevaba a una página en blanco. Se enseña, pero sin enlace y diciendo lo
   * que es.
   */
  it('un módulo encendido que aún no tiene pantalla se enseña sin enlace', async () => {
    const conGaleria: BodaDelPanel = {
      ...MONTADA,
      modulos: {
        ...MONTADA.modulos,
        gallery: { enabled: true, visibility: 'visible' },
      },
    };

    const p = await montar(conGaleria);
    const enlaces = [...p.raiz.querySelectorAll('a')].map((a) => a.getAttribute('href'));

    expect(p.texto()).toContain('En camino');
    expect(enlaces).not.toContain('/panel/gallery');
  });
});
