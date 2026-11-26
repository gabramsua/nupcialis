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
import { PersonasStore } from '../personas/personas.store';
import { proveerUbicacionesDePrueba } from '../mapa/ubicaciones.testing';
import { PUERTA_INVITADOS } from '../../../core/invitados/invitados-gateway';
import {
  ALMACEN_FOTOS_PERSONAS,
  PUERTA_PERSONAS,
  type AlmacenFotosPersonas,
  type PuertaPersonas,
} from '../../../core/personas/personas-gateway';
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
          locationId: null,
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
          locationId: null,
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
          locationId: null,
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
          locationId: null,
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

const FOTO = 'https://firebasestorage.googleapis.com/v0/b/x/o/madrina.jpg';

const PERSONAS: PuertaPersonas = {
  async listar() {
    const base = {
      side: 'both' as const,
      bio: '',
      phone: '600112233',
      photoPath: null,
      photoUrl: null,
      photoConsent: false,
      visible: true,
      guestId: null,
      order: 1,
    };
    return {
      ok: true,
      personas: [
        {
          ...base,
          id: 'madrina',
          name: 'Carmen Ruiz',
          role: 'Madrina',
          photoPath: 'weddings/w1/party/1.jpg',
          photoUrl: FOTO,
          photoConsent: true,
        },
        // Oculta: fuera de la web y fuera de la vista previa.
        {
          ...base,
          id: 'padrino',
          name: 'Antonio Oculto',
          role: 'Padrino',
          visible: false,
          order: 2,
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

const ALMACEN_FOTOS: AlmacenFotosPersonas = {
  async subir() {
    return { path: 'weddings/w1/party/1.jpg', url: FOTO };
  },
  async borrar() {
    return undefined;
  },
};

const CON = { enabled: true, visibility: 'visible' } as const;

/**
 * Los módulos del plan básico de fábrica (D-63): la web, el RSVP, el mapa, la
 * cronología, las preguntas, los regalos, el alojamiento y los autobuses.
 */
const MODULOS_BASICO = {
  publicSite: CON,
  rsvp: CON,
  guests: CON,
  map: CON,
  timeline: CON,
  faqs: CON,
  gifts: CON,
  accommodation: CON,
};
const guardadas: { secciones: readonly unknown[]; mismoSitio: boolean | undefined }[] = [];

async function montar(
  modulos: Record<string, typeof CON> = { ...MODULOS_BASICO, dressCode: CON },
  extra: Partial<typeof BODA_DE_PRUEBA> = {},
) {
  guardadas.length = 0;
  const boda = signal({
    ...BODA_DE_PRUEBA,
    ...extra,
    modulos,
    dressCode: sanearDressCode({ suggestedColors: ['verde-salvia'] }),
    // Las cuatro secciones de contenido, encendidas.
    secciones: BODA_DE_PRUEBA.secciones.map((seccion) =>
      ['preguntas', 'cronologia', 'alojamientos', 'dressCode', 'cortejo', 'mapa'].includes(
        seccion.type,
      )
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
          async guardarSecciones(secciones: readonly unknown[], mismoSitio?: boolean) {
            guardadas.push({ secciones, mismoSitio });
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
      { provide: PUERTA_PERSONAS, useValue: PERSONAS },
      {
        provide: PUERTA_INVITADOS,
        useValue: {
          async listar() {
            return { ok: true, invitados: [] };
          },
        },
      },
      { provide: ALMACEN_FOTOS_PERSONAS, useValue: ALMACEN_FOTOS },
      PersonasStore,
      AlojamientosStore,
      ...proveerUbicacionesDePrueba(),
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

  return {
    fixture,
    raiz,
    texto: () => raiz.textContent?.replace(/\s+/g, ' ') ?? '',
    /** Los nombres de las secciones que la lista del editor ofrece. */
    nombres: () =>
      [...raiz.querySelectorAll('.es__lista .es__nombre')].map((e) => e.textContent?.trim()),
  };
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

  /**
   * Son datos de terceros: la vista previa pinta lo que publicaría el servidor
   * —con su mismo saneado— y nada más. Sin teléfono, sin las ocultas.
   */
  it('pinta a las personas importantes visibles, sin teléfono y sin las ocultas', async () => {
    const p = await montar({
      ...MODULOS_BASICO,
      accommodation: CON,
      dressCode: CON,
      weddingParty: CON,
    });

    // La vista previa se pinta antes de que lleguen las personas.
    for (let vuelta = 0; vuelta < 100 && !p.texto().includes('Carmen Ruiz'); vuelta += 1) {
      await new Promise((listo) => setTimeout(listo, 5));
      p.fixture.detectChanges();
    }

    expect(p.texto()).toContain('Carmen Ruiz');
    expect(p.texto()).toContain('Madrina');
    expect(p.texto()).not.toContain('Antonio Oculto');
    expect(p.texto()).not.toContain('600112233');
    expect(p.raiz.querySelector(`img[src="${FOTO}"]`)).not.toBeNull();
  });

  it('enseña los nombres de la pareja en la portada', async () => {
    const p = await montar();

    expect(p.texto()).toContain('María');
    expect(p.texto()).toContain('Gabriel');
  });
});

/**
 * Qué secciones ofrece el editor según el plan.
 *
 * El alta siembra **todas** las secciones, así que sin filtrar una boda del
 * plan básico veía el quiz y la galería —que son del extendido— y podía
 * encenderlos.
 */
describe('las secciones que ofrece el editor', () => {
  it('una boda del plan básico solo ve las de los módulos de su plan', async () => {
    const p = await montar({ ...MODULOS_BASICO, dressCode: CON });
    const nombres = p.nombres().join('|');

    for (const dentro of [
      'Confirmad vuestra asistencia',
      'El día',
      'Preguntas frecuentes',
      'Cómo llegar',
      'Regalos',
    ]) {
      expect(nombres, dentro).toContain(dentro);
    }
    for (const fuera of [
      'Nuestra historia',
      'El Trivial de la boda',
      'Las fotos',
      'La música',
      'Libro de firmas',
      'Personas importantes',
    ]) {
      expect(nombres, fuera).not.toContain(fuera);
    }
  });

  it('con el plan extendido salen también las del extendido', async () => {
    const todos = {
      ...MODULOS_BASICO,
      accommodation: CON,
      dressCode: CON,
      story: CON,
      quiz: CON,
      gallery: CON,
      gifts: CON,
      playlist: CON,
      guestbook: CON,
      weddingParty: CON,
    };
    const p = await montar(todos);
    const nombres = p.nombres().join('|');

    for (const dentro of [
      'Nuestra historia',
      'El Trivial de la boda',
      'Las fotos',
      'Libro de firmas',
      'Personas importantes',
    ]) {
      expect(nombres, dentro).toContain(dentro);
    }
  });

  it('el texto libre sale siempre, aunque no haya ningún módulo', async () => {
    const p = await montar({
      publicSite: CON,
      accommodation: CON,
      dressCode: CON,
      timeline: CON,
      faqs: CON,
    });
    expect(p.nombres().join('|')).toContain('Contacto');
  });
});

describe('las tarjetas fijas de ceremonia y banquete (D-64)', () => {
  it('ya no se ofrecen: lo cuentan la cronología y «Cómo llegar»', async () => {
    const p = await montar();
    expect(p.nombres()).not.toContain('Ceremonia');
    expect(p.nombres()).not.toContain('Banquete');
  });

  it('se ofrece publicar el formulario de confirmación', async () => {
    const p = await montar();
    expect(p.nombres()).toContain('Confirmad vuestra asistencia');
  });

  it('«Cómo llegar» enseña en la vista previa los sitios del mapa, no una tarjeta vacía', async () => {
    const p = await montar();
    // La publicada sale con su dirección y su botón; la oculta a los invitados, no.
    expect(p.texto()).toContain('Iglesia de San Pedro');
    expect(p.texto()).toContain('Plaza Mayor, 1');
    expect(p.texto()).not.toContain('Entrada de proveedores');
  });
});

describe('el aviso de cambios sin guardar', () => {
  it('es una tarjeta con título y botón de guardar, y solo sale con cambios', async () => {
    const p = await montar();
    expect(p.raiz.querySelector('.es__aviso')).toBeNull();

    const titulo = p.raiz.querySelector<HTMLInputElement>('input[id^="np-sec-preguntas-"]');
    expect(titulo).not.toBeNull();
    if (titulo) {
      titulo.value = 'El gran día';
      titulo.dispatchEvent(new Event('input'));
    }
    p.fixture.detectChanges();

    const aviso = p.raiz.querySelector('.es__aviso');
    expect(aviso?.getAttribute('role')).toBe('status');
    expect(aviso?.querySelector('strong')?.textContent).toContain('Tenéis cambios sin guardar');
    expect(aviso?.querySelector('button')?.textContent).toContain('Guardar');
  });
});
