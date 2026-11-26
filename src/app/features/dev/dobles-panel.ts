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

import {
  EnvironmentProviders,
  InjectionToken,
  computed,
  inject,
  makeEnvironmentProviders,
  signal,
} from '@angular/core';

import { PUERTA_AUTH } from '../../core/auth/auth-gateway';
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
import { PUERTA_TAREAS, type PuertaTareas } from '../../core/checklist/tareas-gateway';
import type { TareaDelPanel } from '../panel/checklist/tareas';
import { TareasStore } from '../panel/checklist/tareas.store';
import { PUERTA_QUIZ, type PuertaQuiz } from '../../core/quiz/quiz-gateway';
import {
  PUERTA_GALERIA,
  type FotoPublica,
  type PuertaGaleria,
} from '../../core/galeria/galeria-gateway';
import {
  PUERTA_GALERIA_PANEL,
  type PuertaGaleriaPanel,
} from '../../core/galeria/galeria-panel-gateway';
import {
  PUERTA_REGALOS_PANEL,
  ordenarRegalos,
  type PuertaRegalosPanel,
  type RegaloDelPanel,
} from '../../core/regalos/regalos-panel-gateway';
import { PUERTA_REGALOS, type PuertaRegalos } from '../../core/regalos/regalos-gateway';
import { PUERTA_RECIBIDOS, type PuertaRecibidos } from '../../core/regalos/recibidos-gateway';
import { sanearRecibidos } from '../panel/regalos/recibidos';
import { sanearRegalos } from '../public-site/regalos/regalos';
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
import { sanearAutobuses, type RutaAutobus } from '../public-site/autobuses/autobuses';
import { sanearDressCode } from '../public-site/dress-code/dress-code';
import { sanearAportacion } from '../public-site/regalos/regalos';
import { AlojamientosStore } from '../panel/alojamientos/alojamientos.store';
import {
  PUERTA_UBICACIONES,
  ordenarUbicaciones,
  type DatosUbicacion,
  type PuertaUbicaciones,
  type UbicacionDelPanel,
} from '../../core/mapa/ubicaciones-gateway';
import { UbicacionesStore } from '../panel/mapa/ubicaciones.store';
import {
  PUERTA_PLAYLIST_PANEL,
  ordenarCancionesDelPanel,
  type CancionDelPanel,
  type PuertaPlaylistPanel,
} from '../../core/playlist/playlist-panel-gateway';
import { PlaylistStore } from '../panel/playlist/playlist.store';
import {
  PUERTA_PLAYLIST,
  type FalloPlaylist,
  type PuertaPlaylist,
} from '../../core/playlist/playlist-gateway';
import {
  alternarVoto,
  cancionesParaInvitado,
  decidirAlta,
  type CancionGuardada,
} from '../public-site/playlist/playlist';
import { PreguntasQuizStore } from '../panel/quiz/preguntas-quiz.store';
import { MesasStore } from '../panel/mesas/mesas.store';
import { GaleriaPanelStore } from '../panel/galeria/galeria.store';
import { RegalosStore } from '../panel/regalos/regalos.store';
import { RecibidosStore } from '../panel/regalos/recibidos.store';
import { RankingQuizStore } from '../panel/quiz/ranking-quiz.store';
import { CronologiaStore } from '../panel/cronologia/cronologia.store';
import { FaqsStore } from '../panel/faqs/faqs.store';
import { BodaStore } from '../panel/boda.store';
import { SECCIONES_INICIALES } from '../public-site/secciones/secciones';
import { MODULOS, menuDeModulos, modulosNoVisibles, type BodaDelPanel } from '../panel/boda';

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
    locationId: null,
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
    locationId: null,
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
    locationId: null,
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
    locationId: null,
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
    locationId: null,
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
    locationId: null,
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
    locationId: null,
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
    locationId: null,
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
  ceremonyType: 'religious',
  guestAccessMode: 'name_phone4',
  inviteMessage: '',
  rsvpDeadline: null,
  allowGuestAddedCompanions: true,
  templateId: 'clasica',
  indexable: false,
  autobuses: [],
  palette: null,
  heroImagePath: null,
  heroImageUrl: null,
  secciones: SECCIONES_INICIALES,
  modulos: {
    publicSite: { enabled: true, visibility: 'visible' },
    checklist: { enabled: true, visibility: 'hidden' },
  },
  dressCode: sanearDressCode({
    description:
      '<p>Nos encantaría veros <strong>arreglados pero cómodos</strong>. La ceremonia es al aire libre.</p>',
    suggestedColors: ['verde-salvia', 'beige', 'azul-marino'],
    // En las dos listas a propósito: sale el aviso de la contradicción.
    avoidColors: ['blanco', 'verde-salvia'],
    tips: ['La ceremonia es sobre hierba: los tacones finos se hunden.'],
  }),
  aportacion: sanearAportacion({
    iban: 'ES91 2100 0418 4502 0005 1332',
    titular: 'María Pérez y Gabriel Ramos',
    bizum: '666112233',
    mensaje:
      'Lo único que queremos es que vengáis. Si aun así os apetece regalarnos algo, aquí lo tenéis.',
  }),
};

/**
 * El plan de la boda de muestra. Solo lo provee `/dev/panel-extendido`: sin él
 * sale el plan básico, que es lo que esperan el resto de pantallas de muestra.
 */
export const PLAN_DE_MUESTRA = new InjectionToken<'basic' | 'extended'>('PLAN_DE_MUESTRA');

/** La misma boda con todos los módulos del plan extendido encendidos. */
const BODA_EXTENDIDA: BodaDelPanel = {
  ...BODA,
  plan: 'extended',
  modulos: Object.fromEntries(
    MODULOS.map((m) => [m, { enabled: true, visibility: 'visible' as const }]),
  ) as BodaDelPanel['modulos'],
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

const UBICACIONES: readonly UbicacionDelPanel[] = [
  {
    id: 'ceremonia',
    type: 'ceremonia',
    name: 'Iglesia de San Miguel',
    address: 'Plaza de la Iglesia, 1, Segovia',
    lat: 40.9481,
    lng: -4.1184,
    description: 'Aparcad en la plaza de abajo: la calle de la iglesia es muy estrecha.',
    time: '17:30',
    order: 1,
    visibleToGuests: true,
  },
  {
    id: 'banquete',
    type: 'banquete',
    name: 'Finca El Encinar',
    address: 'Camino del Encinar, km 3',
    lat: 40.9302,
    lng: -4.0951,
    description: '',
    time: '20:00',
    order: 2,
    visibleToGuests: true,
  },
  {
    id: 'proveedores',
    type: 'parking',
    name: 'Entrada de proveedores',
    address: '',
    lat: 40.9298,
    lng: -4.0962,
    description: 'Solo para el catering.',
    time: null,
    order: 3,
    visibleToGuests: false,
  },
  {
    id: 'autobus',
    type: 'otro',
    name: 'Salida del autobús',
    address: 'Estación de autobuses',
    lat: null,
    lng: null,
    description: '',
    time: '16:45',
    order: 4,
    visibleToGuests: true,
  },
];

/** Guarda en memoria y devuelve lo que haya, como haría Firestore. */
function puertaUbicaciones(): PuertaUbicaciones {
  const datos = [...UBICACIONES];

  return {
    async listar() {
      return { ok: true, ubicaciones: ordenarUbicaciones(datos) };
    },
    async guardar(_weddingId: string, nueva: DatosUbicacion) {
      const { id, ...resto } = nueva;
      const n = datos.findIndex((u) => u.id === id);
      if (id !== undefined && n >= 0) datos[n] = { ...resto, id };
      else datos.push({ ...resto, id: id ?? `nueva-${datos.length + 1}` });
      return { ok: true };
    },
    async borrar(_weddingId: string, id: string) {
      const n = datos.findIndex((u) => u.id === id);
      if (n >= 0) datos.splice(n, 1);
      return { ok: true };
    },
  };
}

const CANCIONES: readonly CancionDelPanel[] = [
  {
    id: 'c1',
    title: 'Mr. Brightside',
    artist: 'The Killers',
    votos: 14,
    status: 'pending',
    source: 'guest',
  },
  {
    id: 'c2',
    title: 'Despacito',
    artist: 'Luis Fonsi',
    votos: 9,
    status: 'pending',
    source: 'rsvp',
  },
  {
    id: 'c3',
    title: 'Dancing Queen',
    artist: 'ABBA',
    votos: 7,
    status: 'accepted',
    source: 'guest',
  },
  { id: 'c4', title: 'Bailando', artist: '', votos: 5, status: 'accepted', source: 'rsvp' },
  {
    id: 'c5',
    title: 'La Macarena',
    artist: 'Los del Río',
    votos: 3,
    status: 'vetoed',
    source: 'couple',
  },
  {
    id: 'c6',
    title: 'Cumpleaños feliz',
    artist: '',
    votos: 1,
    status: 'discarded',
    source: 'guest',
  },
];

/** Guarda en memoria y devuelve lo que haya, como haría Firestore. */
function puertaPlaylistPanel(): PuertaPlaylistPanel {
  let datos = [...CANCIONES];

  return {
    async listar() {
      return { ok: true, canciones: ordenarCancionesDelPanel(datos) };
    },
    async cambiarEstado(_w, id, estado) {
      datos = datos.map((c) => (c.id === id ? { ...c, status: estado } : c));
      return { ok: true };
    },
    async anadir(_w, title, artist, estado) {
      datos.push({
        id: `n${datos.length}`,
        title,
        artist,
        votos: 0,
        status: estado,
        source: 'couple',
      });
      return { ok: true };
    },
    async borrar(_w, id) {
      datos = datos.filter((c) => c.id !== id);
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
  private readonly plan = inject(PLAN_DE_MUESTRA, { optional: true });
  private readonly _boda = signal<BodaDelPanel | null>(
    this.plan === 'extended' ? BODA_EXTENDIDA : BODA,
  );

  readonly boda = this._boda.asReadonly();
  readonly menu = computed(() => {
    const boda = this._boda();
    return boda ? menuDeModulos(boda) : [];
  });
  readonly sinPublicar = computed(() => {
    const boda = this._boda();
    return boda ? modulosNoVisibles(boda) : 0;
  });
  readonly estado = () => 'lista' as const;
  readonly error = () => null;
  async cargar(): Promise<void> {
    return;
  }

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

  async guardarAutobuses(rutas: readonly RutaAutobus[]): Promise<boolean> {
    const boda = this._boda();
    if (boda) this._boda.set({ ...boda, autobuses: sanearAutobuses(rutas) });
    return true;
  }

  async guardarAportacion(aportacion: {
    iban: string;
    titular: string;
    bizum: string;
    mensaje: string;
  }): Promise<boolean> {
    const boda = this._boda();
    if (boda) this._boda.set({ ...boda, aportacion: sanearAportacion({ ...aportacion }) });
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

/**
 * Las tareas de muestra, con fechas relativas a hoy para que salgan en todos
 * los estados: vencidas, de esta semana, próximas, sin fecha y hechas.
 */
function puertaTareas(): PuertaTareas {
  const hoy = new Date();
  const en = (dias: number): Date =>
    new Date(Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + dias));

  let lista: TareaDelPanel[] = [
    ['reservar', 'Reservar la finca', 'Lugar', 'tent', -40, true, 'both', 'high'],
    ['fotografo', 'Contratar fotógrafo', 'Proveedores', 'camera', -6, false, 'A', 'normal'],
    ['catering', 'Pagar la señal del catering', 'Proveedores', 'chef-hat', -2, false, 'B', 'high'],
    ['vestido', 'Segunda prueba del vestido', 'Novios', 'dress', 3, false, 'A', 'normal'],
    ['invitaciones', 'Enviar las invitaciones', 'Invitados', 'envelope', 6, false, 'both', 'high'],
    [
      'musica',
      'Cerrar la música con el DJ',
      'Proveedores',
      'music-notes',
      45,
      false,
      'B',
      'normal',
    ],
    ['mesas', 'Montar las mesas', 'Invitados', 'table', 90, false, 'both', 'normal'],
    ['luna', 'Pensar la luna de miel', 'Novios', 'list-checks', null, false, 'both', 'low'],
  ].map(([id, title, category, icon, dias, done, assignedTo, priority], i) => ({
    id: id as string,
    title: title as string,
    description: '',
    category: category as string,
    dueDate: dias === null ? null : en(dias as number),
    done: done as boolean,
    doneAt: done ? en(-41) : null,
    doneByUid: done ? 'uid-demo' : null,
    doneByEmail: done ? 'maria@ejemplo.com' : null,
    assignedTo: assignedTo as TareaDelPanel['assignedTo'],
    vendorId: null,
    budgetItemId: null,
    priority: priority as TareaDelPanel['priority'],
    icon: icon as TareaDelPanel['icon'],
    order: i + 1,
  }));

  return {
    async listar() {
      return { ok: true, tareas: [...lista] };
    },
    async guardar(_w, datos) {
      if (datos.id) {
        lista = lista.map((t) => (t.id === datos.id ? { ...t, ...datos, id: t.id } : t));
      } else {
        lista = [
          ...lista,
          {
            ...datos,
            id: `nueva-${lista.length + 1}`,
            done: false,
            doneAt: null,
            doneByUid: null,
            doneByEmail: null,
            icon: 'list-checks',
          },
        ];
      }
      return { ok: true };
    },
    async enlazar(_w, id, enlaces) {
      lista = lista.map((t) => (t.id === id ? { ...t, ...enlaces } : t));
      return { ok: true };
    },
    async marcar(_w, id, hecha, por) {
      lista = lista.map((t) =>
        t.id === id
          ? {
              ...t,
              done: hecha,
              doneAt: hecha ? new Date() : null,
              doneByUid: hecha ? por.uid : null,
              doneByEmail: hecha ? por.email : null,
            }
          : t,
      );
      return { ok: true };
    },
    async borrar(_w, id) {
      lista = lista.filter((t) => t.id !== id);
      return { ok: true };
    },
  };
}

export function provideDoblesDelPanel(
  plan: 'basic' | 'extended' = 'basic',
  conCabecera = false,
): EnvironmentProviders {
  const deMesas = puertasDeMesas();

  return makeEnvironmentProviders([
    { provide: PLAN_DE_MUESTRA, useValue: plan },
    {
      provide: SessionStore,
      useValue: conCabecera
        ? {
            // Lo que lee la cabecera del panel entero (`/dev/panel-basico`).
            weddingId: () => 'muestra',
            sesion: () => ({
              uid: 'muestra',
              email: 'maria@ejemplo.com',
              rol: 'owner',
              weddingId: 'muestra',
              guestId: null,
            }),
            resuelta: () => true,
          }
        : { weddingId: () => 'muestra' },
    },
    { provide: PUERTA_AUTH, useValue: { salir: async () => undefined } },
    { provide: BodaStore, useClass: BodaStoreDeMuestra },
    { provide: PUERTA_ALOJAMIENTOS, useFactory: puertaAlojamientos },
    { provide: PUERTA_CRONOLOGIA, useFactory: puertaCronologia },
    { provide: PUERTA_FAQS, useFactory: puertaFaqs },
    { provide: PUERTA_UBICACIONES, useFactory: puertaUbicaciones },
    AlojamientosStore,
    UbicacionesStore,
    { provide: PUERTA_PLAYLIST_PANEL, useFactory: puertaPlaylistPanel },
    PlaylistStore,
    { provide: PUERTA_TAREAS, useFactory: puertaTareas },
    TareasStore,
    CronologiaStore,
    FaqsStore,
    { provide: PUERTA_PREGUNTAS_QUIZ, useFactory: puertaPreguntasQuiz },
    { provide: PUERTA_RANKING_QUIZ, useFactory: puertaRankingQuiz },
    PreguntasQuizStore,
    RankingQuizStore,
    { provide: PUERTA_GALERIA_PANEL, useFactory: puertaGaleriaPanel },
    GaleriaPanelStore,
    { provide: PUERTA_REGALOS_PANEL, useFactory: puertaRegalosPanel },
    RegalosStore,
    { provide: PUERTA_RECIBIDOS, useFactory: puertaRecibidos },
    RecibidosStore,
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
      tienePista: true,
      opciones: ['En una boda', 'En el gimnasio', 'En el trabajo', 'En la playa'],
    },
    {
      id: 'p2',
      text: '¿Quién dijo «te quiero» primero?',
      difficulty: 2 as const,
      puntos: 20,
      tienePista: false,
      opciones: ['Ella', 'Él', 'Los dos a la vez', 'El perro'],
    },
    {
      id: 'p3',
      text: '¿En qué ciudad fue la pedida?',
      difficulty: 3 as const,
      puntos: 30,
      tienePista: true,
      opciones: ['Cádiz', 'Sevilla', 'Granada', 'Oporto'],
    },
  ];

  const puerta: PuertaQuiz = {
    async empezar() {
      return { ok: true, partida: { gameId: 'muestra', preguntas } };
    },
    async pedirPista(_gameId, preguntaId) {
      const pistas: Record<string, string> = {
        p1: 'Había arroz de por medio.',
        p3: 'Tiene catedral y tranvía.',
      };
      return { ok: true, pista: pistas[preguntaId] ?? '' };
    },
    async entregar(_gameId, respuestas) {
      const buenas: Record<string, string> = { p1: 'En una boda', p2: 'Ella', p3: 'Cádiz' };
      const points = preguntas.reduce(
        (suma, pregunta) =>
          suma + (respuestas[pregunta.id] === buenas[pregunta.id] ? pregunta.puntos : 0),
        0,
      );

      return {
        ok: true,
        resultado: {
          points,
          total: preguntas.length,
          elapsedMs: 42_000,
          puesto: 7,
          ranking: [
            { id: 'r1', puesto: 1, displayName: 'Ana Ruiz', points: 120, esMio: false },
            { id: 'r2', puesto: 2, displayName: 'Pepe García', points: 110, esMio: false },
            { id: 'r3', puesto: 3, displayName: 'Marta Olmo', points: 90, esMio: false },
          ],
        },
      };
    },
    async ranking() {
      return { ok: true, puestos: [], visible: true, mio: null };
    },
  };

  return makeEnvironmentProviders([{ provide: PUERTA_QUIZ, useValue: puerta }]);
}

/**
 * Una galería de muestra, sin Firebase.
 *
 * Las fotos son rectángulos de color hechos con un SVG en línea: así la página
 * no depende de ninguna red y se ve igual en el contenedor que en tu portátil.
 */
function fotosDeMuestra(): FotoPublica[] {
  const color = (fondo: string, texto: string) =>
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600">` +
        `<rect width="600" height="600" fill="${fondo}"/>` +
        `<text x="50%" y="50%" font-family="sans-serif" font-size="48" fill="#fff" ` +
        `text-anchor="middle" dominant-baseline="middle">${texto}</text></svg>`,
    );

  const fotos: FotoPublica[] = [
    {
      id: 'f1',
      url: color('#b08968', 'Ceremonia'),
      urlMiniatura: color('#b08968', 'Ceremonia'),
      guestId: 'g1',
      autor: 'Ana Ruiz',
      pie: 'Qué guapos',
      album: 'dia',
      creadoEn: '2027-06-12T18:00:00.000Z',
    },
    {
      id: 'f2',
      url: color('#6b7045', 'Cóctel'),
      urlMiniatura: color('#6b7045', 'Cóctel'),
      guestId: 'g2',
      autor: 'Pepe García',
      pie: '',
      album: 'dia',
      creadoEn: '2027-06-12T19:00:00.000Z',
    },
    {
      id: 'f3',
      url: color('#1f2d4d', 'Baile'),
      urlMiniatura: color('#1f2d4d', 'Baile'),
      guestId: 'g1',
      autor: 'Ana Ruiz',
      pie: 'El primer baile',
      album: 'dia',
      creadoEn: '2027-06-12T23:30:00.000Z',
    },
    {
      id: 'f4',
      url: color('#a82f2c', 'Tarta'),
      urlMiniatura: color('#a82f2c', 'Tarta'),
      guestId: 'g3',
      autor: 'Marta Olmo',
      pie: '',
      album: 'dia',
      creadoEn: '2027-06-13T00:10:00.000Z',
    },
    {
      id: 'f5',
      url: color('#4aa39b', 'Fin'),
      urlMiniatura: color('#4aa39b', 'Fin'),
      guestId: 'g2',
      autor: 'Pepe García',
      pie: '',
      album: 'dia',
      creadoEn: '2027-06-13T04:00:00.000Z',
    },
  ];

  return fotos;
}

/** La galería del invitado con fotos de muestra, sin Firebase ni Storage. */
export function provideGaleriaDeMuestra(): EnvironmentProviders {
  const fotos = fotosDeMuestra();

  const puerta: PuertaGaleria = {
    async listar() {
      return { ok: true, fotos, cursor: null };
    },
    async subir() {
      return { ok: true, id: 'nueva' };
    },
    async borrar() {
      return { ok: true };
    },
  };

  return makeEnvironmentProviders([{ provide: PUERTA_GALERIA, useValue: puerta }]);
}

/**
 * La galería de la pareja, con las mismas fotos y borrado de verdad.
 *
 * Borra y vacía sobre la lista en memoria a propósito: una vista previa donde
 * el botón de borrar no quita nada no enseña lo que hay que mirar, que es qué
 * pinta tiene la rejilla cuando se queda con tres fotos o con ninguna.
 */
function puertaGaleriaPanel(): PuertaGaleriaPanel {
  let fotos = fotosDeMuestra();

  return {
    async listar() {
      return { ok: true, fotos, cursor: null };
    },
    async borrar(photoId: string) {
      fotos = fotos.filter((f) => f.id !== photoId);
      return { ok: true };
    },
    async vaciar() {
      const borradas = fotos.length;
      fotos = [];
      return { ok: true, borradas };
    },
  };
}

/** Una lista de regalos de muestra, con algo cogido y algo apagado. */
function regalosDeMuestra(): RegaloDelPanel[] {
  return [
    {
      id: 'cafetera',
      titulo: 'Una cafetera decente',
      descripcion: 'La nuestra tiene quince años y hace un ruido raro.',
      precio: 120,
      enlace: 'https://tienda.example/cafetera',
      imagen: null,
      reservado: false,
      order: 0,
      enabled: true,
    },
    {
      id: 'manta',
      titulo: 'La manta del sofá',
      descripcion: '',
      precio: 45,
      enlace: null,
      imagen: null,
      reservado: true,
      order: 1,
      enabled: true,
    },
    {
      id: 'viaje',
      titulo: 'Un trozo del viaje',
      descripcion: 'Cualquier cantidad vale.',
      precio: null,
      enlace: null,
      imagen: null,
      reservado: false,
      order: 2,
      enabled: false,
    },
  ];
}

/** Guarda en memoria y devuelve lo que haya, como haría Firestore. */
function puertaRegalosPanel(): PuertaRegalosPanel {
  let datos = regalosDeMuestra();

  return {
    async listar() {
      return { ok: true, regalos: ordenarRegalos(datos) };
    },
    async guardar(_weddingId, regalo) {
      const id = regalo.id ?? `regalo-${datos.length + 1}`;
      const nuevo: RegaloDelPanel = {
        id,
        titulo: regalo.titulo,
        descripcion: regalo.descripcion,
        precio: regalo.precio,
        enlace: regalo.enlace,
        imagen: regalo.imagen,
        reservado: datos.find((r) => r.id === id)?.reservado ?? false,
        order: regalo.order,
        enabled: regalo.enabled,
      };
      datos = [...datos.filter((r) => r.id !== id), nuevo];
      return { ok: true };
    },
    async borrar(_weddingId, id) {
      datos = datos.filter((r) => r.id !== id);
      return { ok: true };
    },
  };
}

/** La página de regalos del invitado, sin Firebase. Reservar funciona. */
export function provideRegalosDeMuestra(): EnvironmentProviders {
  const aportacion = {
    iban: 'ES91 2100 0418 4502 0005 1332',
    titular: 'María Pérez y Gabriel Ramos',
    bizum: '666112233',
    mensaje:
      'Lo único que queremos es que vengáis. Si aun así os apetece regalarnos algo, aquí lo tenéis.',
  };

  let crudos: Record<string, unknown>[] = [
    {
      id: 'cafetera',
      titulo: 'Una cafetera decente',
      descripcion: 'La nuestra tiene quince años y hace un ruido raro.',
      precio: 120,
      enlace: 'https://tienda.example/cafetera',
      order: 0,
    },
    { id: 'manta', titulo: 'La manta del sofá', precio: 45, order: 1, reservedBy: 'otro' },
    { id: 'viaje', titulo: 'Un trozo del viaje', order: 2, reservedBy: 'yo' },
  ];

  const servir = () => ({
    ok: true as const,
    aportacion: sanearAportacion(aportacion),
    regalos: sanearRegalos(crudos, 'yo'),
  });

  const puerta: PuertaRegalos = {
    async listar() {
      return servir();
    },
    async reservar(giftId: string) {
      crudos = crudos.map((r) => (r['id'] === giftId ? { ...r, reservedBy: 'yo' } : r));
      return servir();
    },
    async soltar(giftId: string) {
      crudos = crudos.map((r) => (r['id'] === giftId ? { ...r, reservedBy: null } : r));
      return servir();
    },
  };

  return makeEnvironmentProviders([{ provide: PUERTA_REGALOS, useValue: puerta }]);
}

/** Un cuaderno de lo recibido de muestra, con de todo y algo sin agradecer. */
function puertaRecibidos(): PuertaRecibidos {
  let datos: Record<string, unknown>[] = [
    {
      id: 'r1',
      guestId: 'g1',
      fromLabel: 'Ana Ruiz',
      amount: 200,
      method: 'bizum',
      receivedAt: '2027-06-13',
      thanked: false,
    },
    {
      id: 'r2',
      guestId: 'g2',
      fromLabel: 'Pepe García',
      amount: 150,
      method: 'cash',
      receivedAt: '2027-06-12',
      thanked: true,
      thankedAt: '2027-06-15',
    },
    {
      id: 'r3',
      guestId: null,
      fromLabel: 'Los vecinos del 3ºB',
      amount: null,
      method: 'gift',
      giftDescription: 'La vajilla entera',
      receivedAt: '2027-06-14',
      thanked: false,
    },
  ];

  return {
    async listar() {
      return { ok: true, recibidos: sanearRecibidos(datos) };
    },
    async guardar(_weddingId, recibido) {
      if (recibido.id) {
        datos = datos.map((d) => (d['id'] === recibido.id ? { ...d, ...recibido } : d));
      } else {
        datos = [...datos, { ...recibido, id: `nuevo-${datos.length + 1}` }];
      }
      return { ok: true };
    },
    async borrar(_weddingId, id) {
      datos = datos.filter((d) => d['id'] !== id);
      return { ok: true };
    },
  };
}

/**
 * La playlist del invitado, en memoria y **con el mismo dominio que el
 * servidor**: proponer detecta duplicados y votar pone y quita, así que lo que
 * se ve aquí es lo que se vería con Firebase.
 */
export function providePlaylistDeMuestra(): EnvironmentProviders {
  const YO = 'yo';

  let lista: CancionGuardada[] = [
    {
      id: 'a',
      title: 'Mr. Brightside',
      artist: 'The Killers',
      suggestedBy: 'x',
      source: 'guest',
      votes: ['x', 'y', 'z', YO],
      status: 'pending',
    },
    {
      id: 'b',
      title: 'Dancing Queen',
      artist: 'ABBA',
      suggestedBy: YO,
      source: 'guest',
      votes: [YO, 'x'],
      status: 'accepted',
    },
    {
      id: 'c',
      title: 'Despacito',
      artist: 'Luis Fonsi',
      suggestedBy: 'y',
      source: 'rsvp',
      votes: ['y'],
      status: 'pending',
    },
    {
      id: 'd',
      title: 'La Macarena',
      artist: 'Los del Río',
      suggestedBy: '',
      source: 'couple',
      votes: [],
      status: 'vetoed',
    },
  ];

  const servir = () => ({ ok: true as const, canciones: cancionesParaInvitado(lista, YO) });

  const puerta: PuertaPlaylist = {
    async listar() {
      return servir();
    },
    async proponer(title: string, artist: string) {
      const decision = decidirAlta(lista, YO, title, artist);

      switch (decision.accion) {
        case 'crear':
          lista = [
            ...lista,
            {
              id: `n${lista.length}`,
              title,
              artist,
              suggestedBy: YO,
              source: 'guest',
              votes: [YO],
              status: 'pending',
            },
          ];
          return { ...servir(), resultado: 'creada' as const };
        case 'votar':
          lista = lista.map((c) =>
            c.id === decision.id && !c.votes.includes(YO) ? { ...c, votes: [...c.votes, YO] } : c,
          );
          return { ...servir(), resultado: 'ya-estaba' as const };
        default:
          return { ok: false as const, fallo: { tipo: decision.accion } as FalloPlaylist };
      }
    },
    async votar(songId: string) {
      lista = lista.map((c) => (c.id === songId ? { ...c, votes: alternarVoto(c.votes, YO) } : c));
      return servir();
    },
  };

  return makeEnvironmentProviders([{ provide: PUERTA_PLAYLIST, useValue: puerta }]);
}
