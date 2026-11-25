import { describe, expect, it } from 'vitest';

import { sanearAlojamientos } from './alojamientos';
import { sanearAutobuses } from './autobuses';
import { leerCortejoPublicado } from './cortejo';
import { sanearCronologia } from './cronologia';
import { sanearFaqs } from './faqs';
import { modulosIniciales } from './planes';
import { proyeccionPublica } from './proyeccion';
import { SECCIONES_INICIALES, sanearSecciones } from './secciones';
import { sanearUbicaciones } from './ubicaciones';

/**
 * Lo que el servidor publica, el navegador lo vuelve a sanear al leerlo
 * (`tenant-source.firestore.ts`). Un saneador que no reconozca su propia salida
 * tira la lista entera sin avisar: pasó con los sitios del mapa, que salen con
 * `lat`/`lng` y se leían de `coords` («Todavía no hay sitios»).
 *
 * Aquí, para cada lista pública: se publica algo de verdad, se comprueba que
 * hay contenido y que una segunda pasada lo deja igual.
 */
describe('lo publicado sobrevive a la segunda pasada del navegador', () => {
  const modulos = {
    ...modulosIniciales('extended'),
    weddingParty: { enabled: true, visibility: 'visible' },
    buses: {
      enabled: true,
      visibility: 'visible',
      config: {
        rutas: [
          {
            id: 'r1',
            sentido: 'ida',
            nombre: 'Autobús 1',
            salida: 'Plaza Mayor',
            hora: '17:30',
            destino: 'Finca',
            nota: '',
          },
        ],
      },
    },
  };

  const publicado = proyeccionPublica(
    {
      slug: 'x',
      status: 'active',
      modules: modulos,
      content: { sections: SECCIONES_INICIALES },
    } as never,
    [
      {
        id: 'f1',
        question: '¿Hay aparcamiento?',
        answer: '<p>Sí.</p>',
        category: 'Cómo llegar',
        icon: 'car-simple',
        order: 1,
        enabled: true,
      },
    ],
    [
      {
        id: 'ceremonia',
        time: '17:00',
        title: 'Ceremonia',
        icon: 'church',
        color: 'rosa',
        order: 1,
        visibleToGuests: true,
        locationId: 'boda',
      },
    ],
    [
      {
        id: 'hotel',
        name: 'Hotel Sol',
        address: 'Calle 1',
        order: 1,
        visibleToGuests: true,
        locationId: 'boda',
      },
    ],
    [
      {
        id: 'boda',
        type: 'ceremonia',
        name: 'Boda',
        address: 'Castillo',
        coords: { lat: 36.5964, lng: -6.2318 },
        time: '12:00',
        order: 1,
        visibleToGuests: true,
      },
    ],
    [
      {
        id: 'madrina',
        displayName: 'Carmen Ruiz',
        role: 'Madrina',
        side: 'A',
        bio: 'La tía.',
        photoUrl: 'https://firebasestorage.googleapis.com/v0/b/x/o/1.jpg',
        guestId: 'g1',
        photoConsent: true,
        visibleToGuests: true,
        order: 1,
      },
    ],
  );

  const listas = [
    ['ubicaciones', publicado.content.ubicaciones, sanearUbicaciones],
    ['cronologia', publicado.content.cronologia, sanearCronologia],
    ['alojamientos', publicado.content.alojamientos, sanearAlojamientos],
    ['faqs', publicado.content.faqs, sanearFaqs],
    ['buses', publicado.content.buses, sanearAutobuses],
    ['cortejo', publicado.content.cortejo, leerCortejoPublicado],
    ['sections', publicado.content.sections, sanearSecciones],
  ] as const;

  for (const [nombre, lista, sanear] of listas) {
    it(`${nombre}: hay contenido y la segunda pasada no pierde nada`, () => {
      expect(lista.length, `la proyección no publicó ${nombre}`).toBeGreaterThan(0);
      expect(sanear(lista)).toEqual(lista);
    });
  }
});
