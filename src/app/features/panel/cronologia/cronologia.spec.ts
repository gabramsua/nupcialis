import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';

import { provideIconSprite } from '../../../design-system/icons/icon-sprite.providers';
import { SessionStore } from '../../../core/auth/session.store';
import {
  PUERTA_CRONOLOGIA,
  type DatosHito,
  type HitoDelPanel,
  type PuertaCronologia,
} from '../../../core/cronologia/cronologia-gateway';
import { ordenarHitos } from '../../../core/firebase/cronologia-gateway.firestore';
import { abrirDialogosEnPruebas } from '../invitados/dobles.testing';
import { PanelCronologia } from './cronologia';
import { CronologiaStore } from './cronologia.store';

/**
 * La pantalla donde la pareja monta el día.
 *
 * Lo que se vigila, por orden de lo que costaría si se rompe:
 *
 * 1. **Que lo interno se distinga de lo público.** Confundirlos es publicar la
 *    hora a la que llega el fotógrafo.
 * 2. **Que los avisos de solape y hueco salgan** con los nombres de los hitos:
 *    son lo único que la pareja no puede ver mirando la lista.
 * 3. **Que la madrugada se ordene al final**, porque una boda acaba a las
 *    cinco de la mañana.
 */

beforeAll(abrirDialogosEnPruebas);

const ES = JSON.parse(readFileSync('public/i18n/es.json', 'utf8')) as Record<string, unknown>;

function hito(parcial: Partial<HitoDelPanel> & { id: string }): HitoDelPanel {
  return {
    time: '17:00',
    endTime: null,
    title: `Hito ${parcial.id}`,
    description: '',
    icon: 'clock',
    color: 'rosa',
    order: 1,
    visibleToGuests: true,
    ...parcial,
  };
}

async function montar(hitos: readonly HitoDelPanel[]) {
  const guardados: DatosHito[] = [];
  const borrados: string[] = [];

  const doble: PuertaCronologia = {
    async listar() {
      return { ok: true, hitos: ordenarHitos(hitos) };
    },
    async guardar(_weddingId, datos) {
      guardados.push(datos);
      return { ok: true };
    },
    async borrar(_weddingId, id) {
      borrados.push(id);
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
      provideIconSprite('panel'),
      { provide: PUERTA_CRONOLOGIA, useValue: doble },
      { provide: SessionStore, useValue: { weddingId: () => 'w1' } },
      CronologiaStore,
    ],
  });

  const fixture = TestBed.createComponent(PanelCronologia);
  fixture.detectChanges();
  await new Promise((listo) => setTimeout(listo, 0));
  fixture.detectChanges();

  const raiz = fixture.nativeElement as HTMLElement;

  return {
    fixture,
    raiz,
    guardados,
    borrados,
    texto: () => raiz.textContent?.replace(/\s+/g, ' ') ?? '',
    fichas: () => [...raiz.querySelectorAll('.cr__ficha')],
    boton(dentro: Element, texto: string) {
      return [...dentro.querySelectorAll('button')].find((b) => b.textContent?.includes(texto))!;
    },
    async pulsar(boton: HTMLButtonElement) {
      boton.click();
      await new Promise((listo) => setTimeout(listo, 0));
      fixture.detectChanges();
    },
  };
}

describe('la cronología en el panel', () => {
  /** Una boda que empieza a las cinco de la tarde acaba a las cinco de la mañana. */
  it('ordena el día contando la madrugada al final', async () => {
    const p = await montar([
      hito({ id: 'fin', time: '04:00', title: 'Fin de fiesta' }),
      hito({ id: 'ceremonia', time: '17:00', title: 'Ceremonia' }),
      hito({ id: 'baile', time: '23:30', title: 'Primer baile' }),
    ]);

    expect(p.fichas().map((f) => f.querySelector('.cr__titulo')?.textContent)).toEqual([
      'Ceremonia',
      'Primer baile',
      'Fin de fiesta',
    ]);
  });

  /** Confundirlos es publicar la hora a la que llega el fotógrafo. */
  it('marca lo interno y lo distingue de lo que ve el invitado', async () => {
    const p = await montar([
      hito({ id: 'montaje', title: 'Llega el fotógrafo', visibleToGuests: false }),
      hito({ id: 'ceremonia', time: '18:00', title: 'Ceremonia' }),
    ]);

    expect(p.fichas()[0]?.textContent).toContain('Solo para vosotros');
    expect(p.fichas()[0]?.className).toContain('cr__ficha--interna');
    expect(p.fichas()[1]?.textContent).not.toContain('Solo para vosotros');
  });

  it('pasar un hito a interno conserva todo lo demás', async () => {
    const p = await montar([
      hito({ id: 'ceremonia', title: 'Ceremonia', time: '17:00', endTime: '17:45', order: 2 }),
    ]);
    await p.pulsar(p.boton(p.fichas()[0]!, 'Quitar de la web'));

    expect(p.guardados).toEqual([
      {
        id: 'ceremonia',
        title: 'Ceremonia',
        time: '17:00',
        endTime: '17:45',
        description: '',
        icon: 'clock',
        color: 'rosa',
        order: 2,
        visibleToGuests: false,
      },
    ]);
  });

  it('avisa de dos cosas que se pisan, con sus nombres', async () => {
    const p = await montar([
      hito({ id: 'coctel', title: 'Cóctel', time: '19:00', endTime: '21:00' }),
      hito({ id: 'fotos', title: 'Fotos de grupo', time: '20:00' }),
    ]);

    expect(p.texto()).toContain('«Cóctel» y «Fotos de grupo» se pisan');
  });

  it('avisa del rato largo en que no pasa nada, en horas y minutos', async () => {
    const p = await montar([
      hito({ id: 'ceremonia', title: 'Ceremonia', time: '17:00', endTime: '17:45' }),
      hito({ id: 'cena', title: 'Banquete', time: '21:00' }),
    ]);

    expect(p.texto()).toContain('3 h 15 min sin nada');
  });

  /** Una boda normal no tiene por qué recibir avisos. */
  it('una cronología razonable no inventa avisos', async () => {
    const p = await montar([
      hito({ id: 'ceremonia', title: 'Ceremonia', time: '17:00', endTime: '18:00' }),
      hito({ id: 'coctel', title: 'Cóctel', time: '18:30', endTime: '20:00' }),
      hito({ id: 'cena', title: 'Banquete', time: '20:30' }),
    ]);

    expect(p.texto()).not.toContain('se pisan');
    expect(p.texto()).not.toContain('sin nada');
  });

  /** El solape entre el montaje y la ceremonia es justo el error que hay que cazar. */
  it('los avisos miran también lo interno', async () => {
    const p = await montar([
      hito({
        id: 'montaje',
        title: 'Montaje',
        time: '16:00',
        endTime: '18:00',
        visibleToGuests: false,
      }),
      hito({ id: 'ceremonia', title: 'Ceremonia', time: '17:00' }),
    ]);

    expect(p.texto()).toContain('«Montaje» y «Ceremonia» se pisan');
  });

  it('un hito sin hora se ve, pero dice que no se publica', async () => {
    const p = await montar([hito({ id: 'recena', title: 'Recena', time: '' })]);

    expect(p.texto()).toContain('Sin hora: no se publica');
  });

  it('borra después de confirmar', async () => {
    const p = await montar([hito({ id: 'ceremonia', title: 'Ceremonia' })]);
    await p.pulsar(p.boton(p.fichas()[0]!, 'Eliminar'));

    const modal = p.raiz.querySelector('np-modal')!;
    expect(modal.textContent).toContain('¿Borrar «Ceremonia»?');

    const acciones = [...modal.querySelectorAll<HTMLButtonElement>('[np-modal-actions] button')];
    await p.pulsar(acciones.find((b) => b.textContent?.includes('Eliminar'))!);

    expect(p.borrados).toEqual(['ceremonia']);
  });

  it('sin nada en la cronología, propone por dónde empezar', async () => {
    const p = await montar([]);

    expect(p.texto()).toContain('Todavía no hay nada');
    expect(p.texto()).toContain('el primer baile');
  });
});
