/**
 * Los dobles que hacen que las pantallas del panel se puedan ver sin Firebase.
 *
 * Guardan en memoria, así que la página de muestra no es solo una foto: se
 * puede añadir un alojamiento, apagarlo, borrarlo y ver cómo queda. Al recargar
 * vuelve todo al estado de partida, que es justo lo que se quiere de una
 * página de muestra.
 *
 * **Solo en desarrollo.** La ruta que los provee no se registra en producción.
 */

import { EnvironmentProviders, makeEnvironmentProviders, signal } from '@angular/core';

import { SessionStore } from '../../core/auth/session.store';
import {
  PUERTA_MESAS,
  PUERTA_SENTAR,
  type Mesa,
  type PuertaMesas,
  type PuertaSentar,
} from '../../core/mesas/mesas-gateway';
import {
  PUERTA_INVITADOS,
  type Invitado,
  type PuertaInvitados,
} from '../../core/invitados/invitados-gateway';
import { PUERTA_QUIZ, type PuertaQuiz } from '../../core/quiz/quiz-gateway';
import {
  PUERTA_PREGUNTAS_QUIZ,
  PUERTA_RANKING_QUIZ,
  type JugadorDelQuiz,
  type PreguntaDelPanel,
  type PuertaPreguntasQuiz,
  type PuertaRankingQuiz,
} from '../../core/quiz/quiz-admin-gateway';
import {
  PUERTA_ALOJAMIENTOS,
  ordenarAlojamientos,
  type AlojamientoDelPanel,
  type DatosAlojamiento,
  type PuertaAlojamientos,
} from '../../core/alojamientos/alojamientos-gateway';
import {
  PUERTA_CRONOLOGIA,
  type DatosHito,
  type HitoDelPanel,
  type PuertaCronologia,
} from '../../core/cronologia/cronologia-gateway';
import {
  PUERTA_FAQS,
  type DatosFaq,
  type FaqDelPanel,
  type PuertaFaqs,
} from '../../core/faqs/faqs-gateway';
import { sanearDressCode } from '../public-site/dress-code/dress-code';
import { AlojamientosStore } from '../panel/alojamientos/alojamientos.store';
import { PreguntasQuizStore } from '../panel/quiz/preguntas-quiz.store';
import { MesasStore } from '../panel/mesas/mesas.store';
import { RankingQuizStore } from '../panel/quiz/ranking-quiz.store';
import { CronologiaStore } from '../panel/cronologia/cronologia.store';
import { FaqsStore } from '../panel/faqs/faqs.store';
import { BodaStore } from '../panel/boda.store';
import { SECCIONES_INICIALES } from '../public-site/secciones/secciones';
import type { BodaDelPanel } from '../panel/boda';

function enDias(dias: number): string {
  return new Date(Date.now() + dias * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

const ALOJAMIENTOS: AlojamientoDelPanel[] = [
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
    bookingDeadline: enDias(5),
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
    blockedRooms: 8,
    // Sin fecha límite y con habitaciones bloqueadas: sale su aviso.
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
    // Sin teléfono ni web: sale el aviso de que nadie puede reservar.
    website: null,
    discountCode: '',
    blockedRooms: null,
    bookingDeadline: enDias(-2),
    recommended: false,
    order: 3,
    enabled: false,
  },
];

const HITOS: HitoDelPanel[] = [
  {
    id: 'montaje',
    time: '09:00',
    endTime: null,
    title: 'Llega el fotógrafo',
    description: '',
    icon: 'camera',
    color: 'turquesa',
    order: 1,
    visibleToGuests: false,
  },
  {
    id: 'ceremonia',
    time: '17:00',
    endTime: '17:45',
    title: 'Ceremonia',
    description: 'En el jardín de la finca.',
    icon: 'church',
    color: 'rosa',
    order: 2,
    visibleToGuests: true,
  },
  {
    id: 'coctel',
    time: '17:30',
    endTime: null,
    // Se pisa con la ceremonia a propósito: sale el aviso de solape.
    title: 'Cóctel',
    description: '',
    icon: 'champagne',
    color: 'verde',
    order: 3,
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
];

const FAQS: FaqDelPanel[] = [
  {
    id: 'bus',
    question: '¿Hay autobús desde el pueblo?',
    answer: '<p>Sí. Sale de la plaza a las <strong>16:15</strong>.</p>',
    category: 'Cómo llegar',
    icon: 'bus',
    order: 1,
    enabled: true,
  },
  {
    id: 'parking',
    question: '¿Dónde se aparca?',
    // Sin contestar: sale el aviso de la pantalla.
    answer: '',
    category: 'Cómo llegar',
    icon: 'car-simple',
    order: 2,
    enabled: true,
  },
  {
    id: 'ninos',
    question: '¿Podemos llevar a los niños?',
    answer: '<p>Claro. Habrá menú infantil y una cuidadora a partir de las diez.</p>',
    category: 'Los peques',
    icon: 'baby',
    order: 3,
    enabled: true,
  },
];

const BODA: BodaDelPanel = {
  weddingId: 'muestra',
  slug: 'mariaygabriel',
  pareja: { partnerA: 'María', partnerB: 'Gabriel' },
  status: 'active',
  plan: 'basic',
  weddingDate: new Date('2027-06-12T00:00:00.000Z'),
  weddingTime: '17:00',
  timezone: 'Europe/Madrid',
  guestAccessMode: 'name_phone4',
  inviteMessage: '',
  rsvpDeadline: null,
  allowGuestAddedCompanions: true,
  templateId: 'clasica',
  indexable: false,
  palette: null,
  heroImagePath: null,
  heroImageUrl: null,
  secciones: SECCIONES_INICIALES,
  modulos: { publicSite: { enabled: true, visibility: 'visible' } },
  dressCode: sanearDressCode({
    description:
      '<p>Nos encantaría veros <strong>arreglados pero cómodos</strong>. La ceremonia es al aire libre.</p>',
    suggestedColors: ['verde-salvia', 'beige', 'azul-marino'],
    // En las dos listas a propósito: sale el aviso de la contradicción.
    avoidColors: ['blanco', 'verde-salvia'],
    tips: ['La ceremonia es sobre hierba: los tacones finos se hunden.'],
  }),
};

/** Guarda en memoria y devuelve lo que haya, como haría Firestore. */
function puertaAlojamientos(): PuertaAlojamientos {
  const datos = [...ALOJAMIENTOS];

  return {
    async listar() {
      return { ok: true, alojamientos: ordenarAlojamientos(datos) };
    },
    async guardar(_weddingId: string, nuevo: DatosAlojamiento) {
      const { id, ...resto } = nuevo;
      const n = datos.findIndex((a) => a.id === id);
      if (id !== undefined && n >= 0) datos[n] = { ...resto, id };
      else datos.push({ ...resto, id: id ?? `nuevo-${datos.length + 1}` });
      return { ok: true };
    },
    async borrar(_weddingId: string, id: string) {
      const n = datos.findIndex((a) => a.id === id);
      if (n >= 0) datos.splice(n, 1);
      return { ok: true };
    },
  };
}

function puertaCronologia(): PuertaCronologia {
  const datos = [...HITOS];

  return {
    async listar() {
      return { ok: true, hitos: [...datos] };
    },
    async guardar(_weddingId: string, nuevo: DatosHito) {
      const { id, ...resto } = nuevo;
      const n = datos.findIndex((h) => h.id === id);
      if (id !== undefined && n >= 0) datos[n] = { ...resto, id };
      else datos.push({ ...resto, id: id ?? `nuevo-${datos.length + 1}` });
      return { ok: true };
    },
    async borrar(_weddingId: string, id: string) {
      const n = datos.findIndex((h) => h.id === id);
      if (n >= 0) datos.splice(n, 1);
      return { ok: true };
    },
  };
}

function puertaFaqs(): PuertaFaqs {
  const datos = [...FAQS];

  return {
    async listar() {
      return { ok: true, faqs: [...datos] };
    },
    async guardar(_weddingId: string, nueva: DatosFaq) {
      const { id, ...resto } = nueva;
      const n = datos.findIndex((f) => f.id === id);
      if (id !== undefined && n >= 0) datos[n] = { ...resto, id };
      else datos.push({ ...resto, id: id ?? `nueva-${datos.length + 1}` });
      return { ok: true };
    },
    async borrar(_weddingId: string, id: string) {
      const n = datos.findIndex((f) => f.id === id);
      if (n >= 0) datos.splice(n, 1);
      return { ok: true };
    },
    async reordenar() {
      return { ok: true };
    },
  };
}

/** La boda de muestra, con lo justo de `BodaStore` que usan estas pantallas. */
class BodaStoreDeMuestra {
  private readonly _boda = signal<BodaDelPanel | null>(BODA);

  readonly boda = this._boda.asReadonly();
  readonly estado = () => 'lista' as const;
  readonly error = () => null;

  async guardarDressCode(dress: {
    description: string;
    suggestedColors: readonly string[];
    avoidColors: readonly string[];
    tips: readonly string[];
  }): Promise<boolean> {
    const boda = this._boda();
    if (boda) this._boda.set({ ...boda, dressCode: sanearDressCode({ ...dress }) });
    return true;
  }
}

const PREGUNTAS: PreguntaDelPanel[] = [
  {
    id: 'q1',
    text: '¿Dónde nos conocimos?',
    correctAnswer: 'En una boda',
    wrongAnswers: ['En el gimnasio', 'En el trabajo', 'En la playa'],
    difficulty: 1,
    hint: 'Había arroz de por medio.',
    enabled: true,
    order: 1,
  },
  {
    id: 'q2',
    text: '¿Quién dijo «te quiero» primero?',
    correctAnswer: 'Ella',
    wrongAnswers: ['Él', 'Los dos a la vez', 'El perro'],
    difficulty: 2,
    hint: null,
    enabled: true,
    order: 2,
  },
  // A medio escribir a propósito: sale su aviso y su etiqueta.
  {
    id: 'q3',
    text: '¿En qué ciudad fue la pedida?',
    correctAnswer: 'Cádiz',
    wrongAnswers: ['Sevilla', '', ''],
    difficulty: 3,
    hint: null,
    enabled: true,
    order: 3,
  },
];

const JUGADORES: JugadorDelQuiz[] = [
  {
    guestId: 'g1',
    nombre: 'Ana Ruiz',
    telefono: '+34600111222',
    partidas: 3,
    puntos: 120,
    puesto: 1,
  },
  {
    guestId: 'g2',
    nombre: 'Pepe García',
    telefono: '+34600333444',
    partidas: 1,
    puntos: 90,
    puesto: 2,
  },
  { guestId: 'g3', nombre: 'Marta Olmo', telefono: null, partidas: 2, puntos: 60, puesto: 3 },
];

function puertaPreguntasQuiz(): PuertaPreguntasQuiz {
  const datos = [...PREGUNTAS];

  return {
    async listar() {
      return { ok: true, preguntas: [...datos] };
    },
    async guardar(_weddingId, nueva) {
      const { id, ...resto } = nueva;
      const n = datos.findIndex((p) => p.id === id);
      if (id !== undefined && n >= 0) datos[n] = { ...resto, id };
      else datos.push({ ...resto, id: `nueva-${datos.length + 1}` });
      return { ok: true };
    },
    async borrar(_weddingId, id) {
      const n = datos.findIndex((p) => p.id === id);
      if (n >= 0) datos.splice(n, 1);
      return { ok: true };
    },
  };
}

function puertaRankingQuiz(): PuertaRankingQuiz {
  return {
    async jugadores() {
      return { ok: true, jugadores: JUGADORES };
    },
    async vaciar() {
      return { ok: true, borradas: 4 };
    },
  };
}

const MESAS: Mesa[] = [
  { id: 'm1', name: 'Los novios', shape: 'round', minSeats: 2, maxSeats: 8, order: 1, notes: '' },
  {
    id: 'm2',
    name: 'Familia de ella',
    shape: 'round',
    minSeats: 8,
    maxSeats: 12,
    order: 2,
    notes: '',
  },
  { id: 'm3', name: '', shape: 'rect', minSeats: 12, maxSeats: 50, order: 3, notes: '' },
];

function invitadoDeMuestra(
  id: string,
  fullName: string,
  tableId: string | null,
  extra: Partial<Invitado> = {},
): Invitado {
  return {
    id,
    fullName,
    nickname: '',
    phone: null,
    email: null,
    side: 'a',
    ageGroup: 'adult',
    groupIds: [],
    rsvpStatus: 'confirmed',
    isCompanion: false,
    invitedById: null,
    maxCompanions: 0,
    loginCount: 0,
    notes: '',
    menu: '',
    allergies: '',
    tableId,
    apuntadoPorInvitado: false,
    altaEn: null,
    ...extra,
  } as Invitado;
}

/** Invitados de muestra, con un acompañante separado a propósito. */
const INVITADOS_MESAS: Invitado[] = [
  invitadoDeMuestra('n1', 'María Ramos', 'm1'),
  invitadoDeMuestra('n2', 'Gabriel Ruiz', 'm1'),
  invitadoDeMuestra('t1', 'Consuelo Ramos', 'm2'),
  invitadoDeMuestra('t2', 'Luis Ramos', 'm2'),
  invitadoDeMuestra('c1', 'Pareja de Luis', 'm3', { isCompanion: true, invitedById: 't2' }),
  invitadoDeMuestra('p1', 'Ana Olmo', null),
  invitadoDeMuestra('p2', 'Pepe García', null),
  invitadoDeMuestra('p3', 'Marta Vega', null),
];

function puertasDeMesas(): {
  mesas: PuertaMesas;
  sentar: PuertaSentar;
  invitados: PuertaInvitados;
} {
  const mesas = [...MESAS];
  let invitados = [...INVITADOS_MESAS];

  return {
    mesas: {
      async listar() {
        return { ok: true, mesas: [...mesas] };
      },
      async guardar(_weddingId, datos) {
        const { id, ...resto } = datos;
        const n = mesas.findIndex((m) => m.id === id);
        if (id !== undefined && n >= 0) mesas[n] = { ...resto, id };
        else mesas.push({ ...resto, id: `nueva-${mesas.length + 1}` });
        return { ok: true };
      },
      async borrar(_weddingId, id) {
        const n = mesas.findIndex((m) => m.id === id);
        if (n >= 0) mesas.splice(n, 1);
        return { ok: true };
      },
    },
    sentar: {
      async sentar(guestIds, tableId) {
        invitados = invitados.map((i) =>
          guestIds.includes(i.id) ? ({ ...i, tableId } as Invitado) : i,
        );
        return { ok: true, sentados: guestIds.length };
      },
    },
    invitados: {
      async listar() {
        return { ok: true as const, invitados: [...invitados] };
      },
    } as unknown as PuertaInvitados,
  };
}

export function provideDoblesDelPanel(): EnvironmentProviders {
  const deMesas = puertasDeMesas();

  return makeEnvironmentProviders([
    { provide: SessionStore, useValue: { weddingId: () => 'muestra' } },
    { provide: BodaStore, useClass: BodaStoreDeMuestra },
    { provide: PUERTA_ALOJAMIENTOS, useFactory: puertaAlojamientos },
    { provide: PUERTA_CRONOLOGIA, useFactory: puertaCronologia },
    { provide: PUERTA_FAQS, useFactory: puertaFaqs },
    AlojamientosStore,
    CronologiaStore,
    FaqsStore,
    { provide: PUERTA_PREGUNTAS_QUIZ, useFactory: puertaPreguntasQuiz },
    { provide: PUERTA_RANKING_QUIZ, useFactory: puertaRankingQuiz },
    PreguntasQuizStore,
    RankingQuizStore,
    { provide: PUERTA_MESAS, useValue: deMesas.mesas },
    { provide: PUERTA_SENTAR, useValue: deMesas.sentar },
    { provide: PUERTA_INVITADOS, useValue: deMesas.invitados },
    MesasStore,
  ]);
}

/** Una partida de quiz de muestra, para ver el juego sin Firebase. */
export function provideQuizDeMuestra(): EnvironmentProviders {
  const preguntas = [
    {
      id: 'p1',
      text: '¿Dónde nos conocimos?',
      difficulty: 1 as const,
      puntos: 10,
      hint: 'Había arroz de por medio.',
      opciones: ['En una boda', 'En el gimnasio', 'En el trabajo', 'En la playa'],
    },
    {
      id: 'p2',
      text: '¿Quién dijo «te quiero» primero?',
      difficulty: 2 as const,
      puntos: 20,
      hint: null,
      opciones: ['Ella', 'Él', 'Los dos a la vez', 'El perro'],
    },
    {
      id: 'p3',
      text: '¿En qué ciudad fue la pedida?',
      difficulty: 3 as const,
      puntos: 30,
      hint: 'Tiene catedral y tranvía.',
      opciones: ['Cádiz', 'Sevilla', 'Granada', 'Oporto'],
    },
  ];

  const puerta: PuertaQuiz = {
    async empezar() {
      return { ok: true, partida: { gameId: 'muestra', preguntas } };
    },
    async entregar(_gameId, respuestas) {
      const buenas: Record<string, string> = { p1: 'En una boda', p2: 'Ella', p3: 'Cádiz' };
      const correcciones = preguntas.map((pregunta) => {
        const elegida = respuestas[pregunta.id] ?? null;
        return {
          id: pregunta.id,
          text: pregunta.text,
          correcta: buenas[pregunta.id] ?? '',
          elegida,
          acertada: elegida === buenas[pregunta.id],
        };
      });
      const aciertos = correcciones.filter((c) => c.acertada).length;
      const points = correcciones.reduce(
        (suma, c, n) => suma + (c.acertada ? (preguntas[n]?.puntos ?? 0) : 0),
        0,
      );

      return {
        ok: true,
        resultado: {
          points,
          aciertos,
          answeredCount: correcciones.length,
          total: preguntas.length,
          elapsedMs: 42_000,
          puesto: 7,
          ranking: [
            { id: 'r1', puesto: 1, displayName: 'Ana Ruiz', points: 120, esMio: false },
            { id: 'r2', puesto: 2, displayName: 'Pepe García', points: 110, esMio: false },
            { id: 'r3', puesto: 3, displayName: 'Marta Olmo', points: 90, esMio: false },
          ],
          correcciones,
        },
      };
    },
    async ranking() {
      return { ok: true, puestos: [], visible: true, mio: null };
    },
  };

  return makeEnvironmentProviders([{ provide: PUERTA_QUIZ, useValue: puerta }]);
}
