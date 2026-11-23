/**
 * Los catálogos del superadmin vistos desde el navegador: tareas y partidas de
 * presupuesto «originales», y preguntas sugeridas para el quiz.
 *
 * Frontera de confianza (D-19): lo que llega de Firestore es `unknown` hasta que
 * pasa por los lectores de aquí. Un documento roto se descarta; no tumba la
 * pantalla ni, en el panel de la pareja, la lista de sugerencias.
 */

export const TIPOS_CATALOGO = ['tasks', 'budget', 'quiz'] as const;
export type TipoCatalogo = (typeof TIPOS_CATALOGO)[number];

export const PRIORIDADES = ['low', 'normal', 'high'] as const;
export type Prioridad = (typeof PRIORIDADES)[number];

export type Dificultad = 1 | 2 | 3;

export interface TareaDeCatalogo {
  readonly id: string;
  readonly title: string;
  readonly category: string;
  readonly mesesAntes: number;
  readonly icon: string;
  readonly priority: Prioridad;
  readonly order: number;
  readonly enabled: boolean;
}

export interface PartidaDeCatalogo {
  readonly id: string;
  readonly category: string;
  readonly concept: string;
  readonly estimatedCents: number;
  readonly order: number;
  readonly enabled: boolean;
}

export interface PreguntaDeCatalogo {
  readonly id: string;
  readonly text: string;
  readonly correctAnswer: string;
  readonly wrongAnswers: readonly [string, string, string];
  readonly difficulty: Dificultad;
  readonly hint: string | null;
  readonly order: number;
  readonly enabled: boolean;
}

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim() : '';
}

function numero(valor: unknown, porDefecto: number): number {
  return typeof valor === 'number' && Number.isFinite(valor) ? valor : porDefecto;
}

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return valor !== null && typeof valor === 'object';
}

export function leerTarea(id: string, crudo: unknown): TareaDeCatalogo | null {
  if (!esObjeto(crudo)) return null;
  const title = texto(crudo['title']);
  const category = texto(crudo['category']);
  if (title === '') return null;

  const prioridad = crudo['priority'];
  return {
    id,
    title,
    category,
    mesesAntes: Math.max(0, numero(crudo['mesesAntes'], 0)),
    icon: texto(crudo['icon']),
    priority: (PRIORIDADES as readonly unknown[]).includes(prioridad)
      ? (prioridad as Prioridad)
      : 'normal',
    order: numero(crudo['order'], 0),
    enabled: crudo['enabled'] !== false,
  };
}

export function leerPartida(id: string, crudo: unknown): PartidaDeCatalogo | null {
  if (!esObjeto(crudo)) return null;
  const category = texto(crudo['category']);
  const concept = texto(crudo['concept']);
  if (category === '' || concept === '') return null;

  const estimado = numero(crudo['estimatedCents'], 0);
  return {
    id,
    category,
    concept,
    estimatedCents: Number.isInteger(estimado) && estimado >= 0 ? estimado : 0,
    order: numero(crudo['order'], 0),
    enabled: crudo['enabled'] !== false,
  };
}

export function leerPregunta(id: string, crudo: unknown): PreguntaDeCatalogo | null {
  if (!esObjeto(crudo)) return null;
  const text = texto(crudo['text']);
  const correctAnswer = texto(crudo['correctAnswer']);
  const malas = Array.isArray(crudo['wrongAnswers']) ? crudo['wrongAnswers'].map(texto) : [];
  const [a, b, c] = malas;
  if (text === '' || correctAnswer === '' || !a || !b || !c || malas.length !== 3) return null;

  const dificultad = crudo['difficulty'];
  const pista = texto(crudo['hint']);
  return {
    id,
    text,
    correctAnswer,
    wrongAnswers: [a, b, c],
    difficulty: dificultad === 2 || dificultad === 3 ? dificultad : 1,
    hint: pista === '' ? null : pista,
    order: numero(crudo['order'], 0),
    enabled: crudo['enabled'] !== false,
  };
}

export function porOrden<T extends { readonly order: number; readonly id: string }>(
  items: readonly T[],
): readonly T[] {
  return [...items].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

/** El siguiente número de orden libre: lo que se propone al añadir uno nuevo. */
export function siguienteOrden(items: readonly { readonly order: number }[]): number {
  return items.reduce((max, i) => Math.max(max, i.order), 0) + 1;
}
