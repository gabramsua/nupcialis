import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';

import { provideIconSprite } from '../../../design-system/icons/icon-sprite.providers';
import { SessionStore } from '../../../core/auth/session.store';
import {
  PUERTA_UBICACIONES,
  ordenarUbicaciones,
  type DatosUbicacion,
  type PuertaUbicaciones,
  type UbicacionDelPanel,
} from '../../../core/mapa/ubicaciones-gateway';
import { abrirDialogosEnPruebas } from '../invitados/dobles.testing';
import { PanelMapa } from './mapa-panel';
import { NpSelectorDePin } from './selector-de-pin';
import { UbicacionesStore } from './ubicaciones.store';

/**
 * La pantalla del mapa, en el panel.
 *
 * Lo que se vigila:
 *
 * 1. **Que diga cuándo un sitio no sale en el mapa de la web.** Sin pin, sin
 *    nombre o interno: la pareja no puede descubrirlo mirando su propia web.
 * 2. **Que un sitio sin pin se guarde como «sin colocar»**, no con unas
 *    coordenadas inventadas: `0, 0` es el mar de Guinea.
 * 3. **Que subir y bajar renumere del todo**, porque dos fichas con el mismo
 *    `order` no se pueden intercambiar.
 */

beforeAll(abrirDialogosEnPruebas);

const ES = JSON.parse(readFileSync('public/i18n/es.json', 'utf8')) as Record<string, unknown>;

function sitio(parcial: Partial<UbicacionDelPanel> & { id: string }): UbicacionDelPanel {
  return {
    type: 'ceremonia',
    name: `Sitio ${parcial.id}`,
    address: '',
    lat: 40.9481,
    lng: -4.1184,
    description: '',
    time: null,
    order: 1,
    visibleToGuests: true,
    ...parcial,
  };
}

async function montar(ubicaciones: readonly UbicacionDelPanel[]) {
  const guardados: DatosUbicacion[] = [];
  const borrados: string[] = [];

  const doble: PuertaUbicaciones = {
    async listar() {
      return { ok: true, ubicaciones: ordenarUbicaciones(ubicaciones) };
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
      { provide: PUERTA_UBICACIONES, useValue: doble },
      { provide: SessionStore, useValue: { weddingId: () => 'w1' } },
      UbicacionesStore,
    ],
  });

  const fixture = TestBed.createComponent(PanelMapa);
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
    fichas: () => [...raiz.querySelectorAll('.mpn__ficha')],
    boton(dentro: Element, texto: string) {
      return [...dentro.querySelectorAll('button')].find(
        (b) => b.textContent?.includes(texto) || b.getAttribute('aria-label') === texto,
      )!;
    },
    escribir(selector: string, valor: string) {
      const campo = raiz.querySelector(selector) as HTMLInputElement;
      campo.value = valor;
      campo.dispatchEvent(new Event('input'));
      fixture.detectChanges();
    },
    async pulsar(boton: HTMLButtonElement) {
      boton.click();
      await new Promise((listo) => setTimeout(listo, 0));
      fixture.detectChanges();
    },
  };
}

describe('el mapa en el panel', () => {
  it('lista los sitios en el orden de la pareja, con su tipo y su hora', async () => {
    const p = await montar([
      sitio({ id: 'b', name: 'Finca', type: 'banquete', order: 2, time: '20:00' }),
      sitio({ id: 'a', name: 'Iglesia', order: 1, time: '17:30' }),
    ]);

    expect(p.fichas().map((f) => f.querySelector('strong')?.textContent?.trim())).toEqual([
      'Iglesia',
      'Finca',
    ]);
    expect(p.fichas()[0]?.textContent).toContain('Ceremonia');
    expect(p.fichas()[0]?.textContent).toContain('17:30');
    expect(p.fichas()[0]?.textContent).toContain('Sale en la web');
  });

  /** El fallo caro: creer que «dónde es la ceremonia» está publicado y que no lo vea nadie. */
  it('avisa de un sitio sin el pin puesto, y lo dice con texto', async () => {
    const p = await montar([sitio({ id: 'a', lat: null, lng: null })]);

    expect(p.texto()).toContain('Hay sitios sin el pin puesto');
    expect(p.fichas()[0]?.textContent).toContain('Sin pin: no sale en el mapa');
    expect(p.fichas()[0]?.textContent).not.toContain('Sale en la web');
  });

  it('un sitio interno no cuenta como pendiente de pin ni sale en la web', async () => {
    const p = await montar([sitio({ id: 'a', lat: null, lng: null, visibleToGuests: false })]);

    expect(p.texto()).not.toContain('Hay sitios sin el pin puesto');
    expect(p.fichas()[0]?.textContent).toContain('Interno');
    expect(p.fichas()[0]?.className).toContain('mpn__ficha--apagada');
  });

  it('dice que una ficha sin nombre no se publica', async () => {
    const p = await montar([sitio({ id: 'a', name: '' })]);

    expect(p.fichas()[0]?.textContent).toContain('Sin nombre: no se publica');
    expect(p.fichas()[0]?.textContent).not.toContain('Sale en la web');
  });

  it('ocultar a los invitados conserva todo lo demás, pin incluido', async () => {
    const p = await montar([sitio({ id: 'a', name: 'Iglesia', time: '17:30', order: 3 })]);
    await p.pulsar(p.boton(p.fichas()[0]!, 'Ocultar a los invitados'));

    expect(p.guardados).toEqual([
      expect.objectContaining({
        id: 'a',
        name: 'Iglesia',
        time: '17:30',
        order: 3,
        lat: 40.9481,
        lng: -4.1184,
        visibleToGuests: false,
      }),
    ]);
  });

  it('subir renumera la lista entera, también cuando todas tenían el mismo orden', async () => {
    const p = await montar([
      sitio({ id: 'a', order: 0 }),
      sitio({ id: 'b', order: 0 }),
      sitio({ id: 'c', order: 0 }),
    ]);

    await p.pulsar(p.boton(p.fichas()[2]!, 'Subir un puesto'));

    const ordenes = Object.fromEntries(p.guardados.map((g) => [g.id, g.order]));
    expect(ordenes).toEqual({ a: 1, c: 2, b: 3 });
  });

  it('el primero no sube y el último no baja', async () => {
    const p = await montar([sitio({ id: 'a', order: 1 }), sitio({ id: 'b', order: 2 })]);

    expect(p.boton(p.fichas()[0]!, 'Subir un puesto').disabled).toBe(true);
    expect(p.boton(p.fichas()[1]!, 'Bajar un puesto').disabled).toBe(true);
  });

  describe('el formulario', () => {
    it('un sitio nuevo sin pin se guarda sin coordenadas, no con ceros', async () => {
      const p = await montar([]);
      await p.pulsar(p.boton(p.raiz, 'Añadir un sitio'));

      p.escribir('input[formcontrolname="name"]', 'Autobús');
      await p.pulsar(p.boton(p.raiz, 'Guardar'));

      expect(p.guardados[0]).toEqual(
        expect.objectContaining({ id: undefined, name: 'Autobús', lat: null, lng: null, order: 1 }),
      );
    });

    it('el pin que llega del mapa se guarda con el sitio', async () => {
      const p = await montar([]);
      await p.pulsar(p.boton(p.raiz, 'Añadir un sitio'));

      p.escribir('input[formcontrolname="name"]', 'Iglesia');
      const selector = p.fixture.debugElement.query(By.directive(NpSelectorDePin));
      (selector.componentInstance as NpSelectorDePin).elegido.emit({ lat: 40.95, lng: -4.12 });
      p.fixture.detectChanges();
      await p.pulsar(p.boton(p.raiz, 'Guardar'));

      expect(p.guardados[0]).toEqual(expect.objectContaining({ lat: 40.95, lng: -4.12 }));
    });

    /** Un pin en el mar de Guinea es «nadie lo colocó», no «la boda es allí». */
    it('un pin en 0, 0 no se guarda como pin', async () => {
      const p = await montar([]);
      await p.pulsar(p.boton(p.raiz, 'Añadir un sitio'));

      p.escribir('input[formcontrolname="name"]', 'Iglesia');
      const selector = p.fixture.debugElement.query(By.directive(NpSelectorDePin));
      (selector.componentInstance as NpSelectorDePin).elegido.emit({ lat: 0, lng: 0 });
      p.fixture.detectChanges();
      await p.pulsar(p.boton(p.raiz, 'Guardar'));

      expect(p.guardados[0]).toEqual(expect.objectContaining({ lat: null, lng: null }));
    });

    it('una búsqueda rellena la dirección solo si estaba vacía', async () => {
      const p = await montar([]);
      await p.pulsar(p.boton(p.raiz, 'Añadir un sitio'));
      const selector = p.fixture.debugElement.query(By.directive(NpSelectorDePin))
        .componentInstance as NpSelectorDePin;

      selector.elegido.emit({ lat: 40.9, lng: -4.1, direccion: 'Segovia, España' });
      p.fixture.detectChanges();
      expect(
        (p.raiz.querySelector('input[formcontrolname="address"]') as HTMLInputElement).value,
      ).toBe('Segovia, España');

      selector.elegido.emit({ lat: 41, lng: -4, direccion: 'Otro sitio' });
      p.fixture.detectChanges();
      expect(
        (p.raiz.querySelector('input[formcontrolname="address"]') as HTMLInputElement).value,
      ).toBe('Segovia, España');
    });

    it('la hora se guarda como HH:mm o no se guarda', async () => {
      const p = await montar([]);
      await p.pulsar(p.boton(p.raiz, 'Añadir un sitio'));

      p.escribir('input[formcontrolname="name"]', 'Iglesia');
      p.escribir('input[formcontrolname="time"]', '17:30');
      await p.pulsar(p.boton(p.raiz, 'Guardar'));

      expect(p.guardados[0]?.time).toBe('17:30');
    });

    it('no deja guardar sin nombre', async () => {
      const p = await montar([]);
      await p.pulsar(p.boton(p.raiz, 'Añadir un sitio'));

      expect(p.boton(p.raiz, 'Guardar').disabled).toBe(true);
    });
  });

  it('deja de ofrecer «añadir» al llegar al máximo', async () => {
    const muchos = Array.from({ length: 30 }, (_, n) => sitio({ id: `s${n}`, order: n }));
    const p = await montar(muchos);

    expect(p.boton(p.raiz, 'Añadir un sitio').disabled).toBe(true);
    expect(p.texto()).toContain('Habéis llegado al máximo');
  });
});
