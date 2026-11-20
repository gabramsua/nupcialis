import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';

import { provideIconSprite } from '../../../design-system/icons/icon-sprite.providers';
import { FIREBASE_STORAGE } from '../../../core/firebase/storage.providers';
import { PUERTA_FAQS, type PuertaFaqs } from '../../../core/faqs/faqs-gateway';
import {
  PUERTA_CRONOLOGIA,
  type PuertaCronologia,
} from '../../../core/cronologia/cronologia-gateway';
import {
  PUERTA_ALOJAMIENTOS,
  type PuertaAlojamientos,
} from '../../../core/alojamientos/alojamientos-gateway';
import { SessionStore } from '../../../core/auth/session.store';
import { sanearDressCode } from '../../public-site/dress-code/dress-code';
import { BodaStore } from '../boda.store';
import { BODA_DE_PRUEBA } from '../boda.testing';
import { abrirDialogosEnPruebas } from '../invitados/dobles.testing';
import { FaqsStore } from '../faqs/faqs.store';
import { CronologiaStore } from '../cronologia/cronologia.store';
import { AlojamientosStore } from '../alojamientos/alojamientos.store';
import { EditorSecciones } from './editor-secciones';

/**
 * El editor de la web, y en concreto **lo que enseña su vista previa**.
 *
 * Esto existe por un fallo de uso que tuvo la pantalla durante tres módulos:
 * las secciones de contenido —preguntas, cronología, alojamientos, dress
 * code— salían en la vista previa con su hueco vacío, porque sus datos viven
 * en otras pantallas y aquí no se cargaban. La pareja encendía «Preguntas
 * frecuentes», no veía nada, y no tenía forma de saber si era que la sección
 * estaba rota o que no había preguntas.
 *
 * Lo que se vigila: que la vista previa pinte **lo que se publicaría**, con el
 * mismo saneado que la proyección, y nada más.
 */

beforeAll(abrirDialogosEnPruebas);

const ES = JSON.parse(readFileSync('public/i18n/es.json', 'utf8')) as Record<string, unknown>;

const FAQS: PuertaFaqs = {
  async listar() {
    return {
      ok: true,
      faqs: [
        {
          id: 'bus',
          question: '¿Hay autobús?',
          answer: '<p>Sí, a las 23:30.</p>',
          category: 'Cómo llegar',
          icon: 'bus',
          order: 1,
          enabled: true,
        },
        // Sin respuesta no se publica, y por tanto tampoco se ve aquí.
        {
          id: 'parking',
          question: '¿Hay parking?',
          answer: '',
          category: 'Cómo llegar',
          icon: 'car-simple',
          order: 2,
          enabled: true,
        },
      ],
    };
  },
  async guardar() {
    return { ok: true };
  },
  async borrar() {
    return { ok: true };
  },
  async reordenar() {
    return { ok: true };
  },
};

const CRONOLOGIA: PuertaCronologia = {
  async listar() {
    return {
      ok: true,
      hitos: [
        {
          id: 'ceremonia',
          time: '17:00',
          endTime: null,
          title: 'Ceremonia',
          description: '',
          icon: 'church',
          color: 'rosa',
          order: 1,
          visibleToGuests: true,
        },
        // Interno: no se publica, así que tampoco sale en la vista previa.
        {
          id: 'montaje',
          time: '09:00',
          endTime: null,
          title: 'Llega el fotógrafo',
          description: '',
          icon: 'camera',
          color: 'azul',
          order: 2,
          visibleToGuests: false,
        },
      ],
    };
  },
  async guardar() {
    return { ok: true };
  },
  async borrar() {
    return { ok: true };
  },
};

const ALOJAMIENTOS: PuertaAlojamientos = {
  async listar() {
    return {
      ok: true,
      alojamientos: [
        {
          id: 'central',
          name: 'Hotel Central',
          category: 'hotel',
          description: '',
          pricePerNight: 85,
          distanceKm: null,
          phone: '+34600000000',
          website: null,
          discountCode: '',
          blockedRooms: null,
          bookingDeadline: null,
          recommended: false,
          order: 1,
          enabled: true,
        },
        // Apagado: fuera de la web y fuera de la vista previa.
        {
          id: 'otro',
          name: 'Hostal Apagado',
          category: 'otro',
          description: '',
          pricePerNight: null,
          distanceKm: null,
          phone: null,
          website: null,
          discountCode: '',
          blockedRooms: null,
          bookingDeadline: null,
          recommended: false,
          order: 2,
          enabled: false,
        },
      ],
    };
  },
  async guardar() {
    return { ok: true };
  },
  async borrar() {
    return { ok: true };
  },
};

async function montar() {
  const boda = signal({
    ...BODA_DE_PRUEBA,
    dressCode: sanearDressCode({ suggestedColors: ['verde-salvia'] }),
    // Las cuatro secciones de contenido, encendidas.
    secciones: BODA_DE_PRUEBA.secciones.map((seccion) =>
      ['preguntas', 'cronologia', 'alojamientos', 'dressCode'].includes(seccion.type)
        ? { ...seccion, enabled: true }
        : seccion,
    ),
  });

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
      { provide: FIREBASE_STORAGE, useValue: {} },
      { provide: SessionStore, useValue: { weddingId: () => 'w1' } },
      {
        provide: BodaStore,
        useValue: {
          boda,
          estado: () => 'lista',
          error: () => null,
          async guardarSecciones() {
            return true;
          },
          async guardarIndexable() {
            return true;
          },
        },
      },
      { provide: PUERTA_FAQS, useValue: FAQS },
      { provide: PUERTA_CRONOLOGIA, useValue: CRONOLOGIA },
      { provide: PUERTA_ALOJAMIENTOS, useValue: ALOJAMIENTOS },
      FaqsStore,
      CronologiaStore,
      AlojamientosStore,
    ],
  });

  const fixture = TestBed.createComponent(EditorSecciones);
  fixture.detectChanges();

  const raiz = fixture.nativeElement as HTMLElement;

  // La pantalla abre en «Editar»; la vista previa es la otra pestaña.
  const pestanas = [...raiz.querySelectorAll<HTMLButtonElement>('.es__pestana')];
  pestanas[1]?.click();
  fixture.detectChanges();

  // Las tres listas se cargan al montar y la plantilla llega por un import
  // diferido: se espera a que la vista previa tenga algo dentro.
  for (let vuelta = 0; vuelta < 200; vuelta += 1) {
    await new Promise((listo) => setTimeout(listo, 5));
    fixture.detectChanges();
    if ((raiz.textContent ?? '').includes('Hotel Central')) break;
  }

  // Sin esto, los tests de «no enseña X» pasarían solos si la vista previa no
  // llegara a pintarse nunca, que es justo el fallo que este fichero vigila.
  expect(raiz.textContent, 'la vista previa no se ha pintado').toContain('Hotel Central');

  return { fixture, raiz, texto: () => raiz.textContent?.replace(/\s+/g, ' ') ?? '' };
}

describe('la vista previa del editor de la web', () => {
  it('pinta las cuatro listas de contenido con sus datos de verdad', async () => {
    const p = await montar();

    expect(p.texto()).toContain('¿Hay autobús?');
    expect(p.texto()).toContain('Ceremonia');
    expect(p.texto()).toContain('Hotel Central');
    expect(p.texto()).toContain('Verde salvia');
  });

  /** Con el mismo saneado que la proyección: lo que no se publica no se ve. */
  it('no enseña lo que no se publicaría', async () => {
    const p = await montar();

    expect(p.texto()).not.toContain('¿Hay parking?');
    expect(p.texto()).not.toContain('Llega el fotógrafo');
    expect(p.texto()).not.toContain('Hostal Apagado');
  });

  it('enseña los nombres de la pareja en la portada', async () => {
    const p = await montar();

    expect(p.texto()).toContain('María');
    expect(p.texto()).toContain('Gabriel');
  });
});
