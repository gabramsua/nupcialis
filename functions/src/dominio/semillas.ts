/**
 * Lo que se siembra al crear una boda.
 *
 * Una boda recién creada no puede estar vacía: la pareja entra por primera vez
 * y tiene que encontrar algo con lo que empezar. Un panel en blanco es la mejor
 * forma de que abandonen antes de entender el producto.
 *
 * Las formas de los documentos son las de `docs/REQUISITOS.md` §5.8, §5.9,
 * §8.11 y §8.17. Si algo de aquí deja de encajar con ese documento, el que se
 * corrige es este fichero.
 */

export interface OpcionPregunta {
  readonly value: string;
  readonly label: string;
}

export interface PreguntaFormulario {
  /** Id del documento. Estable, para poder referenciarlo desde `visibleIf`. */
  readonly key: string;
  readonly label: string;
  readonly helpText: string;
  readonly type:
    'text' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'number' | 'date' | 'boolean';
  readonly options: readonly OpcionPregunta[];
  readonly required: boolean;
  readonly target: 'guest' | 'companion' | 'both';
  /** Vincula la respuesta a un campo del invitado. Ver REQUISITOS §5.8. */
  readonly mapsTo: string | null;
  readonly visibleIf: { readonly questionId: string; readonly equals: unknown } | null;
  readonly order: number;
  readonly enabled: boolean;
  readonly isSystem: boolean;
}

function opciones(...etiquetas: readonly string[]): readonly OpcionPregunta[] {
  // El `value` se congela en el alta y no cambia aunque la pareja reetiquete la
  // opción: si cambiara, las respuestas ya guardadas dejarían de casar.
  return etiquetas.map((label) => ({ value: label.toLowerCase().replace(/\s+/g, '-'), label }));
}

/**
 * Preguntas de fábrica del formulario de RSVP.
 *
 * `isSystem` marca las que no se pueden borrar, solo desactivar o reetiquetar:
 * otras partes del producto dependen de su `mapsTo`. Si alguien borrase la del
 * menú, la exportación al catering se quedaría sin datos y nadie sabría por qué.
 */
export const PREGUNTAS_RSVP_FABRICA: readonly PreguntaFormulario[] = [
  {
    key: 'asistencia',
    label: '¿Vendrás a la boda?',
    helpText: '',
    type: 'boolean',
    options: [],
    required: true,
    target: 'both',
    mapsTo: 'rsvpStatus',
    visibleIf: null,
    order: 1,
    enabled: true,
    isSystem: true,
  },
  {
    key: 'menu',
    label: 'Menú',
    helpText: 'Si tienes una intolerancia, cuéntanosla en la siguiente pregunta.',
    type: 'select',
    options: opciones('Normal', 'Vegetariano', 'Vegano', 'Sin gluten', 'Infantil'),
    required: true,
    target: 'both',
    mapsTo: 'menu',
    visibleIf: { questionId: 'asistencia', equals: true },
    order: 2,
    enabled: true,
    isSystem: true,
  },
  {
    key: 'alergias',
    label: 'Alergias e intolerancias',
    helpText: '',
    type: 'textarea',
    options: [],
    required: false,
    target: 'both',
    mapsTo: 'allergies',
    visibleIf: { questionId: 'asistencia', equals: true },
    order: 3,
    enabled: true,
    isSystem: true,
  },
  {
    key: 'autobus',
    label: '¿Necesitas autobús?',
    helpText: '',
    type: 'boolean',
    options: [],
    required: false,
    target: 'guest',
    mapsTo: 'needsTransport',
    visibleIf: { questionId: 'asistencia', equals: true },
    order: 4,
    enabled: true,
    isSystem: false,
  },
  {
    key: 'alojamiento',
    label: '¿Necesitas alojamiento?',
    helpText: '',
    type: 'boolean',
    options: [],
    required: false,
    target: 'guest',
    mapsTo: 'needsAccommodation',
    visibleIf: { questionId: 'asistencia', equals: true },
    order: 5,
    enabled: true,
    isSystem: false,
  },
  {
    key: 'cancion',
    label: '¿Qué canción no puede faltar?',
    helpText: '',
    type: 'text',
    options: [],
    required: false,
    target: 'guest',
    mapsTo: null,
    visibleIf: { questionId: 'asistencia', equals: true },
    order: 6,
    enabled: true,
    isSystem: false,
  },
  {
    key: 'mensaje',
    label: 'Un mensaje para los novios',
    helpText: '',
    type: 'textarea',
    options: [],
    required: false,
    target: 'guest',
    mapsTo: null,
    visibleIf: null,
    order: 7,
    enabled: true,
    isSystem: false,
  },
];

export interface Faq {
  readonly question: string;
  readonly answer: string;
  readonly category: string;
  readonly icon: string;
  readonly order: number;
  readonly enabled: boolean;
}

/** Las preguntas que un invitado hace siempre, con la respuesta a medio escribir. */
export const FAQS_FABRICA: readonly Faq[] = [
  {
    question: '¿Hay aparcamiento?',
    answer: '',
    category: 'Cómo llegar',
    icon: 'car-simple',
    order: 1,
    enabled: true,
  },
  {
    question: '¿Habrá autobús?',
    answer: '',
    category: 'Cómo llegar',
    icon: 'bus',
    order: 2,
    enabled: true,
  },
  {
    question: '¿Puedo llevar niños?',
    answer: '',
    category: 'Invitados',
    icon: 'baby',
    order: 3,
    enabled: true,
  },
  {
    question: '¿Cuál es el código de vestimenta?',
    answer: '',
    category: 'Invitados',
    icon: 't-shirt',
    order: 4,
    enabled: true,
  },
  {
    question: '¿Hasta qué hora dura?',
    answer: '',
    category: 'El día',
    icon: 'clock',
    order: 5,
    enabled: true,
  },
  {
    question: '¿Hay opciones vegetarianas?',
    answer: '',
    category: 'El día',
    icon: 'leaf',
    order: 6,
    enabled: true,
  },
  {
    question: '¿A quién pregunto si tengo una duda?',
    answer: '',
    category: 'Contacto',
    icon: 'question',
    order: 7,
    enabled: true,
  },
];

export interface TareaPlantilla {
  readonly title: string;
  readonly category: string;
  /** Meses antes de la boda en que toca. */
  readonly mesesAntes: number;
  readonly icon: string;
  readonly priority: 'low' | 'normal' | 'high';
}

/** Plantilla de checklist. Las fechas se calculan desde la fecha de la boda. */
export const CHECKLIST_PLANTILLA: readonly TareaPlantilla[] = [
  { title: 'Reservar la finca', category: 'Lugar', mesesAntes: 12, icon: 'tent', priority: 'high' },
  {
    title: 'Contratar fotógrafo',
    category: 'Proveedores',
    mesesAntes: 10,
    icon: 'camera',
    priority: 'normal',
  },
  {
    title: 'Contratar catering',
    category: 'Proveedores',
    mesesAntes: 10,
    icon: 'chef-hat',
    priority: 'high',
  },
  {
    title: 'Elegir el vestido',
    category: 'Novios',
    mesesAntes: 9,
    icon: 'dress',
    priority: 'normal',
  },
  {
    title: 'Elegir el traje',
    category: 'Novios',
    mesesAntes: 6,
    icon: 't-shirt',
    priority: 'normal',
  },
  {
    title: 'Cerrar la música',
    category: 'Proveedores',
    mesesAntes: 6,
    icon: 'music-notes',
    priority: 'normal',
  },
  {
    title: 'Cerrar la lista de invitados',
    category: 'Invitados',
    mesesAntes: 5,
    icon: 'users',
    priority: 'high',
  },
  {
    title: 'Enviar las invitaciones',
    category: 'Invitados',
    mesesAntes: 4,
    icon: 'envelope',
    priority: 'high',
  },
  {
    title: 'Reservar alojamiento para los de fuera',
    category: 'Invitados',
    mesesAntes: 4,
    icon: 'bed',
    priority: 'normal',
  },
  {
    title: 'Cerrar el menú y las alergias',
    category: 'El día',
    mesesAntes: 2,
    icon: 'fork-knife',
    priority: 'normal',
  },
  {
    title: 'Confirmar asistentes y montar las mesas',
    category: 'Invitados',
    mesesAntes: 1,
    icon: 'table',
    priority: 'high',
  },
  {
    title: 'Dar el número final al catering',
    category: 'El día',
    mesesAntes: 0.5,
    icon: 'chef-hat',
    priority: 'high',
  },
];

/**
 * Fecha límite de una tarea.
 *
 * Si la boda está más cerca que el plazo de la tarea —una pareja que contrata a
 * cuatro meses vista tiene la finca reservada hace tiempo— la fecha no se va al
 * pasado: se ancla a hoy. Una lista que nace con ocho tareas vencidas no la mira
 * nadie.
 */
export function fechaLimiteTarea(fechaBoda: Date, mesesAntes: number, hoy: Date): Date {
  const limite = new Date(fechaBoda);
  limite.setDate(limite.getDate() - Math.round(mesesAntes * 30));
  return limite < hoy ? new Date(hoy) : limite;
}

/** Tareas que ya no tienen sentido: la boda es antes de que tocara hacerlas. */
export function tareasAplicables(
  fechaBoda: Date,
  hoy: Date,
  plantilla: readonly TareaPlantilla[] = CHECKLIST_PLANTILLA,
): readonly TareaPlantilla[] {
  const diasHastaLaBoda = (fechaBoda.getTime() - hoy.getTime()) / 86_400_000;
  // Se conservan las tareas cuyo plazo aún no ha pasado del todo, con un margen
  // de un mes: "enviar invitaciones" a tres meses vista sigue teniendo sentido
  // aunque la plantilla la sitúe a cuatro.
  return plantilla.filter((t) => t.mesesAntes * 30 <= diasHastaLaBoda + 30);
}

export interface PreguntaQuiz {
  readonly question: string;
  readonly correctAnswer: string;
  readonly wrongAnswers: readonly [string, string, string];
  /** 1, 2 o 3 → 10, 20 o 30 puntos. */
  readonly difficulty: 1 | 2 | 3;
  readonly hint: string | null;
  readonly enabled: boolean;
  readonly order: number;
}

/**
 * Banco de ejemplo del quiz.
 *
 * Va con las respuestas en blanco a propósito: solo la pareja sabe dónde se
 * conocieron. Lo que se siembra es la **forma** de una buena pregunta —una
 * correcta y tres falsas creíbles— para que la pareja escriba encima en lugar
 * de mirar una pantalla vacía preguntándose qué se espera de ella.
 *
 * Nacen con `enabled: false`: una pregunta sin respuestas no se puede jugar, y
 * un quiz que se publica vacío es peor que no tener quiz.
 */
export const PREGUNTAS_QUIZ_FABRICA: readonly PreguntaQuiz[] = [
  {
    question: '¿Dónde nos conocimos?',
    correctAnswer: '',
    wrongAnswers: ['', '', ''],
    difficulty: 1,
    hint: null,
    enabled: false,
    order: 1,
  },
  {
    question: '¿Adónde fuimos en nuestra primera cita?',
    correctAnswer: '',
    wrongAnswers: ['', '', ''],
    difficulty: 1,
    hint: null,
    enabled: false,
    order: 2,
  },
  {
    question: '¿Quién dijo "te quiero" primero?',
    correctAnswer: '',
    wrongAnswers: ['', '', ''],
    difficulty: 2,
    hint: null,
    enabled: false,
    order: 3,
  },
  {
    question: '¿A qué sitio viajamos juntos por primera vez?',
    correctAnswer: '',
    wrongAnswers: ['', '', ''],
    difficulty: 2,
    hint: null,
    enabled: false,
    order: 4,
  },
  {
    question: '¿Cómo fue la pedida?',
    correctAnswer: '',
    wrongAnswers: ['', '', ''],
    difficulty: 3,
    hint: null,
    enabled: false,
    order: 5,
  },
];

export interface GrupoInvitados {
  readonly name: string;
  readonly side: 'A' | 'B' | 'both';
  readonly photoAudience: 'public' | 'restricted';
  readonly allowPublicOptIn: boolean;
  readonly color: string;
  readonly order: number;
}

/**
 * Grupo por defecto.
 *
 * Una boda nace con un único grupo público al que pertenece todo el mundo: de
 * los `groupIds` de un invitado depende qué fotos ve, y "sin grupo" no es una
 * respuesta que la galería sepa contestar.
 */
export const GRUPO_POR_DEFECTO: GrupoInvitados = {
  name: 'Invitados',
  side: 'both',
  photoAudience: 'public',
  allowPublicOptIn: true,
  // Id de la paleta categórica del design system, no un hexadecimal: los
  // colores de grupo salen del catálogo cerrado. Ver REQUISITOS §9.1.
  color: 'rosa',
  order: 1,
};
