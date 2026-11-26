import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';

import { provideIconSprite } from '../../../design-system/icons/icon-sprite.providers';
import { SessionStore } from '../../../core/auth/session.store';
import {
  PUERTA_ALOJAMIENTOS,
  ordenarAlojamientos,
  type AlojamientoDelPanel,
  type DatosAlojamiento,
  type PuertaAlojamientos,
} from '../../../core/alojamientos/alojamientos-gateway';
import { idDeAlojamiento } from '../../../core/firebase/alojamientos-gateway.firestore';
import { abrirDialogosEnPruebas } from '../invitados/dobles.testing';
import { proveerUbicacionesDePrueba } from '../mapa/ubicaciones.testing';
import { PanelAlojamientos } from './alojamientos';
import { AlojamientosStore } from './alojamientos.store';

/**
 * La pantalla de «dónde dormir», en el panel.
 *
 * Lo que se vigila, por orden de lo que costaría si se rompe:
 *
 * 1. **Que avise del plazo vencido.** Es el fallo caro del módulo: el invitado
 *    llama al hotel, el bloqueo ya no existe y la boda queda mal. La pareja no
 *    puede verlo mirando la lista, porque la fecha por sí sola no dice nada.
 * 2. **Que diga cuándo una ficha no se publica.** `sanearAlojamientos` tira lo
 *    que no tiene nombre, y descubrirlo mirando tu propia web es tarde.
 * 3. **Que el teléfono y la web se guarden normalizados**, con las mismas
 *    funciones que usa el servidor: lo que aquí se acepte y allí se caiga es
 *    una ficha que el invitado no puede usar.
 */

beforeAll(abrirDialogosEnPruebas);

const ES = JSON.parse(readFileSync('public/i18n/es.json', 'utf8')) as Record<string, unknown>;

/** Hoy, y dentro de N días, en el formato del campo. */
function enDias(dias: number): string {
  const fecha = new Date();
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  return fecha.toISOString().slice(0, 10);
}

function sitio(parcial: Partial<AlojamientoDelPanel> & { id: string }): AlojamientoDelPanel {
  return {
    name: `Hotel ${parcial.id}`,
    category: 'hotel',
    description: '',
    pricePerNight: null,
    distanceKm: null,
    phone: '+34600000000',
    website: null,
    discountCode: '',
    blockedRooms: null,
    bookingDeadline: null,
    recommended: false,
    locationId: null,
    order: 1,
    enabled: true,
    ...parcial,
  };
}

async function montar(alojamientos: readonly AlojamientoDelPanel[]) {
  const guardados: DatosAlojamiento[] = [];
  const borrados: string[] = [];

  const doble: PuertaAlojamientos = {
    async listar() {
      return { ok: true, alojamientos: ordenarAlojamientos(alojamientos) };
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
      { provide: PUERTA_ALOJAMIENTOS, useValue: doble },
      { provide: SessionStore, useValue: { weddingId: () => 'w1' } },
      AlojamientosStore,
      ...proveerUbicacionesDePrueba(),
    ],
  });

  const fixture = TestBed.createComponent(PanelAlojamientos);
  fixture.detectChanges();
  await new Promise((listo) => setTimeout(listo, 0));
  fixture.detectChanges();

  const raiz = fixture.nativeElement as HTMLElement;

  return {
    fixture,
    raiz,
    guardados,
    borrados,
    async asentar() {
      await new Promise((listo) => setTimeout(listo, 0));
      fixture.detectChanges();
    },
    texto: () => raiz.textContent?.replace(/\s+/g, ' ') ?? '',
    fichas: () => [...raiz.querySelectorAll('.al__ficha')],
    boton(dentro: Element, texto: string) {
      return [...dentro.querySelectorAll('button')].find((b) => b.textContent?.includes(texto))!;
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

describe('los alojamientos en el panel', () => {
  it('pone los recomendados primero, como la web', async () => {
    const p = await montar([
      sitio({ id: 'lejano', name: 'Hotel lejano', order: 1 }),
      sitio({ id: 'bueno', name: 'Hotel bueno', recommended: true, order: 9 }),
    ]);

    expect(p.fichas().map((f) => f.querySelector('strong')?.textContent?.trim())).toEqual([
      'Hotel bueno',
      'Hotel lejano',
    ]);
    expect(p.fichas()[0]?.textContent).toContain('Recomendado');
  });

  /** El fallo caro: el bloqueo venció y nadie se enteró. */
  it('avisa de un plazo vencido, con el nombre del sitio', async () => {
    const p = await montar([
      sitio({ id: 'rural', name: 'Casa del Olmo', blockedRooms: 8, bookingDeadline: enDias(-3) }),
    ]);

    expect(p.texto()).toContain('El plazo de «Casa del Olmo» ya ha vencido');
    expect(p.fichas()[0]?.textContent).toContain('Plazo vencido');
  });

  it('avisa cuando el plazo está a punto de acabarse', async () => {
    const p = await montar([
      sitio({ id: 'rural', name: 'Casa del Olmo', blockedRooms: 8, bookingDeadline: enDias(3) }),
    ]);

    expect(p.texto()).toContain('El plazo de «Casa del Olmo» acaba en 3 días');
  });

  it('avisa de habitaciones bloqueadas sin fecha hasta la que valen', async () => {
    const p = await montar([sitio({ id: 'rural', name: 'Casa del Olmo', blockedRooms: 8 })]);

    expect(p.texto()).toContain('8 habitaciones bloqueadas sin fecha límite');
  });

  /** Sin teléfono ni web la ficha es un nombre: el invitado no puede reservar. */
  it('avisa de un alojamiento con el que no se puede contactar', async () => {
    const p = await montar([sitio({ id: 'x', name: 'Hostal Sin Nada', phone: null })]);

    expect(p.texto()).toContain('«Hostal Sin Nada» no tiene teléfono ni web');
  });

  /** Lo tira `sanearAlojamientos`, y hay que verlo aquí, no en la web. */
  it('dice que una ficha sin nombre no se publica', async () => {
    const p = await montar([sitio({ id: 'x', name: '' })]);

    expect(p.texto()).toContain('Hay una ficha sin nombre');
    expect(p.fichas()[0]?.textContent).toContain('Sin nombre: no se publica');
  });

  /** La sección publicada y vacía es peor que no tenerla. */
  it('avisa cuando todo está apagado', async () => {
    const p = await montar([sitio({ id: 'x', enabled: false })]);

    expect(p.texto()).toContain('Ningún alojamiento está activo');
    expect(p.fichas()[0]?.className).toContain('al__ficha--apagada');
    expect(p.fichas()[0]?.textContent).toContain('No sale en la web');
  });

  it('no avisa de nada cuando la lista está bien', async () => {
    const p = await montar([
      sitio({ id: 'a', name: 'Hotel Centro', pricePerNight: 80, distanceKm: 2 }),
    ]);

    expect(p.texto()).not.toContain('Repasad esto');
    expect(p.fichas()[0]?.textContent).toContain('Desde 80 € la noche');
    expect(p.fichas()[0]?.textContent).toContain('A 2 km');
  });

  it('enlaza un alojamiento con una ubicación del mapa y lo guarda', async () => {
    const p = await montar([sitio({ id: 'a', name: 'Hotel Centro' })]);
    await p.pulsar(p.boton(p.fichas()[0]!, 'Editar'));
    await p.asentar();

    const selector = p.raiz.querySelector('np-selector-de-ubicacion select') as HTMLSelectElement;
    selector.value = 'iglesia';
    selector.dispatchEvent(new Event('change'));
    await p.pulsar(p.boton(p.raiz, 'Guardar'));

    expect(p.guardados).toEqual([expect.objectContaining({ id: 'a', locationId: 'iglesia' })]);
  });

  it('quitar de la web conserva todo lo demás', async () => {
    const p = await montar([
      sitio({ id: 'a', name: 'Hotel Centro', pricePerNight: 80, recommended: true, order: 4 }),
    ]);
    await p.pulsar(p.boton(p.fichas()[0]!, 'Quitar de la web'));

    expect(p.guardados).toEqual([
      expect.objectContaining({
        id: 'a',
        name: 'Hotel Centro',
        pricePerNight: 80,
        recommended: true,
        order: 4,
        enabled: false,
      }),
    ]);
  });

  describe('el formulario', () => {
    it('guarda el teléfono y la web ya normalizados', async () => {
      const p = await montar([]);
      await p.pulsar(p.boton(p.raiz, 'Añadir un alojamiento'));

      p.escribir('input[formcontrolname="name"]', 'Hotel Centro');
      p.escribir('input[formcontrolname="phone"]', '600 00 00 00');
      p.escribir('input[formcontrolname="website"]', 'hotelcentro.es');
      p.escribir('input[formcontrolname="pricePerNight"]', '79.5');
      await p.pulsar(p.boton(p.raiz, 'Guardar'));

      expect(p.guardados[0]).toEqual(
        expect.objectContaining({
          id: undefined,
          name: 'Hotel Centro',
          phone: '600000000',
          website: 'https://hotelcentro.es/',
          pricePerNight: 79.5,
        }),
      );
    });

    /** Lo mismo que rechaza el servidor, dicho mientras se escribe. */
    it('marca un teléfono y una web que el servidor no va a aceptar', async () => {
      const p = await montar([]);
      await p.pulsar(p.boton(p.raiz, 'Añadir un alojamiento'));

      p.escribir('input[formcontrolname="phone"]', 'llamad a Marta');
      p.escribir('input[formcontrolname="website"]', 'javascript:alert(1)');

      expect(p.texto()).toContain('Ese teléfono no se puede marcar');
      expect(p.texto()).toContain('Esa dirección no es una web válida');
    });

    it('no deja guardar sin nombre', async () => {
      const p = await montar([]);
      await p.pulsar(p.boton(p.raiz, 'Añadir un alojamiento'));

      expect(p.boton(p.raiz, 'Guardar').disabled).toBe(true);
    });
  });

  it('deja de ofrecer «añadir» al llegar al máximo publicable', async () => {
    const muchos = Array.from({ length: 20 }, (_, n) => sitio({ id: `h${n}` }));
    const p = await montar(muchos);

    expect(p.boton(p.raiz, 'Añadir un alojamiento').disabled).toBe(true);
    expect(p.texto()).toContain('Habéis llegado al máximo');
  });
});

/**
 * El id de documento, que es legible a propósito: los alojamientos se mirarán
 * desde la consola de Firebase cuando algo no cuadre, y `hotel-los-tilos` dice
 * lo que es donde un id aleatorio no dice nada.
 */
describe('el id de un alojamiento nuevo', () => {
  it('sale del nombre, sin acentos ni símbolos', () => {
    expect(idDeAlojamiento('Hotel Los Tilos', [])).toBe('hotel-los-tilos');
    expect(idDeAlojamiento('Apartamentos «El Mirador» 2', [])).toBe('apartamentos-el-mirador-2');
    expect(idDeAlojamiento('Casa Rural Peña Alta', [])).toBe('casa-rural-pena-alta');
  });

  it('no pisa a otro que ya exista', () => {
    expect(idDeAlojamiento('Hotel Centro', ['hotel-centro'])).toBe('hotel-centro-2');
    expect(idDeAlojamiento('Hotel Centro', ['hotel-centro', 'hotel-centro-2'])).toBe(
      'hotel-centro-3',
    );
  });

  /** Un nombre que se queda en nada tampoco puede dar un id vacío. */
  it('aguanta un nombre que no deja nada utilizable', () => {
    expect(idDeAlojamiento('¿?¡!', [])).toBe('alojamiento');
    expect(idDeAlojamiento('', ['alojamiento'])).toBe('alojamiento-2');
  });
});
