/**
 * Una boda de muestra, para mirar las plantillas sin Firebase.
 *
 * Los datos pasan por los mismos saneadores que usa la proyección pública, así
 * que lo que se ve aquí es exactamente lo que se publicaría. Si un saneador
 * empieza a tirar algo, esta página lo enseña antes que una boda de verdad.
 */

import { sanearFaqs } from '../public-site/faqs/faqs';
import { sanearCronologia } from '../public-site/cronologia/cronologia';
import { sanearAlojamientos } from '../public-site/alojamientos/alojamientos';
import { sanearUbicaciones } from '../public-site/mapa/ubicaciones';
import { sanearDressCode } from '../public-site/dress-code/dress-code';
import { SECCIONES_INICIALES, sanearSecciones } from '../public-site/secciones/secciones';
import type { DatosPortada } from '../public-site/plantillas/portada';

export type Muestra = DatosPortada;

/** Todas las secciones encendidas y con su título, como una boda ya montada. */
const SECCIONES = sanearSecciones(
  SECCIONES_INICIALES.map((seccion) => {
    if (seccion.type === 'texto' && seccion.id === 'historia') {
      return {
        ...seccion,
        enabled: true,
        fields: {
          titulo: 'Nuestra historia',
          texto:
            '<p>Nos conocimos en una boda, cómo no. Ella llevaba el vestido verde que sale en todas las fotos; él, una corbata prestada.</p><p>Doce años después, nos toca a nosotros.</p>',
        },
      };
    }
    if (seccion.type === 'evento') {
      return {
        ...seccion,
        enabled: true,
        fields:
          seccion.id === 'ceremonia'
            ? {
                titulo: 'Ceremonia',
                hora: '17:00',
                lugar: 'Finca Los Olmos',
                direccion: 'Carretera de la Vega, km 4 · Carmona',
                nota: 'El jardín es de hierba y hay un tramo de grava desde el aparcamiento.',
              }
            : {
                titulo: 'Banquete',
                hora: '20:30',
                lugar: 'Finca Los Olmos',
                direccion: '',
                nota: '',
              },
      };
    }
    if (seccion.type === 'texto' && seccion.id === 'contacto') {
      return {
        ...seccion,
        enabled: true,
        fields: {
          titulo: 'Contacto',
          texto: '<p>Cualquier cosa, escribidnos: <strong>600 00 00 00</strong>.</p>',
        },
      };
    }
    return { ...seccion, enabled: true };
  }),
);

export const BODA_DE_MUESTRA: Muestra = {
  nombres: { partnerA: 'María', partnerB: 'Gabriel' },
  weddingDate: new Date('2027-06-12T00:00:00.000Z'),
  weddingTime: '17:00',
  timezone: 'Europe/Madrid',
  locale: 'es',
  heroImageUrl: null,
  secciones: SECCIONES,
  faqs: sanearFaqs([
    {
      id: 'bus',
      question: '¿Hay autobús desde el pueblo?',
      answer:
        '<p>Sí. Sale de la plaza a las <strong>16:15</strong> y vuelve en dos turnos: a la 1:30 y a las 4:00.</p>',
      category: 'Cómo llegar',
      icon: 'bus',
      order: 1,
      enabled: true,
    },
    {
      id: 'ninos',
      question: '¿Podemos llevar a los niños?',
      answer: '<p>Claro. Habrá menú infantil y una cuidadora a partir de las diez.</p>',
      category: 'Los peques',
      icon: 'baby',
      order: 2,
      enabled: true,
    },
    {
      id: 'parking',
      question: '¿Dónde se aparca?',
      answer: '<p>Hay sitio de sobra en la finca, a la derecha de la entrada.</p>',
      category: 'Cómo llegar',
      icon: 'car-simple',
      order: 3,
      enabled: true,
    },
  ]),
  cronologia: sanearCronologia([
    {
      id: 'ceremonia',
      time: '17:00',
      endTime: '17:45',
      title: 'Ceremonia',
      description: 'En el jardín de la finca. Mejor llegar diez minutos antes.',
      icon: 'church',
      color: 'rosa',
      locationId: 'finca',
      order: 1,
      visibleToGuests: true,
    },
    {
      id: 'coctel',
      time: '18:00',
      endTime: null,
      title: 'Cóctel',
      description: '',
      icon: 'champagne',
      color: 'verde',
      order: 2,
      visibleToGuests: true,
    },
    {
      id: 'banquete',
      time: '20:30',
      endTime: null,
      title: 'Banquete',
      description: '',
      icon: 'fork-knife',
      color: 'mostaza',
      order: 3,
      visibleToGuests: true,
    },
    {
      id: 'baile',
      time: '23:30',
      endTime: null,
      title: 'Primer baile',
      description: '',
      icon: 'music-notes',
      color: 'ciruela',
      order: 4,
      visibleToGuests: true,
    },
    {
      id: 'fin',
      time: '04:00',
      endTime: null,
      title: 'Fin de fiesta',
      description: 'Con el autobús de vuelta en la puerta.',
      icon: 'moon-stars',
      color: 'azul',
      order: 5,
      visibleToGuests: true,
    },
    // Interno: no se publica, y aquí tampoco se ve. Está a propósito.
    {
      id: 'montaje',
      time: '09:00',
      endTime: null,
      title: 'Llega el fotógrafo',
      description: '',
      icon: 'camera',
      color: 'turquesa',
      order: 6,
      visibleToGuests: false,
    },
  ]),
  alojamientos: sanearAlojamientos([
    {
      id: 'hotel-del-rio',
      name: 'Hotel del Río',
      category: 'hotel',
      description: 'A diez minutos en coche de la finca, con desayuno incluido.',
      pricePerNight: 85,
      distanceKm: 6.4,
      phone: '+34954112233',
      website: 'https://example.com',
      discountCode: 'Decid que vais a la boda de María y Gabriel',
      blockedRooms: 12,
      bookingDeadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      recommended: true,
      order: 1,
      enabled: true,
    },
    {
      id: 'casa-del-olmo',
      name: 'Casa del Olmo',
      category: 'rural',
      description: 'Para ir en grupo: seis habitaciones y cocina.',
      pricePerNight: 60,
      distanceKm: 12,
      phone: '+34600111222',
      website: null,
      discountCode: '',
      blockedRooms: null,
      bookingDeadline: null,
      recommended: false,
      order: 2,
      enabled: true,
    },
    {
      id: 'camping-la-vega',
      name: 'Camping La Vega',
      category: 'camping',
      description: '',
      pricePerNight: 22,
      distanceKm: 3,
      phone: null,
      website: 'https://example.org',
      discountCode: '',
      blockedRooms: null,
      bookingDeadline: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      recommended: false,
      order: 3,
      enabled: true,
    },
  ]),
  ubicaciones: sanearUbicaciones([
    {
      id: 'finca',
      type: 'ceremonia',
      name: 'Finca La Dehesa',
      address: 'Camino de la Dehesa, s/n',
      coords: { lat: 40.9481, lng: -4.1184 },
      visibleToGuests: true,
      order: 1,
    },
  ]),
  dressCode: sanearDressCode({
    description:
      '<p>Nos encantaría veros <strong>arreglados pero cómodos</strong>. La ceremonia y el cóctel son al aire libre.</p>',
    suggestedColors: ['verde-salvia', 'beige', 'azul-marino', 'burdeos'],
    avoidColors: ['blanco', 'marfil'],
    tips: [
      'La ceremonia es sobre hierba: los tacones finos se hunden.',
      'Por la noche refresca bastante, traed algo de abrigo.',
    ],
  }),
};

/** Una boda recién creada: el caso que siempre se olvida de mirar. */
export const VACIA: Muestra = {
  nombres: { partnerA: '', partnerB: '' },
  weddingDate: null,
  weddingTime: null,
  timezone: 'Europe/Madrid',
  locale: 'es',
  heroImageUrl: null,
  secciones: SECCIONES_INICIALES,
  faqs: [],
  cronologia: [],
  alojamientos: [],
  ubicaciones: [],
  dressCode: sanearDressCode(null),
};
