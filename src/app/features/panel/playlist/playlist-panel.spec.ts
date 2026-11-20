import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';

import { provideIconSprite } from '../../../design-system/icons/icon-sprite.providers';
import { SessionStore } from '../../../core/auth/session.store';
import {
  PUERTA_PLAYLIST_PANEL,
  ordenarCancionesDelPanel,
  type CancionDelPanel,
  type PuertaPlaylistPanel,
} from '../../../core/playlist/playlist-panel-gateway';
import type { EstadoCancion } from '../../public-site/playlist/playlist';
import { abrirDialogosEnPruebas } from '../invitados/dobles.testing';
import { PanelPlaylist } from './playlist-panel';
import { PlaylistStore } from './playlist.store';

/**
 * La música, en el panel.
 *
 * Lo que se vigila:
 *
 * 1. **Que lo pendiente sea lo primero que se ve y se cuente aparte.** El
 *    trabajo de esta pantalla es vaciar «Por decidir».
 * 2. **Que vetar sea un toque** y que lo vetado se diga con texto, no solo con
 *    color.
 * 3. **Que poner en la lista de veto algo que ya habían pedido no lo duplique**:
 *    se le cambia el estado.
 */

beforeAll(abrirDialogosEnPruebas);

const ES = JSON.parse(readFileSync('public/i18n/es.json', 'utf8')) as Record<string, unknown>;

function c(parcial: Partial<CancionDelPanel> & { id: string }): CancionDelPanel {
  return {
    title: `Canción ${parcial.id}`,
    artist: '',
    votos: 0,
    status: 'pending',
    source: 'guest',
    ...parcial,
  };
}

async function montar(canciones: readonly CancionDelPanel[]) {
  const cambios: { id: string; estado: EstadoCancion }[] = [];
  const altas: { title: string; artist: string; estado: EstadoCancion }[] = [];
  const borrados: string[] = [];

  const doble: PuertaPlaylistPanel = {
    async listar() {
      return { ok: true, canciones: ordenarCancionesDelPanel(canciones) };
    },
    async cambiarEstado(_w, id, estado) {
      cambios.push({ id, estado });
      return { ok: true };
    },
    async anadir(_w, title, artist, estado) {
      altas.push({ title, artist, estado });
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
      { provide: PUERTA_PLAYLIST_PANEL, useValue: doble },
      { provide: SessionStore, useValue: { weddingId: () => 'w1' } },
      PlaylistStore,
    ],
  });

  const fixture = TestBed.createComponent(PanelPlaylist);
  fixture.detectChanges();
  await new Promise((listo) => setTimeout(listo, 0));
  fixture.detectChanges();

  const raiz = fixture.nativeElement as HTMLElement;

  return {
    fixture,
    raiz,
    cambios,
    altas,
    borrados,
    texto: () => raiz.textContent?.replace(/\s+/g, ' ') ?? '',
    filas: () => [...raiz.querySelectorAll('.pls__cancion')],
    titulos: () =>
      [...raiz.querySelectorAll('.pls__cancion strong')].map((e) => e.textContent?.trim()),
    boton(dentro: Element, texto: string) {
      return [...dentro.querySelectorAll('button')].find((b) => b.textContent?.includes(texto))!;
    },
    escribir(selector: string, valor: string) {
      const campo = raiz.querySelector(selector) as HTMLInputElement;
      campo.value = valor;
      campo.dispatchEvent(new Event('input'));
      fixture.detectChanges();
    },
    async pulsar(boton: HTMLButtonElement) {
      boton.click();
      await new Promise((listo) => setTimeout(listo, 0));
      fixture.detectChanges();
    },
  };
}

describe('la música en el panel', () => {
  it('abre en «Por decidir», por votos, y cuenta cada estado en su pestaña', async () => {
    const p = await montar([
      c({ id: 'a', title: 'Alegría', votos: 2 }),
      c({ id: 'b', title: 'Bailando', votos: 9 }),
      c({ id: 'c', status: 'accepted' }),
      c({ id: 'd', status: 'vetoed' }),
      c({ id: 'e', status: 'vetoed' }),
    ]);

    expect(p.titulos()).toEqual(['Bailando', 'Alegría']);

    const pestanas = [...p.raiz.querySelectorAll('.pls__filtro')].map((f) =>
      f.textContent?.replace(/\s+/g, ' ').trim(),
    );
    expect(pestanas).toEqual(['Por decidir2', 'Suena1', 'Descartada0', 'Vetada2']);
  });

  it('cada pestaña enseña solo lo suyo', async () => {
    const p = await montar([
      c({ id: 'a', title: 'Pendiente' }),
      c({ id: 'b', title: 'Aceptada', status: 'accepted' }),
      c({ id: 'd', title: 'Vetada', status: 'vetoed' }),
    ]);

    await p.pulsar(p.boton(p.raiz, 'Suena') as HTMLButtonElement);
    expect(p.titulos()).toEqual(['Aceptada']);

    await p.pulsar(p.boton(p.raiz, 'Vetada') as HTMLButtonElement);
    expect(p.titulos()).toEqual(['Vetada']);
  });

  /** El color no va solo: el estado se dice con su nombre. */
  it('dice el estado con texto y de dónde vino la canción', async () => {
    const p = await montar([
      c({ id: 'a', source: 'rsvp' }),
      c({ id: 'b', status: 'vetoed', source: 'couple' }),
    ]);

    expect(p.filas()[0]?.textContent).toContain('Por decidir');
    expect(p.filas()[0]?.textContent).toContain('La escribió al confirmar');

    await p.pulsar(p.boton(p.raiz, 'Vetada') as HTMLButtonElement);
    expect(p.filas()[0]?.textContent).toContain('Vetada');
    expect(p.filas()[0]?.textContent).toContain('La pusisteis vosotros');
  });

  it('aceptar, descartar y vetar son un toque cada uno', async () => {
    const p = await montar([c({ id: 'a' })]);

    await p.pulsar(p.boton(p.filas()[0]!, 'Que suene'));
    await p.pulsar(p.boton(p.filas()[0]!, 'Descartar'));
    await p.pulsar(p.boton(p.filas()[0]!, 'Vetar'));

    expect(p.cambios).toEqual([
      { id: 'a', estado: 'accepted' },
      { id: 'a', estado: 'discarded' },
      { id: 'a', estado: 'vetoed' },
    ]);
  });

  it('lo vetado ofrece deshacer, pero no vetar otra vez', async () => {
    const p = await montar([c({ id: 'a', status: 'vetoed' })]);
    await p.pulsar(p.boton(p.raiz, 'Vetada') as HTMLButtonElement);

    expect(p.filas()[0]?.textContent).not.toContain('Vetar');
    await p.pulsar(p.boton(p.filas()[0]!, 'Volver a «por decidir»'));
    expect(p.cambios).toEqual([{ id: 'a', estado: 'pending' }]);
  });

  it('una pestaña vacía dice qué significa que esté vacía', async () => {
    const p = await montar([c({ id: 'a' })]);
    await p.pulsar(p.boton(p.raiz, 'Vetada') as HTMLButtonElement);

    expect(p.texto()).toContain('La lista de veto está vacía');
  });

  describe('añadir una canción', () => {
    it('una canción nueva se guarda con el estado elegido', async () => {
      const p = await montar([]);
      await p.pulsar(p.boton(p.raiz, 'Añadir una canción'));

      p.escribir('input[formcontrolname="title"]', '  La Macarena ');
      p.escribir('input[formcontrolname="artist"]', 'Los del Río');
      const estado = p.raiz.querySelector('select[formcontrolname="estado"]') as HTMLSelectElement;
      estado.value = 'vetoed';
      estado.dispatchEvent(new Event('change'));
      p.fixture.detectChanges();
      await p.pulsar(p.boton(p.raiz, 'Guardar'));

      expect(p.altas).toEqual([{ title: 'La Macarena', artist: 'Los del Río', estado: 'vetoed' }]);
    });

    /** Si ya la habían pedido, vetarla es cambiarle el estado: no hay dos filas. */
    it('si ya estaba propuesta, le cambia el estado en vez de duplicarla', async () => {
      const p = await montar([c({ id: 'pedida', title: 'La Macarena', artist: 'Los del Río' })]);
      await p.pulsar(p.boton(p.raiz, 'Añadir una canción'));

      p.escribir('input[formcontrolname="title"]', 'la macarena');
      const estado = p.raiz.querySelector('select[formcontrolname="estado"]') as HTMLSelectElement;
      estado.value = 'vetoed';
      estado.dispatchEvent(new Event('change'));
      p.fixture.detectChanges();
      await p.pulsar(p.boton(p.raiz, 'Guardar'));

      expect(p.altas).toEqual([]);
      expect(p.cambios).toEqual([{ id: 'pedida', estado: 'vetoed' }]);
    });

    it('no deja guardar sin título', async () => {
      const p = await montar([]);
      await p.pulsar(p.boton(p.raiz, 'Añadir una canción'));

      expect(p.boton(p.raiz, 'Guardar').disabled).toBe(true);
    });
  });

  it('borrar pide confirmación y avisa de que volverá si la proponen', async () => {
    const p = await montar([c({ id: 'a', title: 'Alegría' })]);
    await p.pulsar(p.boton(p.filas()[0]!, 'Eliminar'));

    expect(p.texto()).toContain('¿Borrar «Alegría»?');
    expect(p.borrados).toEqual([]);
    await p.pulsar(
      [...p.raiz.querySelectorAll('dialog button')].find((b) =>
        b.textContent?.includes('Eliminar'),
      ) as HTMLButtonElement,
    );
    expect(p.borrados).toEqual(['a']);
  });

  it('no deja exportar si no hay nada decidido', async () => {
    const p = await montar([c({ id: 'a' })]);

    expect(p.boton(p.raiz, 'Lista para el DJ').disabled).toBe(true);
  });

  it('deja exportar en cuanto hay algo que suena o está vetado', async () => {
    const p = await montar([c({ id: 'a', status: 'accepted' })]);

    expect(p.boton(p.raiz, 'Lista para el DJ').disabled).toBe(false);
  });
});
