import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { provideIconSprite } from '../../../design-system/icons/icon-sprite.providers';
import { BodaStore } from '../boda.store';
import { BODA_DE_PRUEBA } from '../boda.testing';
import type { DressCodeParaGuardar } from '../boda.firestore';
import { sanearDressCode } from '../../public-site/dress-code/dress-code';
import { PanelDressCode } from './dress-code';

/**
 * Cómo vestir, en el panel.
 *
 * Lo que se vigila, por orden de lo que costaría si se rompe:
 *
 * 1. **Que se guarden ids y no hexadecimales.** Es lo que garantiza que toda
 *    muestra de la web tenga nombre y que no viaje un color del cliente a un
 *    atributo de estilo.
 * 2. **Que avise del color que está en las dos listas**, que es la única
 *    contradicción que el invitado no puede resolver por su cuenta.
 * 3. **Que lo ya guardado salga en la pantalla** cuando la boda llega, porque
 *    la boda se carga después de que la pantalla se monte.
 */

const ES = JSON.parse(readFileSync('public/i18n/es.json', 'utf8')) as Record<string, unknown>;

function montar(config: unknown = {}) {
  const guardados: DressCodeParaGuardar[] = [];
  const boda = signal<typeof BODA_DE_PRUEBA | null>(null);

  const store = {
    boda,
    error: () => null,
    async guardarDressCode(dress: DressCodeParaGuardar) {
      guardados.push(dress);
      return true;
    },
  };

  TestBed.configureTestingModule({
    imports: [
      TranslocoTestingModule.forRoot({
        langs: { es: ES },
        translocoConfig: { availableLangs: ['es'], defaultLang: 'es' },
      }),
    ],
    providers: [provideIconSprite('panel'), { provide: BodaStore, useValue: store }],
  });

  const fixture = TestBed.createComponent(PanelDressCode);
  fixture.detectChanges();

  // La boda llega después, como en el panel de verdad.
  boda.set({ ...BODA_DE_PRUEBA, dressCode: sanearDressCode(config) });
  fixture.detectChanges();

  const raiz = fixture.nativeElement as HTMLElement;

  const colores = (lista: 'sugeridos' | 'evitar') => {
    const seccion = [...raiz.querySelectorAll('.dc__paleta')][
      lista === 'sugeridos' ? 0 : 1
    ] as HTMLElement;
    return [...seccion.querySelectorAll('.dc__color')] as HTMLButtonElement[];
  };

  return {
    fixture,
    raiz,
    guardados,
    texto: () => raiz.textContent?.replace(/\s+/g, ' ') ?? '',
    colores,
    color(lista: 'sugeridos' | 'evitar', nombre: string) {
      return colores(lista).find((boton) => boton.textContent?.includes(nombre))!;
    },
    puestos(lista: 'sugeridos' | 'evitar') {
      return colores(lista)
        .filter((boton) => boton.getAttribute('aria-pressed') === 'true')
        .map((boton) => boton.textContent?.trim());
    },
    pulsar(boton: HTMLButtonElement) {
      boton.click();
      fixture.detectChanges();
    },
    boton(texto: string) {
      return [...raiz.querySelectorAll('button')].find((b) =>
        b.textContent?.includes(texto),
      ) as HTMLButtonElement;
    },
  };
}

describe('el dress code en el panel', () => {
  /** La boda se carga después de que la pantalla se monte. */
  it('rellena los campos con lo que ya estaba guardado', () => {
    const p = montar({
      suggestedColors: ['beige', 'verde-salvia'],
      avoidColors: ['blanco'],
      tips: ['Hay hierba'],
    });

    expect(p.puestos('sugeridos')).toEqual(['Beige', 'Verde salvia']);
    expect(p.puestos('evitar')).toEqual(['Blanco']);
    expect(
      [...p.raiz.querySelectorAll<HTMLInputElement>('.dc__tips-lista input')].map((i) => i.value),
    ).toEqual(['Hay hierba']);
  });

  /**
   * Las dos paletas van plegadas: desplegadas son sesenta filas y en un móvil
   * la pantalla medía dos mil píxeles. Lo que no puede quedarse escondido es
   * **lo elegido**, que es la información de la pantalla.
   */
  it('con la paleta plegada, el resumen dice qué colores hay puestos', () => {
    const p = montar({ suggestedColors: ['beige', 'verde-salvia'], avoidColors: [] });

    const resumen = p.raiz.querySelector('details summary')?.textContent ?? '';
    expect(resumen).toContain('Beige');
    expect(resumen).toContain('Verde salvia');
    expect(resumen).toContain('2 de 8');

    const vacia = [...p.raiz.querySelectorAll('details summary')][1]?.textContent ?? '';
    expect(vacia).toContain('Ninguno todavía');
  });

  it('cada muestra lleva su nombre escrito', () => {
    const p = montar();

    expect(p.texto()).toContain('Verde oliva');
    expect(p.texto()).toContain('Rosa palo');
    expect(p.colores('sugeridos').length).toBeGreaterThan(20);
  });

  it('al guardar enseña el check que gira y después «Guardado»', async () => {
    const p = montar();
    expect(p.texto()).not.toContain('Guardado');
    expect(p.boton('Guardar').querySelector('np-icon')).not.toBeNull();

    p.pulsar(p.boton('Guardar'));
    expect(p.boton('Guardar').hasAttribute('data-loading')).toBe(true);

    await p.fixture.whenStable();
    p.fixture.detectChanges();
    expect(p.boton('Guardar').hasAttribute('data-loading')).toBe(false);
    expect(p.texto()).toContain('Guardado');
  });

  /** Lo que de verdad sostiene el módulo: se guardan ids, no colores. */
  it('guarda ids de la lista cerrada, no hexadecimales', async () => {
    const p = montar();
    p.pulsar(p.color('sugeridos', 'Verde salvia'));
    p.pulsar(p.color('evitar', 'Blanco'));
    p.pulsar(p.boton('Guardar'));
    await Promise.resolve();

    expect(p.guardados).toEqual([
      {
        description: '',
        suggestedColors: ['verde-salvia'],
        avoidColors: ['blanco'],
        tips: [],
      },
    ]);
  });

  it('volver a pulsar un color lo quita', () => {
    const p = montar({ suggestedColors: ['beige'] });
    p.pulsar(p.color('sugeridos', 'Beige'));

    expect(p.puestos('sugeridos')).toEqual([]);
  });

  /** «Poneos verde oliva» y «evitad el verde oliva» en la misma página. */
  it('avisa del color que está en las dos listas', () => {
    const p = montar({ suggestedColors: ['verde-oliva'], avoidColors: ['verde-oliva'] });

    expect(p.texto()).toContain('«Verde oliva» está en las dos listas');
  });

  it('avisa cuando no hay nada escrito, que es la sección con el título solo', () => {
    const p = montar();

    expect(p.texto()).toContain('Todavía no hay nada escrito');
  });

  it('con algo escrito ya no avisa', () => {
    const p = montar({ suggestedColors: ['beige'] });

    expect(p.texto()).not.toContain('Todavía no hay nada escrito');
  });

  describe('los avisos prácticos', () => {
    it('se añaden, se escriben y se quitan', async () => {
      const p = montar();
      p.pulsar(p.boton('Añadir un aviso'));

      const campo = p.raiz.querySelector('.dc__tips-lista input') as HTMLInputElement;
      campo.value = 'La ceremonia es sobre hierba';
      campo.dispatchEvent(new Event('input'));
      p.fixture.detectChanges();

      p.pulsar(p.boton('Guardar'));
      await Promise.resolve();

      expect(p.guardados[0]?.tips).toEqual(['La ceremonia es sobre hierba']);
    });

    /** Un aviso en blanco no es un aviso. */
    it('no guarda los que se quedan vacíos', async () => {
      const p = montar({ tips: ['Hay hierba'] });
      p.pulsar(p.boton('Añadir un aviso'));
      p.pulsar(p.boton('Guardar'));
      await Promise.resolve();

      expect(p.guardados[0]?.tips).toEqual(['Hay hierba']);
    });
  });

  it('al llegar al tope, los demás colores dejan de poder pulsarse', () => {
    const p = montar({
      suggestedColors: [
        'blanco',
        'marfil',
        'beige',
        'arena',
        'camel',
        'marron',
        'chocolate',
        'negro',
      ],
    });

    expect(p.puestos('sugeridos')).toHaveLength(8);
    expect(p.color('sugeridos', 'Verde oliva').disabled).toBe(true);
    // El que ya está puesto se sigue pudiendo quitar: si no, no habría salida.
    expect(p.color('sugeridos', 'Beige').disabled).toBe(false);
    expect(p.texto()).toContain('8 de 8');
  });
});
