import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { provideIconSprite } from '../../../design-system/icons/icon-sprite.providers';
import { NpCronologiaPublica } from './cronologia-publica';
import type { HitoPublico } from './cronologia';

/**
 * La cronología, como la mira el invitado.
 *
 * Lo que se vigila:
 *
 * 1. **Que la hora esté y se lea**, que es la única pregunta que trae.
 * 2. **Que la madrugada vaya al final.** Una boda que empieza a las cinco de
 *    la tarde acaba a las cinco de la mañana, y «04:00» no es antes que
 *    «17:00». Si esto se rompe, la cronología miente.
 * 3. **Que sin cronología no quede un hueco en blanco** en la web.
 */

const ES = JSON.parse(readFileSync('public/i18n/es.json', 'utf8')) as Record<string, unknown>;

function hito(id: string, time: string, parcial: Partial<HitoPublico> = {}): HitoPublico {
  return {
    id,
    time,
    endTime: null,
    title: `Hito ${id}`,
    description: '',
    icon: 'clock',
    color: 'rosa',
    order: 1,
    ...parcial,
  };
}

async function montar(cronologia: readonly HitoPublico[]) {
  TestBed.configureTestingModule({
    imports: [
      TranslocoTestingModule.forRoot({
        langs: { es: ES },
        translocoConfig: { availableLangs: ['es'], defaultLang: 'es' },
      }),
    ],
    providers: [provideIconSprite('public')],
  });

  const fixture = TestBed.createComponent(NpCronologiaPublica);
  fixture.componentRef.setInput('cronologia', cronologia);
  fixture.detectChanges();

  const raiz = fixture.nativeElement as HTMLElement;
  return { fixture, raiz, texto: () => raiz.textContent?.replace(/\s+/g, ' ') ?? '' };
}

describe('la cronología en la web', () => {
  it('pinta cada hito con su hora', async () => {
    const p = await montar([
      hito('ceremonia', '17:00', { title: 'Ceremonia', description: 'En la ermita' }),
    ]);

    expect([...p.raiz.querySelectorAll('time')].map((t) => t.textContent)).toEqual(['17:00']);
    expect(p.texto()).toContain('Ceremonia');
    expect(p.texto()).toContain('En la ermita');
  });

  it('dice hasta cuándo dura, si lo saben', async () => {
    const p = await montar([hito('coctel', '19:00', { endTime: '21:00' })]);

    expect(p.texto()).toContain('hasta las 21:00');
  });

  /** El detalle que decide si esto sirve: la boda acaba de madrugada. */
  it('la madrugada va al final, no al principio', async () => {
    const p = await montar([
      hito('fin', '04:00', { title: 'Fin de fiesta' }),
      hito('ceremonia', '17:00', { title: 'Ceremonia' }),
      hito('baile', '23:30', { title: 'Primer baile' }),
    ]);

    expect([...p.raiz.querySelectorAll('.cr__que h3')].map((h) => h.textContent)).toEqual([
      'Ceremonia',
      'Primer baile',
      'Fin de fiesta',
    ]);
  });

  it('sin hitos no deja un hueco en blanco', async () => {
    const p = await montar([]);

    expect(p.texto()).toContain('Muy pronto');
  });

  /** El color sale de la paleta del sistema, nunca inventado. */
  it('cada hito lleva su color de la paleta', async () => {
    const p = await montar([hito('a', '17:00', { color: 'verde' })]);
    const linea = p.raiz.querySelector<HTMLElement>('.cr__hito')!;

    expect(linea.style.getPropertyValue('--cr-color')).toBe('var(--np-cat-verde)');
  });
});
