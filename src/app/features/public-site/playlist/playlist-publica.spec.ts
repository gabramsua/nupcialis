import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { provideIconSprite } from '../../../design-system/icons/icon-sprite.providers';
import {
  PUERTA_PLAYLIST,
  type CancionPublica,
  type PuertaPlaylist,
  type ResultadoPlaylist,
  type ResultadoProponer,
} from '../../../core/playlist/playlist-gateway';
import { NpPlaylistPublica } from './playlist-publica';

/**
 * La playlist, como la abre el invitado.
 *
 * Lo que se vigila:
 *
 * 1. **Que votar sea un toque** y que el estado «votada» se diga con texto y no
 *    solo con el relleno del corazón (§9.1).
 * 2. **Que una propuesta repetida lo diga**: «ya estaba, te hemos sumado el
 *    voto». Sin eso, quien pide una canción y ve otra fila cree que su
 *    petición se ha perdido.
 * 3. **Que cada fallo del servidor se diga con su frase**, sobre todo el
 *    «no disponible» de lo vetado, que no debe explicar por qué.
 */

const ES = JSON.parse(readFileSync('public/i18n/es.json', 'utf8')) as Record<string, unknown>;

function cancion(parcial: Partial<CancionPublica> & { id: string }): CancionPublica {
  return {
    title: `Canción ${parcial.id}`,
    artist: '',
    votos: 0,
    votadaPorMi: false,
    mia: false,
    ...parcial,
  };
}

async function montar(inicial: readonly CancionPublica[], parcial: Partial<PuertaPlaylist> = {}) {
  const votadas: string[] = [];
  const propuestas: { title: string; artist: string }[] = [];

  const doble: PuertaPlaylist = {
    async listar(): Promise<ResultadoPlaylist> {
      return { ok: true, canciones: inicial };
    },
    async proponer(title, artist): Promise<ResultadoProponer> {
      propuestas.push({ title, artist });
      return { ok: true, canciones: inicial, resultado: 'creada' };
    },
    async votar(songId): Promise<ResultadoPlaylist> {
      votadas.push(songId);
      return {
        ok: true,
        canciones: inicial.map((c) =>
          c.id === songId
            ? { ...c, votadaPorMi: !c.votadaPorMi, votos: c.votos + (c.votadaPorMi ? -1 : 1) }
            : c,
        ),
      };
    },
    ...parcial,
  };

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
      { provide: PUERTA_PLAYLIST, useValue: doble },
    ],
  });

  const fixture = TestBed.createComponent(NpPlaylistPublica);
  fixture.detectChanges();
  await new Promise((listo) => setTimeout(listo, 0));
  fixture.detectChanges();

  const raiz = fixture.nativeElement as HTMLElement;

  return {
    fixture,
    raiz,
    votadas,
    propuestas,
    texto: () => raiz.textContent?.replace(/\s+/g, ' ') ?? '',
    filas: () => [...raiz.querySelectorAll('.pl__cancion')],
    escribir(selector: string, valor: string) {
      const campo = raiz.querySelector(selector) as HTMLInputElement;
      campo.value = valor;
      campo.dispatchEvent(new Event('input'));
      fixture.detectChanges();
    },
    async esperar() {
      await new Promise((listo) => setTimeout(listo, 0));
      fixture.detectChanges();
    },
  };
}

describe('la playlist del invitado', () => {
  it('lista las canciones con sus votos y marca la que pidió él', async () => {
    const p = await montar([
      cancion({ id: 'a', title: 'Bailando', votos: 4 }),
      cancion({ id: 'b', title: 'Despacito', artist: 'Luis Fonsi', votos: 1, mia: true }),
    ]);

    expect(p.filas().map((f) => f.querySelector('strong')?.textContent?.trim())).toEqual([
      'Bailando',
      'Despacito',
    ]);
    expect(p.filas()[1]?.textContent).toContain('La pediste tú');
    expect(p.filas()[1]?.textContent).toContain('Luis Fonsi');
  });

  /** El color y el relleno no van solos (§9.1): el estado se dice con texto. */
  it('dice «Votada» o «Votar» con texto, y lo marca como pulsado', async () => {
    const p = await montar([
      cancion({ id: 'a', votos: 2, votadaPorMi: true }),
      cancion({ id: 'b', votos: 1 }),
    ]);
    const botones = p.raiz.querySelectorAll<HTMLButtonElement>('.pl__voto');

    expect(botones[0]?.textContent).toContain('Votada');
    expect(botones[0]?.getAttribute('aria-pressed')).toBe('true');
    expect(botones[1]?.textContent).toContain('Votar');
    expect(botones[1]?.getAttribute('aria-pressed')).toBe('false');
  });

  it('votar es un toque y la lista se actualiza con lo que devuelve el servidor', async () => {
    const p = await montar([cancion({ id: 'a', votos: 1 })]);

    p.raiz.querySelector<HTMLButtonElement>('.pl__voto')!.click();
    await p.esperar();

    expect(p.votadas).toEqual(['a']);
    expect(p.filas()[0]?.textContent).toContain('Votada');
    expect(p.filas()[0]?.textContent).toContain('2');
  });

  it('no deja proponer sin título', async () => {
    const p = await montar([]);

    expect(p.raiz.querySelector<HTMLButtonElement>('.pl__enviar')!.disabled).toBe(true);
    p.escribir('input[name="title"]', '   ');
    expect(p.raiz.querySelector<HTMLButtonElement>('.pl__enviar')!.disabled).toBe(true);
    p.escribir('input[name="title"]', 'Despacito');
    expect(p.raiz.querySelector<HTMLButtonElement>('.pl__enviar')!.disabled).toBe(false);
  });

  it('propone con el título y el artista sin espacios sobrantes y vacía el formulario', async () => {
    const p = await montar([]);

    p.escribir('input[name="title"]', '  Despacito ');
    p.escribir('input[name="artist"]', ' Luis Fonsi ');
    p.raiz.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    await p.esperar();

    expect(p.propuestas).toEqual([{ title: 'Despacito', artist: 'Luis Fonsi' }]);
    expect(p.texto()).toContain('Canción añadida');
    expect(p.raiz.querySelector<HTMLInputElement>('input[name="title"]')!.value).toBe('');
  });

  /** Quien pide una canción y ve otra fila cree que su petición se ha perdido. */
  it('si la canción ya estaba, dice que se ha sumado su voto', async () => {
    const p = await montar([], {
      async proponer() {
        return { ok: true, canciones: [cancion({ id: 'a', votos: 3 })], resultado: 'ya-estaba' };
      },
    });

    p.escribir('input[name="title"]', 'Despacito');
    p.raiz.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    await p.esperar();

    expect(p.texto()).toContain('Esa ya estaba en la lista');
  });

  /** El invitado no debe saber si la pareja la vetó o la descartó. */
  it('«no disponible» no explica el motivo', async () => {
    const p = await montar([], {
      async proponer() {
        return { ok: false, fallo: { tipo: 'no-disponible' } };
      },
    });

    p.escribir('input[name="title"]', 'La Macarena');
    p.raiz.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    await p.esperar();

    expect(p.texto()).toContain('Esa canción no está disponible');
    expect(p.texto()).not.toMatch(/vet/i);
  });

  it('en el tope de propuestas dice que puede seguir votando', async () => {
    const p = await montar([], {
      async proponer() {
        return { ok: false, fallo: { tipo: 'tope-invitado' } };
      },
    });

    p.escribir('input[name="title"]', 'Otra');
    p.raiz.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    await p.esperar();

    expect(p.texto()).toContain('Podéis seguir votando');
  });

  it('si le falta identificarse, se lo dice en la propia pantalla', async () => {
    const p = await montar([], {
      async listar() {
        return { ok: false, fallo: { tipo: 'sin-verificar' } };
      },
    });

    expect(p.texto()).toContain('cuatro últimos dígitos');
    expect(p.texto()).not.toContain('Todavía no hay canciones');
  });

  it('una lista vacía invita a ser el primero', async () => {
    const p = await montar([]);

    expect(p.texto()).toContain('Todavía no hay canciones');
  });

  it('si la canción ya no existe al votar, recarga la lista', async () => {
    let lista: readonly CancionPublica[] = [cancion({ id: 'a' }), cancion({ id: 'b' })];
    const p = await montar(lista, {
      async listar() {
        return { ok: true, canciones: lista };
      },
      async votar() {
        lista = [cancion({ id: 'b' })];
        return { ok: false, fallo: { tipo: 'no-existe' } };
      },
    });

    p.raiz.querySelector<HTMLButtonElement>('.pl__voto')!.click();
    await p.esperar();
    await p.esperar();

    expect(p.filas().length).toBe(1);
  });
});
