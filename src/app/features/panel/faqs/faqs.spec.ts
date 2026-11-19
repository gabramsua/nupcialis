import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';

import { provideIconSprite } from '../../../design-system/icons/icon-sprite.providers';
import { SessionStore } from '../../../core/auth/session.store';
import {
  PUERTA_FAQS,
  type DatosFaq,
  type FaqDelPanel,
  type PuertaFaqs,
} from '../../../core/faqs/faqs-gateway';
import { abrirDialogosEnPruebas } from '../invitados/dobles.testing';
import { PanelFaqs } from './faqs';
import { FaqsStore } from './faqs.store';

/**
 * La pantalla donde la pareja contesta las preguntas.
 *
 * Lo que se vigila:
 *
 * 1. **Que se vea cuáles están a medias.** La boda nace con siete preguntas
 *    sin respuesta y esas no se publican; si la pantalla no lo dijera, la
 *    pareja creería que su web ya las enseña.
 * 2. **Que apagar conserve lo escrito**, que es la alternativa a borrar.
 * 3. **Que el orden se escriba entero**, no un índice.
 */

beforeAll(abrirDialogosEnPruebas);

const ES = JSON.parse(readFileSync('public/i18n/es.json', 'utf8')) as Record<string, unknown>;

function faq(parcial: Partial<FaqDelPanel> & { id: string }): FaqDelPanel {
  return {
    question: `¿${parcial.id}?`,
    answer: '<p>Respuesta</p>',
    category: 'General',
    icon: 'question',
    order: 1,
    enabled: true,
    ...parcial,
  };
}

function puerta(faqs: readonly FaqDelPanel[]) {
  const guardadas: DatosFaq[] = [];
  const borradas: string[] = [];
  const ordenes: readonly string[][] = [];
  const reordenes: string[][] = [];

  const doble: PuertaFaqs = {
    async listar() {
      return { ok: true, faqs };
    },
    async guardar(_weddingId, datos) {
      guardadas.push(datos);
      return { ok: true };
    },
    async borrar(_weddingId, id) {
      borradas.push(id);
      return { ok: true };
    },
    async reordenar(_weddingId, ids) {
      reordenes.push([...ids]);
      return { ok: true };
    },
  };

  return { doble, guardadas, borradas, reordenes, ordenes };
}

function vaciarCola(): Promise<void> {
  return new Promise((listo) => setTimeout(listo, 0));
}

async function montar(faqs: readonly FaqDelPanel[]) {
  const p = puerta(faqs);

  TestBed.configureTestingModule({
    imports: [
      TranslocoTestingModule.forRoot({
        langs: { es: ES },
        translocoConfig: { availableLangs: ['es'], defaultLang: 'es' },
      }),
    ],
    providers: [
      provideIconSprite('panel'),
      { provide: PUERTA_FAQS, useValue: p.doble },
      { provide: SessionStore, useValue: { weddingId: () => 'w1' } },
      FaqsStore,
    ],
  });

  const fixture = TestBed.createComponent(PanelFaqs);
  fixture.detectChanges();
  await vaciarCola();
  fixture.detectChanges();

  const raiz = fixture.nativeElement as HTMLElement;

  return {
    fixture,
    raiz,
    puerta: p,
    texto: () => raiz.textContent?.replace(/\s+/g, ' ') ?? '',
    fichas: () => [...raiz.querySelectorAll('.fq__ficha')],
    boton(dentro: Element, texto: string) {
      return [...dentro.querySelectorAll('button')].find((b) => b.textContent?.includes(texto))!;
    },
    async pulsar(boton: HTMLButtonElement) {
      boton.click();
      await vaciarCola();
      fixture.detectChanges();
    },
  };
}

describe('la pantalla de preguntas frecuentes', () => {
  it('enseña las preguntas en su orden', async () => {
    const p = await montar([
      faq({ id: 'parking', question: '¿Hay aparcamiento?', order: 1 }),
      faq({ id: 'bus', question: '¿Habrá autobús?', order: 2 }),
    ]);

    expect(p.fichas().map((f) => f.querySelector('.fq__pregunta')?.textContent?.trim())).toEqual([
      '¿Hay aparcamiento?',
      '¿Habrá autobús?',
    ]);
  });

  /** El motivo de esta pantalla: la boda nace con siete sin contestar. */
  it('avisa de las que están sin contestar y no se publican', async () => {
    const p = await montar([
      faq({ id: 'parking', answer: '<p>Sí</p>' }),
      faq({ id: 'bus', answer: '' }),
      faq({ id: 'ninos', answer: '<p><br></p>' }),
    ]);

    expect(p.texto()).toContain('2 preguntas todavía no tienen respuesta');
    expect(p.fichas()[1]?.textContent).toContain('Sin contestar');
    expect(p.fichas()[0]?.textContent).not.toContain('Sin contestar');
  });

  it('cuando están todas contestadas no avisa de nada', async () => {
    const p = await montar([faq({ id: 'parking' })]);

    expect(p.texto()).not.toContain('todavía no tienen respuesta');
  });

  /** Apagar es la alternativa a borrar: conserva lo escrito. */
  it('apagar una pregunta conserva todo lo demás', async () => {
    const p = await montar([faq({ id: 'parking', question: '¿Hay aparcamiento?', order: 3 })]);
    await p.pulsar(p.boton(p.fichas()[0]!, 'Desactivar'));

    expect(p.puerta.guardadas).toEqual([
      {
        id: 'parking',
        question: '¿Hay aparcamiento?',
        answer: '<p>Respuesta</p>',
        category: 'General',
        icon: 'question',
        order: 3,
        enabled: false,
      },
    ]);
  });

  it('reordenar manda la lista entera, no un índice', async () => {
    const p = await montar([
      faq({ id: 'parking', order: 1 }),
      faq({ id: 'bus', order: 2 }),
      faq({ id: 'ninos', order: 3 }),
    ]);

    // El botón de subir de la última.
    await p.pulsar(p.fichas()[2]!.querySelectorAll<HTMLButtonElement>('button')[0]!);

    expect(p.puerta.reordenes).toEqual([['parking', 'ninos', 'bus']]);
  });

  it('la primera no se puede subir y la última no se puede bajar', async () => {
    const p = await montar([faq({ id: 'a' }), faq({ id: 'b', order: 2 })]);
    const primera = p.fichas()[0]!.querySelectorAll<HTMLButtonElement>('button');
    const ultima = p.fichas()[1]!.querySelectorAll<HTMLButtonElement>('button');

    expect(primera[0]!.disabled).toBe(true);
    expect(ultima[1]!.disabled).toBe(true);
  });

  it('borra después de confirmar, y ofrece desactivar en su lugar', async () => {
    const p = await montar([faq({ id: 'parking', question: '¿Hay aparcamiento?' })]);
    await p.pulsar(p.boton(p.fichas()[0]!, 'Eliminar'));

    const modal = p.raiz.querySelector('np-modal')!;
    expect(modal.textContent).toContain('¿Borrar «¿Hay aparcamiento?»?');
    expect(modal.textContent).toContain('desactivadla');

    const acciones = [...modal.querySelectorAll<HTMLButtonElement>('[np-modal-actions] button')];
    await p.pulsar(acciones.find((b) => b.textContent?.includes('Eliminar'))!);

    expect(p.puerta.borradas).toEqual(['parking']);
  });

  it('sin preguntas, lo dice y propone las primeras', async () => {
    const p = await montar([]);

    expect(p.texto()).toContain('No hay ninguna pregunta');
    expect(p.texto()).toContain('el parking');
  });
});
