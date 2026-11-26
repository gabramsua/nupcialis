import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  PUERTA_RESPUESTAS,
  type PuertaRespuestas,
  type ResultadoRespuestaEnLote,
} from '../../../core/rsvp/respuestas-gateway';
import { provideIconSprite } from '../../../design-system/icons/icon-sprite.providers';
import { NpRespuestaEnLote } from './respuesta-en-lote';

/**
 * Marcar a varios de una vez (F1.8i/j).
 *
 * Lo que se vigila: que **pida confirmar diciendo a cuántos afecta** —cambia el
 * recuento de confirmados, las mesas y el catering—, que mande exactamente los
 * ids que se ven y el estado elegido, y que avise a la lista para recargarse.
 */

const ES = JSON.parse(readFileSync('public/i18n/es.json', 'utf8')) as Record<string, unknown>;

function montar(
  ids: readonly string[],
  resultado: ResultadoRespuestaEnLote = { ok: true, cambiados: ids.length, omitidos: 0 },
) {
  const llamadas: { ids: readonly string[]; estado: string }[] = [];
  let recargas = 0;

  const doble = {
    async leer() {
      return { ok: true as const, datos: { preguntas: [], invitados: [] } };
    },
    async guardar() {
      return { ok: true as const, estado: 'confirmed' as const };
    },
    async guardarEnLote(guestIds: readonly string[], estado: string) {
      llamadas.push({ ids: guestIds, estado });
      return resultado;
    },
  } as PuertaRespuestas;

  TestBed.configureTestingModule({
    imports: [
      TranslocoTestingModule.forRoot({
        langs: { es: ES },
        translocoConfig: { availableLangs: ['es'], defaultLang: 'es' },
      }),
    ],
    providers: [provideIconSprite('panel'), { provide: PUERTA_RESPUESTAS, useValue: doble }],
  });

  const fixture = TestBed.createComponent(NpRespuestaEnLote);
  fixture.componentRef.setInput('ids', ids);
  fixture.componentInstance.hecho.subscribe(() => (recargas += 1));
  fixture.detectChanges();

  const raiz = fixture.nativeElement as HTMLElement;
  const asentar = async () => {
    await new Promise((listo) => setTimeout(listo, 0));
    fixture.detectChanges();
  };
  const boton = (texto: string) =>
    [...raiz.querySelectorAll('button')].find((b) =>
      b.textContent?.includes(texto),
    ) as HTMLButtonElement;

  return {
    raiz,
    llamadas,
    recargas: () => recargas,
    texto: () => raiz.textContent?.replace(/\s+/g, ' ') ?? '',
    async pulsar(texto: string) {
      boton(texto).click();
      await asentar();
    },
  };
}

describe('respuesta en lote', () => {
  it('dice a cuántos afecta en el título', () => {
    const v = montar(['a', 'b', 'c']);
    expect(v.texto()).toContain('a los 3 que estás viendo');
  });

  it('no guarda nada hasta confirmar, y dice a cuántos y qué va a pasar', async () => {
    const v = montar(['a', 'b', 'c']);

    await v.pulsar('Vienen');
    expect(v.llamadas).toEqual([]);
    expect(v.texto()).toContain('¿Marcar a 3 invitados como «viene»?');
    expect(v.texto()).toContain('el recuento de confirmados');
  });

  it('al confirmar manda los ids que se ven y el estado, y avisa para recargar', async () => {
    const v = montar(['a', 'b']);

    await v.pulsar('No vienen');
    await v.pulsar('Sí, marcarlos');

    expect(v.llamadas).toEqual([{ ids: ['a', 'b'], estado: 'declined' }]);
    expect(v.recargas()).toBe(1);
    expect(v.texto()).toContain('Hecho: 2 invitados actualizados.');
  });

  it('cancelar no manda nada', async () => {
    const v = montar(['a']);

    await v.pulsar('Sin contestar');
    await v.pulsar('Cancelar');

    expect(v.llamadas).toEqual([]);
    expect(v.texto()).not.toContain('¿Marcar a');
  });

  it('cuenta los que ya no estaban en la lista', async () => {
    const v = montar(['a', 'b', 'c'], { ok: true, cambiados: 2, omitidos: 1 });

    await v.pulsar('Vienen');
    await v.pulsar('Sí, marcarlos');

    expect(v.texto()).toContain('Hecho: 2 invitados actualizados.');
    expect(v.texto()).toContain('1 ya no estaban en la lista.');
  });

  it('si falla lo dice y no recarga', async () => {
    const v = montar(['a'], { ok: false, fallo: { tipo: 'red' } });

    await v.pulsar('Vienen');
    await v.pulsar('Sí, marcarlos');

    expect(v.texto()).toContain('parece que no hay conexión');
    expect(v.recargas()).toBe(0);
  });
});
