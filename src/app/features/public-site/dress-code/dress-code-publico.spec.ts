import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { provideIconSprite } from '../../../design-system/icons/icon-sprite.providers';
import { NpDressCodePublico } from './dress-code-publico';
import { sanearDressCode } from './dress-code';

/**
 * Cómo vestir, como lo abre el invitado.
 *
 * Lo que se vigila:
 *
 * 1. **Que cada muestra lleve su nombre escrito.** Es el requisito del módulo
 *    (§8.11) y lo que hace que sirva a quien no distingue dos verdes.
 * 2. **Que lo que hay que evitar no se confunda con lo que se sugiere.**
 *    Equivocarse es presentarse de blanco a una boda.
 * 3. **Que una muestra nunca salga con un color que no venga de la lista
 *    cerrada**: lo que se pinta es un `background` en línea, y eso solo es
 *    seguro si el valor no puede venir del documento.
 */

const ES = JSON.parse(readFileSync('public/i18n/es.json', 'utf8')) as Record<string, unknown>;

function montar(config: unknown) {
  TestBed.configureTestingModule({
    imports: [
      TranslocoTestingModule.forRoot({
        langs: { es: ES },
        translocoConfig: { availableLangs: ['es'], defaultLang: 'es' },
      }),
    ],
    providers: [provideIconSprite('public')],
  });

  const fixture = TestBed.createComponent(NpDressCodePublico);
  fixture.componentRef.setInput('dressCode', sanearDressCode(config));
  fixture.detectChanges();

  const raiz = fixture.nativeElement as HTMLElement;
  return {
    fixture,
    raiz,
    texto: () => raiz.textContent?.replace(/\s+/g, ' ') ?? '',
    muestras: (selector = '.dc__muestra') => [...raiz.querySelectorAll(selector)],
  };
}

describe('el dress code en la web', () => {
  it('pinta la descripción con su formato', () => {
    const p = montar({ description: '<p>Elegante pero <strong>cómodo</strong>.</p>' });

    expect(p.raiz.querySelector('.np-rico strong')?.textContent).toBe('cómodo');
  });

  /** El requisito del módulo: el color solo no comunica «verde oliva». */
  it('escribe el nombre al lado de cada muestra', () => {
    const p = montar({ suggestedColors: ['verde-salvia', 'beige'] });

    expect(p.texto()).toContain('Verde salvia');
    expect(p.texto()).toContain('Beige');
    expect(p.muestras()).toHaveLength(2);
  });

  it('separa lo que se sugiere de lo que hay que evitar, y lo tacha', () => {
    const p = montar({ suggestedColors: ['beige'], avoidColors: ['blanco'] });

    expect(p.texto()).toContain('Colores que nos encantan');
    expect(p.texto()).toContain('Mejor evitad estos');
    expect(p.muestras('.dc__muestra--evitar')).toHaveLength(1);
    expect(p.raiz.querySelector('.dc__paleta--evitar')?.textContent).toContain('Blanco');
    expect(p.raiz.querySelector('.dc__paleta--evitar')?.textContent).not.toContain('Beige');
  });

  it('enseña los avisos prácticos, que es lo que cambia los zapatos de alguien', () => {
    const p = montar({ tips: ['La ceremonia es sobre hierba.', 'Por la noche refresca.'] });

    expect(p.raiz.querySelectorAll('.dc__avisos li')).toHaveLength(2);
    expect(p.texto()).toContain('La ceremonia es sobre hierba.');
  });

  /**
   * El color se pinta como estilo en línea, así que esto es lo que impide que
   * un valor del documento acabe dentro de un atributo `style`.
   */
  it('nunca pinta un color que no esté en la lista cerrada', () => {
    const p = montar({ suggestedColors: ['#ff00ff', 'javascript:alert(1)', 'fucsia', 'beige'] });

    const fondos = p.muestras().map((m) => (m as HTMLElement).style.background);
    expect(fondos).toHaveLength(1);
    expect(fondos[0]).toContain('226, 211, 187');
  });

  it('sin nada que decir, lo dice en vez de dejar el hueco', () => {
    const p = montar({});

    expect(p.texto()).toContain('Muy pronto os diremos cómo vestir');
    expect(p.muestras()).toHaveLength(0);
  });

  /** Lo mismo que una boda recién creada: el módulo encendido y nada escrito. */
  it('aguanta un documento a medio escribir', () => {
    const p = montar('esto no es una configuración');

    expect(p.texto()).toContain('Muy pronto os diremos cómo vestir');
  });
});
