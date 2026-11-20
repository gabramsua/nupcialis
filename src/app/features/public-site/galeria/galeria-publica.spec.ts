import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { provideIconSprite } from '../../../design-system/icons/icon-sprite.providers';
import {
  PUERTA_GALERIA,
  type FotoPublica,
  type PuertaGaleria,
  type ResultadoFotos,
} from '../../../core/galeria/galeria-gateway';
import { NpGaleriaPublica } from './galeria-publica';

/**
 * La galería, como la abre el invitado.
 *
 * Lo que se vigila:
 *
 * 1. **Que la rejilla cargue miniaturas y no las fotos grandes.** Una rejilla
 *    de cuarenta fotos a 1600 px son veinte megas por la red de una finca.
 * 2. **Que haya más de una página** y que la segunda se añada a la primera en
 *    vez de reemplazarla.
 * 3. **Que solo se ofrezca borrar lo que se puede borrar**, que es lo suyo.
 */

const ES = JSON.parse(readFileSync('public/i18n/es.json', 'utf8')) as Record<string, unknown>;

function foto(parcial: Partial<FotoPublica> & { id: string }): FotoPublica {
  return {
    url: `https://fotos.example.com/${parcial.id}.jpg`,
    urlMiniatura: `https://fotos.example.com/${parcial.id}-mini.jpg`,
    guestId: 'g1',
    autor: 'Ana Ruiz',
    pie: '',
    creadoEn: '2027-06-12T20:00:00.000Z',
    ...parcial,
  };
}

function montar(paginas: readonly ResultadoFotos[]) {
  const subidas: { nombre: string }[] = [];
  const borradas: string[] = [];
  let n = 0;

  const doble: PuertaGaleria = {
    async listar(cursor) {
      // La primera llamada y las recargas tras subir vuelven a la página uno.
      const pagina = cursor === null ? 0 : n;
      n = pagina + 1;
      return paginas[pagina] ?? { ok: true, fotos: [], cursor: null };
    },
    async subir(archivo) {
      subidas.push({ nombre: archivo.name });
      return { ok: true, id: 'nueva' };
    },
    async borrar(photoId) {
      borradas.push(photoId);
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
      provideIconSprite('public'),
      provideRouter([]),
      { provide: PUERTA_GALERIA, useValue: doble },
    ],
  });

  const fixture = TestBed.createComponent(NpGaleriaPublica);
  fixture.detectChanges();

  const raiz = fixture.nativeElement as HTMLElement;

  const asentar = async () => {
    await new Promise((listo) => setTimeout(listo, 0));
    fixture.detectChanges();
  };

  return {
    fixture,
    raiz,
    subidas,
    borradas,
    asentar,
    texto: () => raiz.textContent?.replace(/\s+/g, ' ') ?? '',
    miniaturas: () => [...raiz.querySelectorAll<HTMLImageElement>('.gl__miniatura img')],
    boton(texto: string) {
      return [...raiz.querySelectorAll('button')].find((b) =>
        b.textContent?.includes(texto),
      ) as HTMLButtonElement;
    },
    async pulsar(boton: HTMLButtonElement) {
      boton.click();
      await asentar();
    },
  };
}

const PAGINA_UNA: ResultadoFotos = {
  ok: true,
  fotos: [foto({ id: 'f1' }), foto({ id: 'f2' })],
  cursor: '2027-06-12T20:00:00.000Z',
};

describe('la galería del invitado', () => {
  it('pinta la rejilla con las miniaturas, no con las fotos grandes', async () => {
    const p = montar([PAGINA_UNA]);
    await p.asentar();

    const fuentes = p.miniaturas().map((img) => img.getAttribute('src'));
    expect(fuentes).toEqual([
      'https://fotos.example.com/f1-mini.jpg',
      'https://fotos.example.com/f2-mini.jpg',
    ]);
  });

  it('las miniaturas se cargan en diferido', async () => {
    const p = montar([PAGINA_UNA]);
    await p.asentar();

    expect(p.miniaturas()[0]?.getAttribute('loading')).toBe('lazy');
  });

  it('sin fotos, lo dice en vez de dejar el hueco', async () => {
    const p = montar([{ ok: true, fotos: [], cursor: null }]);
    await p.asentar();

    expect(p.texto()).toContain('Todavía no hay fotos');
  });

  it('la segunda página se añade a la primera', async () => {
    const p = montar([PAGINA_UNA, { ok: true, fotos: [foto({ id: 'f3' })], cursor: null }]);
    await p.asentar();

    expect(p.miniaturas()).toHaveLength(2);
    await p.pulsar(p.boton('Ver más fotos'));

    expect(p.miniaturas()).toHaveLength(3);
    // Sin más páginas, el botón desaparece: no se pide lo que no hay.
    expect(p.boton('Ver más fotos')).toBeUndefined();
  });

  describe('el visor', () => {
    it('al tocar una foto la abre en grande', async () => {
      const p = montar([PAGINA_UNA]);
      await p.asentar();
      await p.pulsar(p.miniaturas()[0]!.closest('button')!);

      const grande = p.raiz.querySelector<HTMLImageElement>('.gl__grande');
      expect(grande?.getAttribute('src')).toBe('https://fotos.example.com/f1.jpg');
    });

    it('se puede pasar a la siguiente y volver', async () => {
      const p = montar([PAGINA_UNA]);
      await p.asentar();
      await p.pulsar(p.miniaturas()[0]!.closest('button')!);

      await p.pulsar(p.boton('Siguiente'));
      expect(p.raiz.querySelector<HTMLImageElement>('.gl__grande')?.src).toContain('f2.jpg');

      await p.pulsar(p.boton('Anterior'));
      expect(p.raiz.querySelector<HTMLImageElement>('.gl__grande')?.src).toContain('f1.jpg');
    });

    /** No se puede ofrecer borrar la foto de otro: el servidor diría que no. */
    it('no ofrece borrar una foto que no es tuya', async () => {
      const p = montar([PAGINA_UNA]);
      await p.asentar();
      await p.pulsar(p.miniaturas()[0]!.closest('button')!);

      expect(p.boton('Borrar')).toBeUndefined();
    });
  });

  it('si le falta verificarse, se lo explica', async () => {
    const p = montar([{ ok: false, fallo: { tipo: 'sin-verificar' } }]);
    await p.asentar();

    expect(p.texto()).toContain('cuatro últimos dígitos');
  });
});
