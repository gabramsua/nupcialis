import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { provideIconSprite } from '../../../design-system/icons/icon-sprite.providers';
import { sanearAutobuses, type RutaAutobus } from '../../public-site/autobuses/autobuses';
import { BodaStore } from '../boda.store';
import { BODA_DE_PRUEBA } from '../boda.testing';
import { PanelAutobuses } from './autobuses';

/**
 * Autobuses, en el panel (D-63).
 *
 * Lo que se vigila: que lo ya guardado salga cuando la boda llega (llega
 * después de montar la pantalla), que se avise de la ruta que no se publicaría
 * y que lo que se guarda sea lo que se publicaría.
 */

const ES = JSON.parse(readFileSync('public/i18n/es.json', 'utf8')) as Record<string, unknown>;

const IDA = {
  id: 'r1',
  sentido: 'ida',
  nombre: 'Autobús 1',
  salida: 'Plaza Mayor',
  hora: '17:30',
  destino: 'Finca',
  nota: '',
};

function montar(rutas: unknown = []) {
  const guardados: (readonly RutaAutobus[])[] = [];
  const boda = signal<typeof BODA_DE_PRUEBA | null>(null);

  TestBed.configureTestingModule({
    imports: [
      TranslocoTestingModule.forRoot({
        langs: { es: ES },
        translocoConfig: { availableLangs: ['es'], defaultLang: 'es' },
      }),
    ],
    providers: [
      provideIconSprite('panel'),
      {
        provide: BodaStore,
        useValue: {
          boda,
          error: () => null,
          async guardarAutobuses(lista: readonly RutaAutobus[]) {
            guardados.push(lista);
            return true;
          },
        },
      },
    ],
  });

  const fixture = TestBed.createComponent(PanelAutobuses);
  fixture.detectChanges();
  boda.set({ ...BODA_DE_PRUEBA, autobuses: sanearAutobuses(rutas) });
  fixture.detectChanges();

  const raiz = fixture.nativeElement as HTMLElement;
  const boton = (texto: string) =>
    [...raiz.querySelectorAll('button')].find((b) =>
      b.textContent?.includes(texto),
    ) as HTMLButtonElement;

  function escribir(selector: string, valor: string) {
    const campo = raiz.querySelector<HTMLInputElement>(selector)!;
    campo.value = valor;
    campo.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  return {
    fixture,
    raiz,
    guardados,
    boton,
    escribir,
    texto: () => raiz.textContent?.replace(/\s+/g, ' ') ?? '',
    tarjetas: () => raiz.querySelectorAll('.bu__ruta').length,
  };
}

describe('los autobuses en el panel', () => {
  it('rellena la pantalla con lo que ya estaba guardado', () => {
    const p = montar([IDA]);
    expect(p.tarjetas()).toBe(1);
    expect(p.raiz.querySelector<HTMLInputElement>('input[type="time"]')?.value).toBe('17:30');
    expect(p.texto()).not.toContain('sin salida o sin destino');
  });

  it('sin rutas lo dice y deja añadir', () => {
    const p = montar();
    expect(p.texto()).toContain('Todavía no habéis añadido ninguna ruta');
    p.boton('Añadir una ruta').click();
    p.fixture.detectChanges();
    expect(p.tarjetas()).toBe(1);
  });

  it('avisa de la ruta sin salida o sin destino, que no se publicaría', () => {
    const p = montar();
    p.boton('Añadir una ruta').click();
    p.fixture.detectChanges();

    expect(p.texto()).toContain('1 ruta(s) sin salida o sin destino');
    expect(p.texto()).toContain('Falta la salida o el destino');
  });

  it('guarda solo lo publicable: lo incompleto se queda fuera', async () => {
    const p = montar([IDA]);
    p.boton('Añadir una ruta').click();
    p.fixture.detectChanges();
    expect(p.tarjetas()).toBe(2);

    p.boton('Guardar').click();
    await p.fixture.whenStable();

    expect(p.guardados).toHaveLength(1);
    expect(p.guardados[0]?.map((r) => r.id)).toEqual(['r1']);
  });

  it('al guardar enseña el check que gira y después «Guardado»', async () => {
    const p = montar([IDA]);
    expect(p.texto()).not.toContain('Guardado');
    expect(p.boton('Guardar').querySelector('np-icon')).not.toBeNull();

    p.boton('Guardar').click();
    p.fixture.detectChanges();
    expect(p.boton('Guardar').hasAttribute('data-loading')).toBe(true);

    await p.fixture.whenStable();
    p.fixture.detectChanges();
    expect(p.boton('Guardar').hasAttribute('data-loading')).toBe(false);
    expect(p.texto()).toContain('Guardado');
  });

  it('una ruta nueva completa se guarda con lo escrito', async () => {
    const p = montar();
    p.boton('Añadir una ruta').click();
    p.fixture.detectChanges();

    const [salida, destino] = [...p.raiz.querySelectorAll<HTMLInputElement>('input[type="text"]')]
      .filter((i) => i.closest('label')?.textContent?.match(/Sale de|Va a/))
      .map((i) => i);
    for (const [campo, valor] of [
      [salida, 'Plaza de Armas'],
      [destino, 'Finca Los Olmos'],
    ] as const) {
      campo!.value = valor;
      campo!.dispatchEvent(new Event('input'));
    }
    p.fixture.detectChanges();
    p.escribir('input[type="time"]', '16:15');

    p.boton('Guardar').click();
    await p.fixture.whenStable();

    expect(p.guardados[0]).toMatchObject([
      { sentido: 'ida', salida: 'Plaza de Armas', destino: 'Finca Los Olmos', hora: '16:15' },
    ]);
  });

  it('quitar una ruta la saca de la lista', () => {
    const p = montar([IDA]);
    p.boton('Eliminar').click();
    p.fixture.detectChanges();
    expect(p.tarjetas()).toBe(0);
  });
});
