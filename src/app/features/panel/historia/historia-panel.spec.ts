import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { SessionStore } from '../../../core/auth/session.store';
import { PUERTA_HISTORIA, type PuertaHistoria } from '../../../core/historia/historia-gateway';
import { provideIconSprite } from '../../../design-system/icons/icon-sprite.providers';
import {
  sanearHistoria,
  type ApartadoDeHistoria,
  type ClaveHistoria,
  type FotoDeHistoria,
} from '../../public-site/historia/historia';
import { PanelHistoria } from './historia-panel';
import { HistoriaStore } from './historia.store';

const ES = JSON.parse(readFileSync('public/i18n/es.json', 'utf8')) as Record<string, unknown>;
const URL_A = 'https://firebasestorage.googleapis.com/v0/b/x/o/a.jpg?alt=media';
const PATH_A = 'weddings/w1/story/a.jpg';

function montar(inicial: readonly ApartadoDeHistoria[] = sanearHistoria(null), falla = false) {
  const textos: { clave: ClaveHistoria; html: string }[] = [];
  const fotosGuardadas: { clave: ClaveHistoria; fotos: readonly FotoDeHistoria[] }[] = [];
  const borrados: string[] = [];
  let n = 0;

  const puerta: PuertaHistoria = {
    async leer() {
      return { ok: true, valor: inicial };
    },
    async guardarTexto(_w, clave, html) {
      if (falla) return { ok: false, fallo: { tipo: 'red' } };
      textos.push({ clave, html });
      return { ok: true, valor: null };
    },
    async subirFoto() {
      n += 1;
      return {
        ok: true,
        valor: {
          url: `https://firebasestorage.googleapis.com/v0/b/x/o/n${n}.jpg`,
          path: `weddings/w1/story/n${n}.jpg`,
        },
      };
    },
    async guardarFotos(_w, clave, fotos) {
      if (falla) return { ok: false, fallo: { tipo: 'error', mensaje: 'x' } };
      fotosGuardadas.push({ clave, fotos });
      return { ok: true, valor: null };
    },
    async borrarFichero(path) {
      borrados.push(path);
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
      { provide: PUERTA_HISTORIA, useValue: puerta },
      { provide: SessionStore, useValue: { weddingId: () => 'w1' } },
      HistoriaStore,
    ],
  });

  const fixture = TestBed.createComponent(PanelHistoria);
  fixture.detectChanges();
  return {
    fixture,
    store: TestBed.inject(HistoriaStore),
    el: fixture.nativeElement as HTMLElement,
    textos,
    fotosGuardadas,
    borrados,
  };
}

const asentar = async (f: { detectChanges(): void }) => {
  await new Promise((listo) => setTimeout(listo, 0));
  f.detectChanges();
};

const conFoto = (clave: ClaveHistoria, fotos: FotoDeHistoria[]): ApartadoDeHistoria[] =>
  sanearHistoria(null).map((a) => (a.clave === clave ? { ...a, fotos } : a));

const fichero = () => new File(['x'], 'foto.jpg', { type: 'image/jpeg' });

describe('Nuestra historia en el panel', () => {
  it('enseña los cinco apartados con su título', async () => {
    const { fixture, el } = montar();
    await asentar(fixture);

    const titulos = [...el.querySelectorAll('article h3')].map((h) => h.textContent?.trim());
    expect(titulos).toEqual([
      'Nos conocemos desde',
      'El primer beso',
      'Nuestro mejor recuerdo',
      'Nuestro mejor viaje',
      'La pedida',
    ]);
  });

  it('guarda el texto de un apartado y no toca los demás', async () => {
    const { fixture, store, textos } = montar();
    await asentar(fixture);

    expect(await store.guardarTexto('beso', '<p>Lisboa</p>')).toBe(true);

    expect(textos).toEqual([{ clave: 'beso', html: '<p>Lisboa</p>' }]);
    expect(store.apartado('beso').html).toBe('<p>Lisboa</p>');
    expect(store.apartado('pedida').html).toBe('');
  });

  it('un fallo al guardar no cambia lo que se ve y lo dice', async () => {
    const { fixture, store, el } = montar(sanearHistoria(null), true);
    await asentar(fixture);

    expect(await store.guardarTexto('beso', '<p>Lisboa</p>')).toBe(false);
    fixture.detectChanges();

    expect(store.apartado('beso').html).toBe('');
    expect(el.textContent).toContain('Sin conexión');
  });

  it('añade fotos hasta dos por apartado y no más', async () => {
    const { fixture, store, fotosGuardadas } = montar();
    await asentar(fixture);

    expect(await store.anadirFoto('viaje', fichero())).toBe(true);
    expect(await store.anadirFoto('viaje', fichero())).toBe(true);
    expect(await store.anadirFoto('viaje', fichero())).toBe(false);

    expect(store.apartado('viaje').fotos).toHaveLength(2);
    expect(fotosGuardadas.at(-1)?.fotos).toHaveLength(2);

    fixture.detectChanges();
    const articulo = fixture.nativeElement.querySelector('[data-apartado="viaje"]');
    expect(articulo.querySelector('input[type="file"]')).toBeNull();
  });

  it('tiene dos botones de guardar, arriba y abajo, y no uno por apartado', async () => {
    const { fixture, el } = montar();
    await asentar(fixture);

    const botones = el.querySelectorAll<HTMLButtonElement>('[data-accion="guardar"]');
    expect(botones).toHaveLength(2);
    expect(el.querySelector('article [data-accion="guardar"]')).toBeNull();
    expect([...botones].every((b) => b.disabled)).toBe(true);
  });

  it('guarda de una vez todos los apartados con cambios', async () => {
    const { fixture, el, textos } = montar();
    await asentar(fixture);

    const panel = fixture.componentInstance as unknown as {
      editar(clave: ClaveHistoria, html: string): void;
    };
    panel.editar('beso', '<p>Lisboa</p>');
    panel.editar('pedida', '<p>En la playa</p>');
    fixture.detectChanges();

    const botones = el.querySelectorAll<HTMLButtonElement>('[data-accion="guardar"]');
    expect([...botones].every((b) => !b.disabled)).toBe(true);

    botones[1].click();
    await asentar(fixture);
    await asentar(fixture);

    expect(textos).toEqual([
      { clave: 'beso', html: '<p>Lisboa</p>' },
      { clave: 'pedida', html: '<p>En la playa</p>' },
    ]);
    expect(
      [...el.querySelectorAll<HTMLButtonElement>('[data-accion="guardar"]')].every(
        (b) => b.disabled,
      ),
    ).toBe(true);
  });

  it('quita una foto: primero del documento y después el fichero', async () => {
    const { fixture, store, fotosGuardadas, borrados } = montar(
      conFoto('pedida', [{ url: URL_A, path: PATH_A }]),
    );
    await asentar(fixture);

    expect(await store.quitarFoto('pedida', URL_A)).toBe(true);

    expect(fotosGuardadas).toEqual([{ clave: 'pedida', fotos: [] }]);
    expect(borrados).toEqual([PATH_A]);
    expect(store.apartado('pedida').fotos).toEqual([]);
  });

  it('si no se puede guardar la foto en el documento, borra el fichero que acababa de subir', async () => {
    const { fixture, store, borrados } = montar(sanearHistoria(null), true);
    await asentar(fixture);

    expect(await store.anadirFoto('beso', fichero())).toBe(false);

    expect(borrados).toEqual(['weddings/w1/story/n1.jpg']);
    expect(store.apartado('beso').fotos).toEqual([]);
  });

  it('rechaza una foto de más de 10 MB sin subirla', async () => {
    const { fixture, el, store } = montar();
    await asentar(fixture);

    const grande = new File([new Uint8Array(11 * 1024 * 1024)], 'grande.jpg', {
      type: 'image/jpeg',
    });
    const entrada = el.querySelector<HTMLInputElement>(
      '[data-apartado="beso"] input[type="file"]',
    )!;
    Object.defineProperty(entrada, 'files', { value: [grande] });
    entrada.dispatchEvent(new Event('change'));
    await asentar(fixture);

    expect(store.apartado('beso').fotos).toHaveLength(0);
    expect(el.textContent).toContain('más de 10 MB');
  });
});
