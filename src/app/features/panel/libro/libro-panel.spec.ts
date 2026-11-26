import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';

import { SessionStore } from '../../../core/auth/session.store';
import {
  PUERTA_LIBRO_PANEL,
  ordenarFirmasDelPanel,
  type EstadoFirmaPanel,
  type FirmaDelPanel,
  type PuertaLibroPanel,
} from '../../../core/libro/libro-panel-gateway';
import { provideIconSprite } from '../../../design-system/icons/icon-sprite.providers';
import { abrirDialogosEnPruebas } from '../invitados/dobles.testing';
import { PanelLibro } from './libro-panel';
import { LibroStore } from './libro.store';

/**
 * El libro de firmas, en el panel.
 *
 * Lo que se vigila:
 *
 * 1. Que lo oculto se vea **como oculto con texto**, no solo por el color.
 * 2. Que ocultar sea un toque y reversible, y que borrar pida confirmación.
 * 3. Que el `guestId` de quien firmó no llegue a la pantalla.
 */

beforeAll(abrirDialogosEnPruebas);

const ES = JSON.parse(readFileSync('public/i18n/es.json', 'utf8')) as Record<string, unknown>;

function f(parcial: Partial<FirmaDelPanel> & { id: string }): FirmaDelPanel {
  return {
    autor: `Autor ${parcial.id}`,
    mensaje: `Mensaje ${parcial.id}`,
    status: 'visible',
    cuando: '2026-11-01T10:00:00.000Z',
    ...parcial,
  };
}

async function montar(firmas: readonly FirmaDelPanel[]) {
  const cambios: { id: string; estado: EstadoFirmaPanel }[] = [];
  const borrados: string[] = [];

  const doble: PuertaLibroPanel = {
    async listar() {
      return { ok: true, firmas: ordenarFirmasDelPanel(firmas) };
    },
    async cambiarEstado(_w, id, estado) {
      cambios.push({ id, estado });
      return { ok: true };
    },
    async borrar(_w, id) {
      borrados.push(id);
      return { ok: true };
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
      { provide: PUERTA_LIBRO_PANEL, useValue: doble },
      { provide: SessionStore, useValue: { weddingId: () => 'w1' } },
      LibroStore,
    ],
  });

  const fixture = TestBed.createComponent(PanelLibro);
  fixture.detectChanges();
  await new Promise((listo) => setTimeout(listo, 0));
  fixture.detectChanges();

  const raiz = fixture.nativeElement as HTMLElement;

  return {
    fixture,
    raiz,
    cambios,
    borrados,
    texto: () => raiz.textContent?.replace(/\s+/g, ' ') ?? '',
    autores: () =>
      [...raiz.querySelectorAll('.lib__firma strong')].map((e) => e.textContent?.trim()),
    boton(dentro: Element, texto: string) {
      return [...dentro.querySelectorAll('button')].find((b) => b.textContent?.includes(texto))!;
    },
    async pulsar(boton: HTMLButtonElement) {
      boton.click();
      await new Promise((listo) => setTimeout(listo, 0));
      fixture.detectChanges();
    },
  };
}

describe('el libro de firmas en el panel', () => {
  it('muestra todas las firmas, la más reciente primero, y cuenta cada filtro', async () => {
    const p = await montar([
      f({ id: 'a', cuando: '2026-11-01T10:00:00.000Z' }),
      f({ id: 'b', cuando: '2026-11-05T10:00:00.000Z' }),
      f({ id: 'c', status: 'hidden' }),
    ]);

    expect(p.autores()).toEqual(['Autor b', 'Autor a', 'Autor c']);

    const pestanas = [...p.raiz.querySelectorAll('.lib__filtro')].map((x) =>
      x.textContent?.replace(/\s+/g, ' ').trim(),
    );
    expect(pestanas).toEqual(['Todas3', 'Visibles2', 'Ocultas1']);
  });

  it('dice «Oculta» con texto en lo que está oculto', async () => {
    const p = await montar([f({ id: 'a', status: 'hidden' })]);
    expect(p.texto()).toContain('Oculta');
  });

  it('ocultar es un toque y no pide confirmación', async () => {
    const p = await montar([f({ id: 'a' })]);
    const fila = p.raiz.querySelector('.lib__firma')!;

    await p.pulsar(p.boton(fila, 'Ocultar'));

    expect(p.cambios).toEqual([{ id: 'a', estado: 'hidden' }]);
  });

  it('volver a mostrar devuelve la firma a visible', async () => {
    const p = await montar([f({ id: 'a', status: 'hidden' })]);
    const fila = p.raiz.querySelector('.lib__firma')!;

    await p.pulsar(p.boton(fila, 'Volver a mostrar'));

    expect(p.cambios).toEqual([{ id: 'a', estado: 'visible' }]);
  });

  it('borrar pide confirmación y solo borra al aceptar', async () => {
    const p = await montar([f({ id: 'a', autor: 'Tía Pepa' })]);
    const fila = p.raiz.querySelector('.lib__firma')!;

    await p.pulsar(p.boton(fila, 'Eliminar'));
    expect(p.borrados).toEqual([]);
    expect(p.texto()).toContain('¿Borrar la firma de «Tía Pepa»?');

    await p.pulsar(
      [...p.raiz.querySelectorAll('dialog button')].find((b) =>
        b.textContent?.includes('Eliminar'),
      ) as HTMLButtonElement,
    );
    expect(p.borrados).toEqual(['a']);
  });

  it('el filtro «Ocultas» enseña solo las ocultas', async () => {
    const p = await montar([f({ id: 'a' }), f({ id: 'b', status: 'hidden' })]);

    await p.pulsar(p.boton(p.raiz, 'Ocultas') as HTMLButtonElement);

    expect(p.autores()).toEqual(['Autor b']);
  });

  it('no enseña ningún identificador de invitado', async () => {
    const p = await montar([f({ id: 'a' })]);
    expect(p.raiz.innerHTML).not.toContain('guestId');
  });
});
