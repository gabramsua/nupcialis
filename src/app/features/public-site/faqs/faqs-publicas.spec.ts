import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { provideIconSprite } from '../../../design-system/icons/icon-sprite.providers';
import { NpFaqsPublicas } from './faqs-publicas';
import { FAQS_PARA_BUSCADOR, type FaqPublica } from './faqs';

/**
 * Las preguntas frecuentes, como las ve el invitado.
 *
 * Lo que se vigila:
 *
 * 1. **Que la respuesta se pinte con su formato** y no con las etiquetas a la
 *    vista: llega como HTML ya saneado del servidor.
 * 2. **Que estén plegadas con `<details>`**, que funciona sin JavaScript y con
 *    teclado. El invitado abre esto de pie en la calle.
 * 3. **Que el buscador solo salga cuando hay muchas**, y que filtre.
 */

const ES = JSON.parse(readFileSync('public/i18n/es.json', 'utf8')) as Record<string, unknown>;

function faq(id: string, parcial: Partial<FaqPublica> = {}): FaqPublica {
  return {
    id,
    question: `¿Pregunta ${id}?`,
    answer: `<p>Respuesta ${id}</p>`,
    category: 'General',
    icon: 'question',
    order: 1,
    ...parcial,
  };
}

async function montar(faqs: readonly FaqPublica[]) {
  TestBed.configureTestingModule({
    imports: [
      TranslocoTestingModule.forRoot({
        langs: { es: ES },
        translocoConfig: { availableLangs: ['es'], defaultLang: 'es' },
      }),
    ],
    providers: [provideIconSprite('public')],
  });

  const fixture = TestBed.createComponent(NpFaqsPublicas);
  fixture.componentRef.setInput('faqs', faqs);
  fixture.detectChanges();

  const raiz = fixture.nativeElement as HTMLElement;
  return { fixture, raiz, texto: () => raiz.textContent?.replace(/\s+/g, ' ') ?? '' };
}

describe('las preguntas frecuentes en la web', () => {
  it('pinta cada pregunta plegada, con su respuesta con formato', async () => {
    const p = await montar([faq('bus', { answer: '<p>Sale a las <strong>17:00</strong></p>' })]);

    expect(p.raiz.querySelectorAll('details')).toHaveLength(1);
    expect(p.raiz.querySelector('summary')?.textContent).toContain('¿Pregunta bus?');
    expect(p.raiz.querySelector('details strong')?.textContent).toBe('17:00');
    expect(p.texto()).not.toContain('<strong>');
  });

  it('agrupa por categoría y enseña el nombre del grupo', async () => {
    const p = await montar([
      faq('a', { category: 'Cómo llegar' }),
      faq('b', { category: 'El día' }),
    ]);

    expect([...p.raiz.querySelectorAll('h3')].map((h) => h.textContent)).toEqual([
      'Cómo llegar',
      'El día',
    ]);
  });

  /** Las que no tienen categoría no inventan un título vacío. */
  it('sin categoría no pinta encabezado', async () => {
    const p = await montar([faq('a', { category: '' })]);

    expect(p.raiz.querySelectorAll('h3')).toHaveLength(0);
    expect(p.raiz.querySelectorAll('details')).toHaveLength(1);
  });

  /** Con seis preguntas delante, un buscador es un trasto. */
  it('el buscador no sale con pocas preguntas', async () => {
    const p = await montar([faq('a'), faq('b')]);

    expect(p.raiz.querySelector('input[type="search"]')).toBeNull();
  });

  it('con muchas sale, y filtra', async () => {
    const muchas = Array.from({ length: FAQS_PARA_BUSCADOR + 2 }, (_, i) => faq(`f${i}`));
    muchas.push(faq('bus', { question: '¿Habrá autobús?' }));
    const p = await montar(muchas);

    const buscador = p.raiz.querySelector<HTMLInputElement>('input[type="search"]')!;
    buscador.value = 'autobus';
    buscador.dispatchEvent(new Event('input'));
    p.fixture.detectChanges();

    expect(p.raiz.querySelectorAll('details')).toHaveLength(1);
    expect(p.texto()).toContain('¿Habrá autobús?');
  });

  it('cuando la búsqueda no encuentra nada, lo dice', async () => {
    const muchas = Array.from({ length: FAQS_PARA_BUSCADOR + 2 }, (_, i) => faq(`f${i}`));
    const p = await montar(muchas);

    const buscador = p.raiz.querySelector<HTMLInputElement>('input[type="search"]')!;
    buscador.value = 'paracaidismo';
    buscador.dispatchEvent(new Event('input'));
    p.fixture.detectChanges();

    expect(p.texto()).toContain('No encontramos ninguna pregunta');
  });
});
