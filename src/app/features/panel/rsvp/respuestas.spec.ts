import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { provideIconSprite } from '../../../design-system/icons/icon-sprite.providers';
import {
  PUERTA_RESPUESTAS,
  type PuertaRespuestas,
  type ResultadoRespuestas,
} from '../../../core/rsvp/respuestas-gateway';
import type { Pregunta } from '../../../core/rsvp/rsvp-gateway';
import { RespuestasRsvp } from './respuestas';

/**
 * Lo que han contestado, como lo lee la pareja.
 *
 * Lo que se vigila, y es el motivo de que esta pantalla exista:
 *
 * 1. **Que los mensajes se lean.** La canción que pidió cada uno y lo que le
 *    escribieron a los novios vivían en `rsvpAnswers` y no se veían en ninguna
 *    parte: ni en la lista, ni en la ficha, ni en la exportación.
 * 2. **Que los menús se cuenten**, que es lo que pregunta el catering.
 * 3. **Que un error no salga como un código del SDK.**
 */

const ES = JSON.parse(readFileSync('public/i18n/es.json', 'utf8')) as Record<string, unknown>;

function pregunta(parcial: Partial<Pregunta> & { id: string }): Pregunta {
  return {
    label: parcial.id,
    helpText: '',
    type: 'text',
    options: [],
    required: false,
    visibleIf: null,
    order: 1,
    ...parcial,
  };
}

const MENU = pregunta({
  id: 'menu',
  label: 'Menú',
  type: 'select',
  order: 1,
  options: [
    { value: 'normal', label: 'Normal' },
    { value: 'vegano', label: 'Vegano' },
  ],
});

const MENSAJE = pregunta({ id: 'mensaje', label: 'Un mensaje para los novios', order: 2 });

const DATOS: ResultadoRespuestas = {
  ok: true,
  datos: {
    preguntas: [MENU, MENSAJE],
    invitados: [
      {
        guestId: 'g1',
        nombre: 'Ana Ruiz',
        mote: 'Anita',
        estado: 'confirmed',
        cuando: '2027-01-10T10:00:00.000Z',
        respuestas: { menu: 'vegano', mensaje: 'Qué ganas de veros, de verdad' },
      },
      {
        guestId: 'g2',
        nombre: 'Borja Gil',
        mote: '',
        estado: 'confirmed',
        cuando: '2027-01-11T10:00:00.000Z',
        respuestas: { menu: 'vegano' },
      },
      {
        guestId: 'g3',
        nombre: 'Carmen Díaz',
        mote: '',
        estado: 'pending',
        cuando: null,
        respuestas: {},
      },
    ],
  },
};

async function montar(resultado: ResultadoRespuestas = DATOS) {
  const doble: PuertaRespuestas = {
    async guardar() {
      return { ok: true as const, estado: 'confirmed' as const };
    },
    async leer() {
      return resultado;
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
      provideRouter([]),
      { provide: PUERTA_RESPUESTAS, useValue: doble },
    ],
  });

  const fixture = TestBed.createComponent(RespuestasRsvp);
  fixture.detectChanges();
  await new Promise((listo) => setTimeout(listo, 0));
  fixture.detectChanges();

  const raiz = fixture.nativeElement as HTMLElement;

  return {
    fixture,
    raiz,
    texto: () => raiz.textContent?.replace(/\s+/g, ' ') ?? '',
  };
}

describe('lo que han contestado', () => {
  it('dice cuántos han contestado de cuántos', async () => {
    expect((await montar()).texto()).toContain('Han contestado 2 de 3 invitados');
  });

  it('cuenta los menús, que es lo que pregunta el catering', async () => {
    const p = await montar();
    const barras = [...p.raiz.querySelectorAll('.rp__barra')].map((b) =>
      b.textContent?.replace(/\s+/g, ' ').trim(),
    );

    expect(barras).toEqual(['Normal 0', 'Vegano 2']);
  });

  /**
   * F1.8h: el número solo no sirve para hacer nada. «Vegano, 23» se convierte
   * en trabajo —avisar al catering, mover una mesa— cuando se sabe quiénes.
   */
  it('al pulsar un recuento salen los nombres, y al volver a pulsar se van', async () => {
    const p = await montar();
    const vegano = [...p.raiz.querySelectorAll<HTMLButtonElement>('.rp__abrir')].find((b) =>
      b.textContent?.includes('Vegano'),
    )!;

    expect(p.texto()).not.toContain('Anita, Borja Gil');

    vegano.click();
    p.fixture.detectChanges();

    expect(p.texto()).toContain('Anita, Borja Gil');
    expect(vegano.getAttribute('aria-expanded')).toBe('true');

    vegano.click();
    p.fixture.detectChanges();

    expect(p.texto()).not.toContain('Anita, Borja Gil');
  });

  /** Una opción que no ha elegido nadie no tiene nada que abrir. */
  it('un recuento a cero no se puede abrir', async () => {
    const p = await montar();
    const normal = [...p.raiz.querySelectorAll<HTMLButtonElement>('.rp__abrir')].find((b) =>
      b.textContent?.includes('Normal'),
    )!;

    expect(normal.disabled).toBe(true);
  });

  /** **El motivo de esta pantalla.** Esto no se veía en ninguna parte. */
  it('se leen los mensajes, con quién lo escribió', async () => {
    const p = await montar();

    expect(p.texto()).toContain('Qué ganas de veros, de verdad');
    expect(p.texto()).toContain('Anita');
  });

  it('cada pregunta dice cuántas respuestas tiene', async () => {
    const p = await montar();
    const preguntas = [...p.raiz.querySelectorAll('.rp__pregunta')];

    expect(preguntas[0]!.textContent).toContain('2 respuestas');
    expect(preguntas[1]!.textContent).toContain('1 respuestas');
  });

  it('respeta el orden de las preguntas', async () => {
    const p = await montar();
    const titulos = [...p.raiz.querySelectorAll('.rp__pregunta h3')].map((h) =>
      h.textContent?.trim(),
    );

    expect(titulos).toEqual(['Menú', 'Un mensaje para los novios']);
  });

  it('sin respuestas todavía, lo dice y explica qué se verá', async () => {
    const p = await montar({
      ok: true,
      datos: {
        preguntas: [MENU],
        invitados: [
          {
            guestId: 'g1',
            nombre: 'Ana',
            mote: '',
            estado: 'pending',
            cuando: null,
            respuestas: {},
          },
        ],
      },
    });

    expect(p.texto()).toContain('Todavía no ha contestado nadie');
    expect(p.raiz.querySelector('.rp__pregunta')).toBeNull();
  });

  /** Ni un código del SDK: ya pasó con un «Unauthenticated [401]». */
  it('un fallo se cuenta en castellano', async () => {
    const p = await montar({ ok: false, fallo: { tipo: 'sin-permiso' } });

    expect(p.texto()).toContain('no tiene permiso');
    expect(p.texto()).not.toContain('permission-denied');
  });

  it('y se puede reintentar', async () => {
    const p = await montar({ ok: false, fallo: { tipo: 'red' } });

    expect(p.raiz.querySelector('button')).not.toBeNull();
  });
});
