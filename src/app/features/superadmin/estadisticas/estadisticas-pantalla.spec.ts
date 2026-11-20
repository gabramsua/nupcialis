import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';

import {
  PUERTA_ESTADISTICAS,
  type PuertaEstadisticas,
  type ResultadoLectura,
} from '../../../core/superadmin/estadisticas-gateway';
import { provideIconSprite } from '../../../design-system/icons/icon-sprite.providers';
import { abrirDialogosEnPruebas } from '../../panel/invitados/dobles.testing';
import { resumir, type FilaDeBoda } from './estadisticas';
import { PantallaEstadisticas } from './estadisticas-pantalla';

/**
 * Las estadísticas del superadmin.
 *
 * Lo que se vigila:
 *
 * 1. **Que lo más urgente sea lo primero**: las galerías llenas, antes que las
 *    que tienen espacio.
 * 2. **Que el estado de cada galería se diga con texto**, no solo con color.
 * 3. **Que el almacenamiento se presente como estimación.**
 * 4. **Que un tope fuera de rango ni siquiera llegue al servidor.**
 */

beforeAll(abrirDialogosEnPruebas);

const ES = JSON.parse(readFileSync('public/i18n/es.json', 'utf8')) as Record<string, unknown>;

function boda(parcial: Partial<FilaDeBoda> & { weddingId: string }): FilaDeBoda {
  return {
    slug: parcial.weddingId,
    status: 'active',
    plan: 'basic',
    invitados: 10,
    confirmados: 4,
    fotos: 0,
    tope: 500,
    topeEsPropio: false,
    partidasQuiz: 0,
    accesos: 0,
    creadaEn: null,
    ...parcial,
  };
}

async function montar(bodas: readonly FilaDeBoda[], lectura?: ResultadoLectura) {
  const topes: { weddingId: string; maxPhotos: number | null }[] = [];

  const doble: PuertaEstadisticas = {
    async leer() {
      return (
        lectura ?? {
          ok: true,
          datos: { resumen: resumir(bodas, new Date()), bodas, recortado: false },
        }
      );
    },
    async fijarTope(weddingId, maxPhotos) {
      topes.push({ weddingId, maxPhotos });
      return { ok: true, maxPhotos: maxPhotos ?? 500, topeEsPropio: maxPhotos !== null };
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
      provideRouter([]),
      provideIconSprite('panel'),
      { provide: PUERTA_ESTADISTICAS, useValue: doble },
    ],
  });

  const fixture = TestBed.createComponent(PantallaEstadisticas);
  fixture.detectChanges();
  await new Promise((listo) => setTimeout(listo, 0));
  fixture.detectChanges();

  const raiz = fixture.nativeElement as HTMLElement;
  return {
    fixture,
    raiz,
    topes,
    texto: () => raiz.textContent?.replace(/\s+/g, ' ') ?? '',
    slugs: () => [...raiz.querySelectorAll('.est__boda-cab strong')].map((e) => e.textContent),
    async pulsar(boton: Element) {
      (boton as HTMLButtonElement).click();
      await new Promise((listo) => setTimeout(listo, 0));
      fixture.detectChanges();
    },
  };
}

describe('las estadísticas del superadmin', () => {
  it('pone primero la galería más llena', async () => {
    const p = await montar([
      boda({ weddingId: 'holgada', fotos: 10 }),
      boda({ weddingId: 'llena', fotos: 500 }),
      boda({ weddingId: 'cerca', fotos: 420 }),
    ]);
    expect(p.slugs()).toEqual(['llena', 'cerca', 'holgada']);
  });

  it('dice el nivel con palabras, no solo con color', async () => {
    const p = await montar([
      boda({ weddingId: 'llena', fotos: 500 }),
      boda({ weddingId: 'cerca', fotos: 420 }),
      boda({ weddingId: 'holgada', fotos: 10 }),
    ]);
    const t = p.texto();
    expect(t).toContain('Galería llena');
    expect(t).toContain('Cerca del tope');
    expect(t).toContain('Con espacio');
    expect(t).toContain('420 de 500 fotos (84 %)');
  });

  it('enseña los totales y marca el almacenamiento como estimado', async () => {
    const p = await montar([
      boda({ weddingId: 'a', fotos: 100 }),
      boda({ weddingId: 'b', fotos: 50 }),
    ]);
    const t = p.texto();
    expect(t).toContain('150');
    expect(t).toContain('Almacenamiento de fotos estimado');
  });

  it('avisa si hay más bodas de las que se miden', async () => {
    const bodas = [boda({ weddingId: 'a' })];
    const p = await montar(bodas, {
      ok: true,
      datos: { resumen: resumir(bodas, new Date()), bodas, recortado: true },
    });
    expect(p.texto()).toContain('Hay más bodas de las que se miden');
  });

  it('un fallo se cuenta y deja reintentar', async () => {
    const p = await montar([], { ok: false, fallo: { tipo: 'sin-permiso' } });
    expect(p.texto()).toContain('No se han podido cargar las estadísticas');
    expect(p.texto()).toContain('Reintentar');
  });

  it('cambiar el tope manda el número y actualiza la fila', async () => {
    const p = await montar([boda({ weddingId: 'a', fotos: 450 })]);
    await p.pulsar(p.raiz.querySelector('.est__boda button')!);

    const campo = document.querySelector('dialog input[type="number"]') as HTMLInputElement;
    campo.value = '900';
    campo.dispatchEvent(new Event('input'));
    const guardar = [...document.querySelectorAll('dialog button')].find((b) =>
      b.textContent?.includes('Guardar'),
    )!;
    await p.pulsar(guardar);

    expect(p.topes).toEqual([{ weddingId: 'a', maxPhotos: 900 }]);
    expect(p.texto()).toContain('450 de 900 fotos');
    expect(p.texto()).toContain('Tope fijado a mano');
  });

  it('un tope fuera de rango no llega al servidor', async () => {
    const p = await montar([boda({ weddingId: 'a' })]);
    await p.pulsar(p.raiz.querySelector('.est__boda button')!);

    const campo = document.querySelector('dialog input[type="number"]') as HTMLInputElement;
    campo.value = '999999';
    campo.dispatchEvent(new Event('input'));
    const guardar = [...document.querySelectorAll('dialog button')].find((b) =>
      b.textContent?.includes('Guardar'),
    )!;
    await p.pulsar(guardar);

    expect(p.topes).toEqual([]);
    expect(document.querySelector('dialog')?.textContent).toContain('número entero');
  });

  it('volver al tope por defecto manda null', async () => {
    const p = await montar([boda({ weddingId: 'a', tope: 900, topeEsPropio: true })]);
    await p.pulsar(p.raiz.querySelector('.est__boda button')!);
    const volver = [...document.querySelectorAll('dialog button')].find((b) =>
      b.textContent?.includes('Usar el de por defecto'),
    )!;
    await p.pulsar(volver);
    expect(p.topes).toEqual([{ weddingId: 'a', maxPhotos: null }]);
  });
});
