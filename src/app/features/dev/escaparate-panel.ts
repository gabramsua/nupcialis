import { computed, signal } from '@angular/core';

import type { Invitado, PuertaInvitados } from '../../core/invitados/invitados-gateway';
import type { Grupo } from '../../core/invitados/grupos-gateway';
import type { PreguntaDelPanel, PuertaPreguntas } from '../../core/rsvp/preguntas-gateway';
import type { FotoPublica } from '../public-site/galeria/galeria';
import type { Mesa } from '../panel/mesas/mesas';
import type { UbicacionDelPanel } from '../../core/mapa/ubicaciones-gateway';
import type { HitoDelPanel } from '../../core/cronologia/cronologia-gateway';

/**
 * Datos de muestra **más llenos** para las capturas de la HOME de
 * `nupcialis.com` (`/dev/panel-basico` y `/dev/panel-extendido`). **Solo en
 * desarrollo.**
 *
 * Los dobles de siempre son austeros a propósito (sirven para mirar un caso
 * cada vez). Una captura que vende el producto necesita lo contrario: ocho
 * mesas con gente sentada, una galería con fotos, un formulario con sus
 * preguntas. Nada de esto sale de este fichero hacia la aplicación.
 */

// ---------------------------------------------------------------------------
// Mesas e invitados
// ---------------------------------------------------------------------------

function mesa(id: string, name: string, orden: number, min = 8, max = 10): Mesa {
  return { id, name, shape: 'round', minSeats: min, maxSeats: max, order: orden, notes: '' };
}

export const MESAS_ESCAPARATE: Mesa[] = [
  mesa('m1', 'Los novios', 1, 2, 8),
  mesa('m2', 'Familia de María', 2, 8, 12),
  mesa('m3', 'Familia de Gabriel', 3, 8, 12),
  mesa('m4', 'Universidad', 4),
  mesa('m5', 'Compañeros de trabajo', 5),
  mesa('m6', 'Los primos', 6),
  mesa('m7', 'Amigos del pueblo', 7),
  mesa('m8', 'Tíos y tías', 8, 8, 12),
];

const MENUS = ['Normal', 'Normal', 'Normal', 'Vegetariano', 'Normal', 'Sin gluten'] as const;

function invitado(
  id: string,
  fullName: string,
  tableId: string | null,
  extra: Partial<Invitado> = {},
): Invitado {
  const n = Number(id.replace(/\D/g, '')) || 0;
  return {
    id,
    fullName,
    nickname: '',
    phone: null,
    side: n % 2 ? 'A' : 'B',
    ageGroup: 'adult',
    groupIds: [],
    rsvpStatus: 'confirmed',
    isCompanion: false,
    invitedById: null,
    loginCount: 1 + (n % 4),
    notes: '',
    menu: MENUS[n % MENUS.length] ?? 'Normal',
    allergies: '',
    tableId,
    apuntadoPorInvitado: false,
    altaEn: null,
    ...extra,
  };
}

const SENTADOS: readonly (readonly [string, readonly string[]])[] = [
  ['m1', ['María Ramos', 'Gabriel Ruiz']],
  [
    'm2',
    [
      'Consuelo Ramos',
      'Luis Ramos',
      'Pilar Ortega',
      'Andrés Ramos',
      'Lucía Ramos',
      'Elena Ruiz',
      'Rafael Ortega',
      'Carmen Gil',
    ],
  ],
  [
    'm3',
    [
      'Manuel Ruiz',
      'Teresa Calvo',
      'Javier Ruiz',
      'Inés Calvo',
      'Pablo Ruiz',
      'Sofía Ruiz',
      'Alberto Calvo',
      'Marisa Ríos',
      'Diego Ruiz',
    ],
  ],
  [
    'm4',
    [
      'Ana Olmo',
      'Pepe García',
      'Marta Vega',
      'Álvaro Peña',
      'Laura Soto',
      'Nacho Prieto',
      'Cristina Mora',
      'Sergio Lara',
    ],
  ],
  [
    'm5',
    [
      'Raquel Núñez',
      'Daniel Fuentes',
      'Beatriz León',
      'Hugo Marín',
      'Silvia Cano',
      'Mario Vidal',
      'Noelia Pardo',
      'Iván Herrero',
      'Paula Toro',
    ],
  ],
  [
    'm6',
    [
      'Carlos Ramos',
      'Julia Ramos',
      'Adrián Ruiz',
      'Claudia Ruiz',
      'Óscar Calvo',
      'Irene Calvo',
      'Víctor Ortega',
      'Alba Ortega',
    ],
  ],
  [
    'm7',
    [
      'Fran Medina',
      'Rocío Navarro',
      'Jesús Castro',
      'Mónica Iglesias',
      'Toni Sáez',
      'Patricia Ibáñez',
      'Rubén Gallego',
    ],
  ],
  [
    'm8',
    [
      'Ángel Ramos',
      'Dolores Ruiz',
      'Francisco Calvo',
      'Amparo Gil',
      'José Luis Ortega',
      'Remedios Ríos',
      'Fernando Ruiz',
      'Paquita Ramos',
      'Joaquín Gil',
    ],
  ],
];

const SIN_MESA: readonly string[] = [
  'Verónica Salas',
  'Borja Esteban',
  'Nerea Campos',
  'Guillermo Soler',
  'Estefanía Moya',
  'Marcos Bravo',
  'Lidia Cabrera',
  'Tomás Aguilar',
];

export const INVITADOS_ESCAPARATE: Invitado[] = [
  ...SENTADOS.flatMap(([mesaId, nombres], i) =>
    nombres.map((nombre, j) => invitado(`s${i}${j}`, nombre, mesaId)),
  ),
  ...SIN_MESA.map((nombre, i) => invitado(`p${i}`, nombre, null)),
  invitado('d1', 'Cuñado de la tía Remedios', null, { rsvpStatus: 'declined' }),
  invitado('d2', 'Marga Torres', null, { rsvpStatus: 'pending' }),
];

// ---------------------------------------------------------------------------
// La lista de invitados (captura «Invitados con sus grupos»)
// ---------------------------------------------------------------------------

/**
 * Los grupos de la boda de muestra, cada uno con su color de la paleta
 * categórica (la pareja los reparte y la lista los pinta con ellos).
 */
export const GRUPOS_ESCAPARATE: readonly Grupo[] = [
  {
    id: 'fam-a',
    name: 'Familia de María',
    photoAudience: 'public',
    color: 'rosa',
    order: 0,
    porDefecto: false,
  },
  {
    id: 'fam-b',
    name: 'Familia de Gabriel',
    photoAudience: 'public',
    color: 'azul',
    order: 1,
    porDefecto: false,
  },
  {
    id: 'primos',
    name: 'Primos',
    photoAudience: 'public',
    color: 'ciruela',
    order: 2,
    porDefecto: false,
  },
  {
    id: 'uni',
    name: 'Universidad',
    photoAudience: 'restricted',
    color: 'esmeralda',
    order: 3,
    porDefecto: false,
  },
  {
    id: 'trabajo',
    name: 'Compañeros de trabajo',
    photoAudience: 'restricted',
    color: 'mostaza',
    order: 4,
    porDefecto: false,
  },
  {
    id: 'pueblo',
    name: 'Amigos del pueblo',
    photoAudience: 'restricted',
    color: 'coral',
    order: 5,
    porDefecto: false,
  },
  {
    id: 'padel',
    name: 'Pádel',
    photoAudience: 'restricted',
    color: 'turquesa',
    order: 6,
    porDefecto: false,
  },
];

const NOMBRES = [
  'Ana',
  'Pablo',
  'Lucía',
  'Javier',
  'Carmen',
  'Daniel',
  'Marta',
  'Álvaro',
  'Laura',
  'Sergio',
  'Elena',
  'Adrián',
  'Paula',
  'Hugo',
  'Sara',
  'Iván',
  'Claudia',
  'Rubén',
  'Noelia',
  'Marcos',
  'Irene',
  'Óscar',
  'Cristina',
  'Raúl',
  'Beatriz',
  'Diego',
  'Patricia',
  'Nacho',
  'Silvia',
  'Mario',
  'Rocío',
  'Alberto',
  'Natalia',
  'Jorge',
  'Alicia',
  'Fernando',
  'Eva',
  'Víctor',
  'Lorena',
  'Ismael',
  'Teresa',
  'Manuel',
  'Inés',
  'Rafael',
  'Pilar',
  'Andrés',
  'Julia',
  'Tomás',
  'Sofía',
  'Enrique',
];
const APELLIDOS = [
  'García',
  'Martínez',
  'López',
  'Sánchez',
  'Pérez',
  'Gómez',
  'Fernández',
  'Díaz',
  'Moreno',
  'Muñoz',
  'Álvarez',
  'Romero',
  'Alonso',
  'Gutiérrez',
  'Navarro',
  'Torres',
  'Domínguez',
  'Vázquez',
  'Ramos',
  'Gil',
  'Serrano',
  'Blanco',
  'Molina',
  'Morales',
  'Suárez',
  'Ortega',
  'Delgado',
  'Castro',
  'Ortiz',
  'Rubio',
  'Marín',
  'Sanz',
  'Iglesias',
  'Medina',
  'Cortés',
  'Garrido',
  'Castillo',
  'Santos',
  'Lozano',
];

/** Cuántos de cada grupo, y a qué lado de la pareja pertenecen. */
const REPARTO: readonly (readonly [string, number, 'A' | 'B' | 'both'])[] = [
  ['fam-a', 30, 'A'],
  ['fam-b', 28, 'B'],
  ['primos', 18, 'both'],
  ['uni', 24, 'A'],
  ['trabajo', 20, 'B'],
  ['pueblo', 26, 'both'],
  ['padel', 16, 'B'],
];

/**
 * 162 invitados repartidos en siete grupos y en los tres estados de respuesta
 * (la mayoría confirmados, un buen puñado sin contestar y unos pocos que no
 * vienen), con niños en las familias y acompañantes enlazados a su titular.
 * Determinista: la misma captura sale igual cada vez.
 */
export const INVITADOS_LISTA_ESCAPARATE: Invitado[] = (() => {
  let semilla = 20270612;
  const azar = (): number => {
    semilla = (semilla * 1103515245 + 12345) % 2147483648;
    return semilla / 2147483648;
  };
  const elige = <T>(lista: readonly T[]): T => lista[Math.floor(azar() * lista.length)]!;

  const lista: Invitado[] = [];
  const usados = new Set<string>();
  let n = 0;
  for (const [grupo, cuantos, lado] of REPARTO) {
    // Una familia comparte apellido; los amigos no.
    const apellidoDeFamilia = elige(APELLIDOS);
    let titular: Invitado | null = null;
    for (let i = 0; i < cuantos; i++) {
      n++;
      const familia = grupo === 'fam-a' || grupo === 'fam-b';
      const nuevoNombre = (): string => {
        const ap =
          familia && azar() < 0.55 ? apellidoDeFamilia : `${elige(APELLIDOS)} ${elige(APELLIDOS)}`;
        return `${elige(NOMBRES)} ${ap}`;
      };
      let nombre = nuevoNombre();
      while (usados.has(nombre)) nombre = nuevoNombre();
      usados.add(nombre);

      const t = azar();
      const estado = t < 0.6 ? 'confirmed' : t < 0.86 ? 'pending' : 'declined';
      // Cada cuarto invitado de un grupo viene con su pareja, enlazada al titular.
      const acompanante = titular !== null && i % 4 === 1;
      const invitado = {
        id: `g${n}`,
        fullName: nombre,
        nickname: '',
        phone: null,
        side: lado,
        ageGroup: familia && azar() < 0.14 ? 'child' : 'adult',
        groupIds: [grupo],
        rsvpStatus: acompanante ? titular!.rsvpStatus : estado,
        isCompanion: acompanante,
        invitedById: acompanante ? titular!.id : null,
        loginCount: estado === 'pending' ? 0 : 1 + Math.floor(azar() * 5),
        notes: '',
        menu: 'Normal',
        allergies: '',
        tableId: null,
        apuntadoPorInvitado: false,
        altaEn: null,
      } as Invitado;
      lista.push(invitado);
      if (!acompanante) titular = invitado;
    }
  }
  return lista;
})();

/** Los grupos de muestra con la forma del `GruposStore`, que aquí no habla con Firestore. */
export function gruposStoreDeMuestra() {
  const _grupos = signal<readonly Grupo[]>(GRUPOS_ESCAPARATE);
  return {
    grupos: _grupos.asReadonly(),
    estado: () => 'lista' as const,
    fallo: () => null,
    porId: computed(() => new Map(_grupos().map((g) => [g.id, g]))),
    async cargar() {
      return;
    },
    async guardar() {
      return { ok: true as const, id: 'nuevo', creado: true };
    },
    async borrar() {
      return { ok: true as const, miembros: 0 };
    },
    async reordenar() {
      return { ok: true as const };
    },
  };
}

/** Lo justo de `PuertaInvitados` para que la pantalla de invitados se abra con la lista de muestra. */
export const PUERTA_INVITADOS_ESCAPARATE = {
  async listar() {
    return { ok: true as const, invitados: [...INVITADOS_LISTA_ESCAPARATE] };
  },
} as unknown as PuertaInvitados;

// ---------------------------------------------------------------------------
// Fotos de la galería
// ---------------------------------------------------------------------------

/**
 * «Fotos» de muestra: manchas de luz y color sobre un fondo, como lo que queda
 * de una fotografía de boda cuando se la desenfoca. La captura las pasa por un
 * `blur` (las de los invitados no se enseñan en una portada), así que no hace
 * falta que sean otra cosa.
 */
function foto(
  semilla: number,
  fondo: readonly [string, string],
  manchas: readonly string[],
): string {
  let s = semilla;
  const azar = (): number => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  const circulos = manchas
    .map((c) => {
      const x = Math.round(azar() * 600);
      const y = Math.round(azar() * 600);
      const r = 80 + Math.round(azar() * 150);
      return `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" fill-opacity="0.75"/>`;
    })
    .join('');
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="${fondo[0]}"/><stop offset="1" stop-color="${fondo[1]}"/>` +
    `</linearGradient></defs><rect width="600" height="600" fill="url(#g)"/>${circulos}</svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

const ESCENAS: readonly (readonly [readonly [string, string], readonly string[]])[] = [
  [
    ['#f3d9c8', '#c98f7a'],
    ['#fff3e6', '#ffffff', '#8c4f4f', '#f0b9a0'],
  ],
  [
    ['#cfe1c4', '#6f9a63'],
    ['#fbf6ea', '#3d6b45', '#f3e2cf', '#ffffff'],
  ],
  [
    ['#3b2d58', '#150f2a'],
    ['#ffcf8a', '#ff7aa8', '#7aa7ff', '#fff3d6'],
  ],
  [
    ['#f7e6d4', '#d9a98d'],
    ['#ffffff', '#6b3f3f', '#f6c9a8', '#fff8ee'],
  ],
  [
    ['#b9d5e8', '#6fa3c4'],
    ['#ffffff', '#f3dcc3', '#3e5f7f', '#fff4e2'],
  ],
  [
    ['#f6cfda', '#c8788f'],
    ['#fff1f4', '#ffffff', '#7a3552', '#f9a8bb'],
  ],
  [
    ['#e6d9a8', '#a8904a'],
    ['#fff6d6', '#ffffff', '#5d4a1f', '#f4e1a3'],
  ],
  [
    ['#2b3a52', '#101826'],
    ['#ffd88a', '#ffffff', '#ff8f6b', '#9ac1ff'],
  ],
  [
    ['#dcefd8', '#86b58b'],
    ['#ffffff', '#f7d9de', '#34603c', '#fff2cf'],
  ],
  [
    ['#f8e1cf', '#e0a98d'],
    ['#ffffff', '#704040', '#ffe9d0', '#f2b69c'],
  ],
  [
    ['#d9d2ef', '#8e82c4'],
    ['#ffffff', '#3f3470', '#f5c3e0', '#fff0fa'],
  ],
  [
    ['#f5e4c6', '#c79c58'],
    ['#ffffff', '#5a3d1b', '#ffe0a3', '#fff6e6'],
  ],
];

const AUTORES = [
  'Ana Olmo',
  'Pepe García',
  'Marta Vega',
  'Raquel Núñez',
  'Carlos Ramos',
  'Laura Soto',
  'Fran Medina',
  'Consuelo Ramos',
] as const;

const PIES = [
  'Qué guapos',
  '',
  'El primer baile',
  '',
  'Brindis',
  '',
  '',
  'La tarta',
  '',
  '',
  '',
  '',
];

export const FOTOS_ESCAPARATE: FotoPublica[] = ESCENAS.map(([fondo, manchas], i) => {
  const url = foto(11 + i * 7, fondo, manchas);
  return {
    id: `f${i + 1}`,
    url,
    urlMiniatura: url,
    guestId: `g${(i % AUTORES.length) + 1}`,
    autor: AUTORES[i % AUTORES.length] ?? '',
    pie: PIES[i] ?? '',
    album: i % 4 === 3 ? 'camino' : 'dia',
    creadoEn: `2027-06-12T${String(17 + Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '40' : '10'}:00.000Z`,
  } as FotoPublica;
});

// ---------------------------------------------------------------------------
// El formulario de confirmación
// ---------------------------------------------------------------------------

function pregunta(
  p: Partial<PreguntaDelPanel> & Pick<PreguntaDelPanel, 'id' | 'label' | 'type' | 'order'>,
): PreguntaDelPanel {
  return {
    helpText: '',
    options: [],
    required: false,
    visibleIf: null,
    target: 'guest',
    mapsTo: null,
    enabled: true,
    isSystem: false,
    ...p,
  };
}

const SI_VIENE = { questionId: 'asistencia', equals: true } as const;

export const PREGUNTAS_ESCAPARATE: PreguntaDelPanel[] = [
  pregunta({
    id: 'asistencia',
    label: '¿Vendrás a la boda?',
    type: 'boolean',
    order: 1,
    required: true,
    target: 'both',
    mapsTo: 'rsvpStatus',
    isSystem: true,
  }),
  pregunta({
    id: 'menu',
    label: 'Menú',
    helpText: 'Si tienes una intolerancia, cuéntanosla en la siguiente pregunta.',
    type: 'select',
    options: ['Normal', 'Vegetariano', 'Vegano', 'Sin gluten', 'Infantil'].map((label) => ({
      value: label.toLowerCase().replace(/\s+/g, '-'),
      label,
    })),
    order: 2,
    required: true,
    target: 'both',
    mapsTo: 'menu',
    visibleIf: SI_VIENE,
    isSystem: true,
  }),
  pregunta({
    id: 'alergias',
    label: 'Alergias e intolerancias',
    type: 'textarea',
    order: 3,
    target: 'both',
    mapsTo: 'allergies',
    visibleIf: SI_VIENE,
    isSystem: true,
  }),
  pregunta({
    id: 'autobus',
    label: '¿Necesitas autobús?',
    helpText: 'Sale a las 16:45 de la estación de autobuses.',
    type: 'boolean',
    order: 4,
    mapsTo: 'needsTransport',
    visibleIf: SI_VIENE,
  }),
  pregunta({
    id: 'alojamiento',
    label: '¿Necesitas alojamiento?',
    type: 'boolean',
    order: 5,
    mapsTo: 'needsAccommodation',
    visibleIf: SI_VIENE,
  }),
  pregunta({
    id: 'cancion',
    label: '¿Qué canción no puede faltar?',
    type: 'text',
    order: 6,
    visibleIf: SI_VIENE,
  }),
  pregunta({ id: 'mensaje', label: 'Un mensaje para los novios', type: 'textarea', order: 7 }),
];

/** Las preguntas en memoria. Borrar funciona; el resto no se guarda en ninguna parte. */
export function puertaPreguntasEscaparate(): PuertaPreguntas {
  let lista = [...PREGUNTAS_ESCAPARATE];
  return {
    async listar() {
      return { ok: true, preguntas: [...lista] };
    },
    async guardar() {
      return { ok: true };
    },
    async borrar(_weddingId, id) {
      lista = lista.filter((p) => p.id !== id);
      return { ok: true };
    },
    async reordenar() {
      return { ok: true };
    },
  };
}

// ---------------------------------------------------------------------------
// Cómo llegar y el día, hora a hora
// ---------------------------------------------------------------------------

export const UBICACIONES_ESCAPARATE: UbicacionDelPanel[] = [
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
    description: 'Hay autobús de vuelta a las 2:00 y a las 4:00.',
    time: '20:00',
    order: 2,
    visibleToGuests: true,
  },
  {
    id: 'hotel',
    type: 'alojamiento',
    name: 'Hotel Acueducto',
    address: 'Paseo de Ezequiel González, 5',
    lat: 40.9487,
    lng: -4.1177,
    description: 'Decid que venís a la boda de María y Gabriel: tenéis un 10 % de descuento.',
    time: null,
    order: 3,
    visibleToGuests: true,
  },
  {
    id: 'parking',
    type: 'parking',
    name: 'Aparcamiento de la finca',
    address: '',
    lat: 40.9298,
    lng: -4.0962,
    description: '',
    time: null,
    order: 4,
    visibleToGuests: true,
  },
];

function hito(
  id: string,
  time: string,
  title: string,
  icon: string,
  color: string,
  extra: Partial<HitoDelPanel> = {},
): HitoDelPanel {
  return {
    id,
    time,
    endTime: null,
    title,
    description: '',
    icon,
    color,
    locationId: null,
    order: 0,
    visibleToGuests: true,
    ...extra,
  } as HitoDelPanel;
}

export const HITOS_ESCAPARATE: HitoDelPanel[] = [
  hito('foto', '16:00', 'Llega el fotógrafo', 'camera', 'turquesa', {
    order: 1,
    visibleToGuests: false,
  }),
  hito('bus', '16:45', 'Sale el autobús', 'bus', 'azul', {
    order: 2,
    description: 'De la estación de autobuses a la iglesia.',
    locationId: 'ceremonia',
  }),
  hito('ceremonia', '17:30', 'Ceremonia', 'church', 'rosa', {
    order: 3,
    endTime: '18:15',
    description: 'En la iglesia de San Miguel.',
    locationId: 'ceremonia',
  }),
  hito('coctel', '18:30', 'Cóctel', 'champagne', 'verde', {
    order: 4,
    endTime: '20:00',
    locationId: 'banquete',
  }),
  hito('banquete', '20:30', 'Banquete', 'fork-knife', 'mostaza', { order: 5 }),
  hito('baile', '23:00', 'Primer baile', 'music-notes', 'morado', { order: 6 }),
  hito('barra', '23:30', 'Barra libre', 'martini', 'naranja', { order: 7, endTime: '03:00' }),
];
