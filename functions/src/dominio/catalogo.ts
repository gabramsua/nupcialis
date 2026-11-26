/**
 * Los catálogos del superadmin: lo que se vuelca a cada boda nueva.
 *
 * Tres listas «originales» que Gabriel mantiene y que la pareja recibe como
 * **copia suya**:
 *
 * - `tasks`: tareas de la lista de pendientes (se copian al crear la boda).
 * - `budget`: partidas del presupuesto (se copian al crear la boda).
 * - `quiz`: preguntas **sugeridas** para el quiz. No se copian solas: la pareja
 *   las ve en su panel y pulsa «Añadir a nuestro quiz» en las que quiere.
 *
 * La copia es una instantánea. Editar el catálogo no toca las bodas que ya
 * existen, y editar la copia de una boda no toca el catálogo: la siguiente boda
 * vuelve a recibir las originales.
 *
 * Dominio puro, sin Firebase: se prueba sin emulador.
 */

import { CHECKLIST_PLANTILLA } from './semillas';
import { completa, esDificultad, type Dificultad } from './quiz';

export const TIPOS_CATALOGO = ['tasks', 'budget', 'quiz'] as const;
export type TipoCatalogo = (typeof TIPOS_CATALOGO)[number];

export function esTipoCatalogo(valor: unknown): valor is TipoCatalogo {
  return typeof valor === 'string' && (TIPOS_CATALOGO as readonly string[]).includes(valor);
}

/** Tope por catálogo. Más es casi seguro un error, y cada alta copia todo. */
export const MAX_ELEMENTOS_CATALOGO = 150;

export const PRIORIDADES = ['low', 'normal', 'high'] as const;
export type Prioridad = (typeof PRIORIDADES)[number];

export interface TareaDeCatalogo {
  readonly title: string;
  readonly category: string;
  /** Meses antes de la boda en que toca. Admite medios (0,5 = quince días). */
  readonly mesesAntes: number;
  readonly icon: string;
  readonly priority: Prioridad;
  readonly order: number;
  readonly enabled: boolean;
}

export interface PartidaDeCatalogo {
  readonly category: string;
  readonly concept: string;
  /** Céntimos. 0 = «sin estimar». */
  readonly estimatedCents: number;
  readonly order: number;
  readonly enabled: boolean;
}

export interface PreguntaDeCatalogo {
  readonly text: string;
  readonly correctAnswer: string;
  readonly wrongAnswers: readonly string[];
  readonly difficulty: Dificultad;
  readonly hint: string | null;
  readonly order: number;
  readonly enabled: boolean;
}

export type MotivoCatalogo =
  | 'formato'
  | 'titulo'
  | 'categoria'
  | 'concepto'
  | 'meses'
  | 'icono'
  | 'prioridad'
  | 'importe'
  | 'orden'
  | 'pregunta';

export type ResultadoCatalogo<T> =
  | { readonly ok: true; readonly datos: T }
  | { readonly ok: false; readonly motivo: MotivoCatalogo };

export const MAX_TITULO = 120;
export const MAX_CATEGORIA = 40;
export const MAX_MESES = 36;
/** 1 000 000 € en céntimos: más es un cero de más. */
export const MAX_ESTIMADO_CENTIMOS = 100_000_000;

function texto(valor: unknown, maximo: number): string | null {
  if (valor === undefined || valor === null) return '';
  if (typeof valor !== 'string') return null;
  const limpio = valor.replace(/\s+/g, ' ').trim();
  return limpio.length > maximo ? null : limpio;
}

function orden(valor: unknown): number | null {
  if (valor === undefined || valor === null) return 0;
  return typeof valor === 'number' && Number.isInteger(valor) && valor >= 0 && valor <= 10_000
    ? valor
    : null;
}

/**
 * Los elementos del catálogo **siempre están activos**: lo que no se quiere se
 * borra (D-53). El campo `enabled` se sigue escribiendo —`true`— para no romper
 * a los lectores antiguos, pero ya no se acepta del cliente ni se mira al volcar.
 */
const ACTIVO = true;

export function validarTarea(valor: unknown): ResultadoCatalogo<TareaDeCatalogo> {
  if (valor === null || typeof valor !== 'object') return { ok: false, motivo: 'formato' };
  const t = valor as Record<string, unknown>;

  const title = texto(t['title'], MAX_TITULO);
  if (title === null || title === '') return { ok: false, motivo: 'titulo' };

  // La categoría de una tarea ya no se pide al crearla (D-53): es opcional y la
  // pareja puede ponerla en su copia. Las tareas de fábrica siguen trayendo la suya.
  const category = texto(t['category'], MAX_CATEGORIA);
  if (category === null) return { ok: false, motivo: 'categoria' };

  const meses = t['mesesAntes'];
  if (
    typeof meses !== 'number' ||
    !Number.isFinite(meses) ||
    meses < 0 ||
    meses > MAX_MESES ||
    // Se admiten medios meses y nada más fino.
    Math.round(meses * 2) !== meses * 2
  ) {
    return { ok: false, motivo: 'meses' };
  }

  const icon = texto(t['icon'], 40);
  if (icon === null || (icon !== '' && !/^[a-z0-9-]+$/.test(icon))) {
    return { ok: false, motivo: 'icono' };
  }

  const priority = t['priority'] ?? 'normal';
  if (!(PRIORIDADES as readonly unknown[]).includes(priority)) {
    return { ok: false, motivo: 'prioridad' };
  }

  const ord = orden(t['order']);
  if (ord === null) return { ok: false, motivo: 'orden' };

  return {
    ok: true,
    datos: {
      title,
      category,
      mesesAntes: meses,
      icon,
      priority: priority as Prioridad,
      order: ord,
      enabled: ACTIVO,
    },
  };
}

export function validarPartida(valor: unknown): ResultadoCatalogo<PartidaDeCatalogo> {
  if (valor === null || typeof valor !== 'object') return { ok: false, motivo: 'formato' };
  const p = valor as Record<string, unknown>;

  const category = texto(p['category'], MAX_CATEGORIA);
  if (category === null || category === '') return { ok: false, motivo: 'categoria' };

  const concept = texto(p['concept'], MAX_TITULO);
  if (concept === null || concept === '') return { ok: false, motivo: 'concepto' };

  const estimado = p['estimatedCents'] ?? 0;
  if (
    typeof estimado !== 'number' ||
    !Number.isInteger(estimado) ||
    estimado < 0 ||
    estimado > MAX_ESTIMADO_CENTIMOS
  ) {
    return { ok: false, motivo: 'importe' };
  }

  const ord = orden(p['order']);
  if (ord === null) return { ok: false, motivo: 'orden' };

  return {
    ok: true,
    datos: {
      category,
      concept,
      estimatedCents: estimado,
      order: ord,
      enabled: ACTIVO,
    },
  };
}

/**
 * Una pregunta sugerida. Tiene que estar **entera**: enunciado, la buena y tres
 * falsas distintas. Una sugerencia a medias llegaría a la pareja como algo que
 * no se puede jugar.
 */
export function validarPreguntaSugerida(valor: unknown): ResultadoCatalogo<PreguntaDeCatalogo> {
  if (valor === null || typeof valor !== 'object') return { ok: false, motivo: 'formato' };
  const q = valor as Record<string, unknown>;

  const entera = completa('catalogo', {
    text: q['text'],
    correctAnswer: q['correctAnswer'],
    wrongAnswers: q['wrongAnswers'],
    difficulty: q['difficulty'],
    hint: q['hint'],
  });
  if (!entera) return { ok: false, motivo: 'pregunta' };
  if (q['difficulty'] !== undefined && !esDificultad(q['difficulty'])) {
    return { ok: false, motivo: 'pregunta' };
  }

  const ord = orden(q['order']);
  if (ord === null) return { ok: false, motivo: 'orden' };

  return {
    ok: true,
    datos: {
      text: entera.text,
      correctAnswer: entera.correctAnswer,
      wrongAnswers: entera.wrongAnswers,
      difficulty: entera.difficulty,
      hint: entera.hint,
      order: ord,
      enabled: ACTIVO,
    },
  };
}

export function validarElemento(
  tipo: TipoCatalogo,
  valor: unknown,
): ResultadoCatalogo<TareaDeCatalogo | PartidaDeCatalogo | PreguntaDeCatalogo> {
  switch (tipo) {
    case 'tasks':
      return validarTarea(valor);
    case 'budget':
      return validarPartida(valor);
    case 'quiz':
      return validarPreguntaSugerida(valor);
  }
}

// ---------- lectura tolerante (frontera de confianza) ----------

/**
 * Las tareas de un catálogo leído de Firestore, ya validadas y en orden.
 *
 * Lo que no cuadra se descarta: un documento roto no puede dejar sin lista de
 * tareas a una boda nueva.
 */
export function tareasVolcables(docs: readonly unknown[]): readonly TareaDeCatalogo[] {
  return ordenar(docs.map((d) => validarTarea(d)).flatMap((r) => (r.ok ? [r.datos] : [])));
}

export function partidasVolcables(docs: readonly unknown[]): readonly PartidaDeCatalogo[] {
  return ordenar(docs.map((d) => validarPartida(d)).flatMap((r) => (r.ok ? [r.datos] : [])));
}

function ordenar<T extends { readonly order: number }>(items: readonly T[]): readonly T[] {
  // `sort` es estable: a igual orden se respeta el orden en que llegaron.
  return [...items].sort((a, b) => a.order - b.order);
}

// ---------- los originales de fábrica ----------

/**
 * Lo que se carga al pulsar «Cargar los de fábrica» en un catálogo vacío, y lo
 * que reciben las bodas mientras el catálogo no se haya tocado nunca.
 */
export const TAREAS_DE_FABRICA: readonly TareaDeCatalogo[] = CHECKLIST_PLANTILLA.map((t, i) => ({
  title: t.title,
  category: t.category,
  mesesAntes: t.mesesAntes,
  icon: t.icon,
  priority: t.priority,
  order: i + 1,
  enabled: true,
}));

const partida = (category: string, concept: string): Omit<PartidaDeCatalogo, 'order'> => ({
  category,
  concept,
  estimatedCents: 0,
  enabled: true,
});

export const PARTIDAS_DE_FABRICA: readonly PartidaDeCatalogo[] = [
  partida('Lugar', 'Finca o salón'),
  partida('Comida y bebida', 'Banquete (catering)'),
  partida('Comida y bebida', 'Tarta nupcial'),
  partida('Comida y bebida', 'Barra libre'),
  partida('Proveedores', 'Fotografía'),
  partida('Proveedores', 'Vídeo'),
  partida('Proveedores', 'Música y DJ'),
  partida('Proveedores', 'Flores y decoración'),
  partida('Novios', 'Vestido'),
  partida('Novios', 'Traje'),
  partida('Novios', 'Peluquería y maquillaje'),
  partida('Novios', 'Alianzas'),
  partida('Invitados', 'Invitaciones y papelería'),
  partida('Invitados', 'Detalles para los invitados'),
  partida('Invitados', 'Transporte'),
  partida('Ceremonia', 'Oficiante / tasas de la ceremonia'),
  partida('Otros', 'Imprevistos'),
].map((p, i) => ({ ...p, order: i + 1 }));

const sugerida = (
  text: string,
  correctAnswer: string,
  wrongAnswers: readonly string[],
  difficulty: Dificultad = 1,
): PreguntaDeCatalogo => ({
  text,
  correctAnswer,
  wrongAnswers,
  difficulty,
  hint: null,
  order: 0,
  enabled: true,
});

/**
 * Preguntas de ejemplo. Las respuestas son **de muestra**: la pareja las
 * cambia por las suyas. Por eso «Añadir a nuestro quiz» las crea apagadas.
 */
export const PREGUNTAS_DE_FABRICA: readonly PreguntaDeCatalogo[] = [
  sugerida('¿En qué ciudad nos conocimos?', 'Madrid', ['Sevilla', 'Valencia', 'Bilbao']),
  sugerida('¿Cuántos años llevamos juntos?', '5', ['2', '8', '10']),
  sugerida('¿Dónde fue nuestro primer viaje juntos?', 'Lisboa', ['París', 'Roma', 'Londres']),
  sugerida('¿Quién dijo «te quiero» primero?', 'Ella', [
    'Él',
    'Los dos a la vez',
    'Nadie lo recuerda',
  ]),
  sugerida('¿Cuál es nuestra comida favorita para compartir?', 'Pizza', [
    'Sushi',
    'Paella',
    'Tacos',
  ]),
  sugerida(
    '¿Cómo fue la pedida?',
    'Sorpresa en un viaje',
    ['En casa con la familia', 'En un restaurante', 'En la playa al atardecer'],
    2,
  ),
  sugerida(
    '¿Qué canción es «nuestra canción»?',
    'Perfect',
    ['Yellow', 'Thinking Out Loud', 'Wonderwall'],
    2,
  ),
  sugerida(
    '¿Cuál es el mayor defecto de él según ella?',
    'La impuntualidad',
    ['El desorden', 'Los ronquidos', 'Las bromas malas'],
    3,
  ),
].map((q, i) => ({ ...q, order: i + 1 }));

export function deFabrica(tipo: TipoCatalogo): readonly Record<string, unknown>[] {
  const lista =
    tipo === 'tasks'
      ? TAREAS_DE_FABRICA
      : tipo === 'budget'
        ? PARTIDAS_DE_FABRICA
        : PREGUNTAS_DE_FABRICA;
  return lista as unknown as readonly Record<string, unknown>[];
}
