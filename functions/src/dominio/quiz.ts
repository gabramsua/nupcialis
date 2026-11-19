/**
 * El quiz de la boda (§8.7).
 *
 * **COPIA LITERAL** de `src/app/features/public-site/quiz/quiz.ts`.
 * Si tocas una, toca la otra: lo vigila `quiz.spec.ts`.
 *
 * La regla que ordena todo este fichero es la **cuarta de oro**: el quiz se
 * corrige en servidor. Por eso hay dos formas de una pregunta y no una:
 *
 * - `PreguntaDelPanel` es la que escribe la pareja, con su respuesta correcta.
 * - `PreguntaDeJuego` es la que viaja al navegador del invitado: las cuatro
 *   opciones barajadas y **ni rastro de cuál es la buena**.
 *
 * Esto no es paranoia: el prototipo corregía en cliente, y con la consola
 * abierta se podía leer la respuesta antes de contestar y escribir la
 * puntuación que uno quisiera. En un juego que se proyecta en una pantalla
 * durante el banquete, eso lo arruina.
 */

// === COPIA LITERAL: de aquí al final, idéntico en cliente y funciones ===

export const MAX_PREGUNTAS_BANCO = 200;
export const MAX_TEXTO = 200;
export const MAX_OPCION = 80;
export const MAX_PISTA = 140;

/** Cuántas preguntas tiene una partida, si la pareja no dice otra cosa. */
export const PREGUNTAS_POR_PARTIDA = 10;
export const MIN_POR_PARTIDA = 3;
export const MAX_POR_PARTIDA = 30;

/**
 * Cuántos salen en el ranking.
 *
 * Veinte, decisión de Gabriel (`D-11`). Es bastante más que las diez del
 * prototipo a propósito: en una boda de cien invitados, un ranking de diez deja
 * fuera al 90 % y deja de ser un aliciente para seguir jugando.
 */
export const TOPE_RANKING = 20;

/** Las tres dificultades y lo que valen. Un acierto fácil no vale lo mismo. */
export const PUNTOS = { 1: 10, 2: 20, 3: 30 } as const;
export type Dificultad = keyof typeof PUNTOS;

export function esDificultad(valor: unknown): valor is Dificultad {
  return valor === 1 || valor === 2 || valor === 3;
}

/** Cuántas opciones tiene una pregunta: la buena y tres malas. */
export const OPCIONES_POR_PREGUNTA = 4;

/** La pregunta tal como la escribe la pareja. Lleva la respuesta buena. */
export interface PreguntaDelPanel {
  readonly id: string;
  readonly text: string;
  readonly correctAnswer: string;
  readonly wrongAnswers: readonly string[];
  readonly difficulty: Dificultad;
  readonly hint: string | null;
  readonly enabled: boolean;
  readonly order: number;
}

/**
 * La pregunta tal como viaja al invitado.
 *
 * Sin `correctAnswer`: no está «oculta», es que **no se manda**. Una propiedad
 * marcada como secreta dentro de un objeto que llega al navegador no es un
 * secreto, es una invitación.
 */
export interface PreguntaDeJuego {
  readonly id: string;
  readonly text: string;
  readonly difficulty: Dificultad;
  readonly puntos: number;
  readonly hint: string | null;
  /** Las cuatro, ya barajadas por el servidor. */
  readonly opciones: readonly string[];
}

function texto(valor: unknown, maximo: number): string {
  if (typeof valor !== 'string') return '';
  return valor.replace(/\s+/g, ' ').trim().slice(0, maximo);
}

/**
 * Deja el banco utilizable. Nunca lanza.
 *
 * Una pregunta solo cuenta si está **entera**: enunciado, la correcta y las
 * tres falsas, todas distintas. A medio escribir no se juega —saldría una
 * pregunta con dos opciones, o con la correcta repetida como señuelo— y la
 * pantalla del panel avisa de las que están así.
 */
export function sanearPreguntas(valor: unknown): readonly PreguntaDelPanel[] {
  if (!Array.isArray(valor)) return [];

  const salida: PreguntaDelPanel[] = [];
  const vistos = new Set<string>();

  for (const crudo of valor) {
    if (crudo === null || typeof crudo !== 'object') continue;

    const p = crudo as Record<string, unknown>;
    const id = texto(p['id'], 60);
    if (id === '' || vistos.has(id)) continue;
    if (p['enabled'] === false) continue;

    const pregunta = completa(id, p);
    if (!pregunta) continue;

    vistos.add(id);
    salida.push(pregunta);
    if (salida.length === MAX_PREGUNTAS_BANCO) break;
  }

  return salida.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

/** Una pregunta entera, o `null`. Ver `sanearPreguntas`. */
export function completa(id: string, p: Record<string, unknown>): PreguntaDelPanel | null {
  const text = texto(p['text'], MAX_TEXTO);
  const correctAnswer = texto(p['correctAnswer'], MAX_OPCION);
  const brutas = Array.isArray(p['wrongAnswers']) ? p['wrongAnswers'] : [];
  const wrongAnswers = brutas.map((w) => texto(w, MAX_OPCION)).filter((w) => w !== '');

  if (text === '' || correctAnswer === '') return null;
  if (wrongAnswers.length !== OPCIONES_POR_PREGUNTA - 1) return null;

  // Una señuelo igual que la correcta deja la pregunta sin respuesta posible.
  const distintas = new Set([correctAnswer, ...wrongAnswers]);
  if (distintas.size !== OPCIONES_POR_PREGUNTA) return null;

  const hint = texto(p['hint'], MAX_PISTA);

  return {
    id,
    text,
    correctAnswer,
    wrongAnswers,
    difficulty: esDificultad(p['difficulty']) ? p['difficulty'] : 1,
    hint: hint === '' ? null : hint,
    enabled: p['enabled'] !== false,
    order: typeof p['order'] === 'number' && Number.isFinite(p['order']) ? p['order'] : 0,
  };
}

/** Cuántas preguntas por partida, dentro de lo razonable. */
export function preguntasPorPartida(valor: unknown): number {
  if (typeof valor !== 'number' || !Number.isFinite(valor)) return PREGUNTAS_POR_PARTIDA;
  return Math.min(MAX_POR_PARTIDA, Math.max(MIN_POR_PARTIDA, Math.round(valor)));
}

/**
 * Baraja sin tocar el original.
 *
 * El azar entra como parámetro para que las pruebas puedan fijarlo: un test que
 * dependa de `Math.random` o pasa siempre o falla un día de cada cien, y las
 * dos cosas son inútiles.
 */
export function barajar<T>(items: readonly T[], azar: () => number = Math.random): T[] {
  const copia = [...items];
  for (let i = copia.length - 1; i > 0; i -= 1) {
    const j = Math.floor(azar() * (i + 1));
    const uno = copia[i];
    const otro = copia[j];
    if (uno === undefined || otro === undefined) continue;
    copia[i] = otro;
    copia[j] = uno;
  }
  return copia;
}

/**
 * Las preguntas de una partida: N al azar del banco.
 *
 * Si el banco tiene menos de las que pide la configuración, se juegan las que
 * haya. Es mejor una partida corta que un mensaje de error en mitad del
 * banquete.
 */
export function elegirPreguntas(
  banco: readonly PreguntaDelPanel[],
  cuantas: number,
  azar: () => number = Math.random,
): readonly PreguntaDelPanel[] {
  return barajar(banco, azar).slice(0, Math.max(0, Math.min(cuantas, banco.length)));
}

/** La pregunta como la ve el invitado, con las opciones ya barajadas. */
export function paraJugar(
  pregunta: PreguntaDelPanel,
  azar: () => number = Math.random,
): PreguntaDeJuego {
  return {
    id: pregunta.id,
    text: pregunta.text,
    difficulty: pregunta.difficulty,
    puntos: PUNTOS[pregunta.difficulty],
    hint: pregunta.hint,
    opciones: barajar([pregunta.correctAnswer, ...pregunta.wrongAnswers], azar),
  };
}

export interface Puntuacion {
  readonly points: number;
  readonly aciertos: number;
  readonly answeredCount: number;
}

/**
 * Corrige una partida. **Solo se ejecuta en el servidor.**
 *
 * Se compara el texto de la opción elegida y no un índice: el cliente recibe
 * las opciones barajadas y devolver «la 2» obligaría a guardar el orden exacto
 * que se le mandó a cada uno. Comparar el texto es más simple y no se puede
 * desincronizar.
 *
 * Lo que no se contesta no resta: el juego premia acertar, no arriesgar.
 */
export function puntuar(
  preguntas: readonly PreguntaDelPanel[],
  respuestas: Readonly<Record<string, unknown>>,
): Puntuacion {
  let points = 0;
  let aciertos = 0;
  let answeredCount = 0;

  for (const pregunta of preguntas) {
    const elegida = respuestas[pregunta.id];
    if (typeof elegida !== 'string' || elegida === '') continue;

    answeredCount += 1;
    if (elegida === pregunta.correctAnswer) {
      aciertos += 1;
      points += PUNTOS[pregunta.difficulty];
    }
  }

  return { points, aciertos, answeredCount };
}

export interface ResultadoQuiz {
  readonly id: string;
  readonly guestId: string;
  readonly displayName: string;
  readonly points: number;
  /** Desempate: a igual puntuación gana quien lo resolvió más rápido. */
  readonly elapsedMs: number;
}

export interface PuestoRanking extends ResultadoQuiz {
  /** Empezando en 1. Dos empatados de verdad comparten puesto. */
  readonly puesto: number;
}

/**
 * El ranking: mejor puntuación primero y, a igualdad, el más rápido.
 *
 * **Una entrada por invitado**: su mejor partida. Como se puede repetir sin
 * límite (`D-11`), sin esto el ranking lo llenaría quien más veces jugara, que
 * no es lo mismo que quien mejor lo hace.
 */
export function ranking(
  resultados: readonly ResultadoQuiz[],
  tope: number = TOPE_RANKING,
): readonly PuestoRanking[] {
  const mejorPorInvitado = new Map<string, ResultadoQuiz>();

  for (const resultado of resultados) {
    const previo = mejorPorInvitado.get(resultado.guestId);
    if (!previo || mejor(resultado, previo) < 0) mejorPorInvitado.set(resultado.guestId, resultado);
  }

  const ordenados = [...mejorPorInvitado.values()].sort(mejor).slice(0, Math.max(0, tope));

  let puesto = 0;
  let anterior: ResultadoQuiz | null = null;

  return ordenados.map((resultado, n) => {
    // Mismo puesto solo si empatan en las dos cosas; si no, el desempate ya ha
    // decidido y enseñar el mismo número confundiría.
    if (
      !anterior ||
      anterior.points !== resultado.points ||
      anterior.elapsedMs !== resultado.elapsedMs
    ) {
      puesto = n + 1;
    }
    anterior = resultado;
    return { ...resultado, puesto };
  });
}

function mejor(a: ResultadoQuiz, b: ResultadoQuiz): number {
  return b.points - a.points || a.elapsedMs - b.elapsedMs || a.id.localeCompare(b.id);
}

/**
 * Una fila del ranking, tal como viaja al navegador del invitado.
 *
 * Lleva **lo justo para pintarla**: el puesto, el nombre y los puntos. Se
 * quedan fuera el `guestId` —un identificador que el invitado no necesita y
 * que serviría para cruzar datos— y el `elapsedMs`, que decide el desempate
 * pero no se le enseña a nadie (§8.7). Y el teléfono, por supuesto, no está ni
 * en el origen.
 */
export interface FilaRanking {
  readonly id: string;
  readonly puesto: number;
  readonly displayName: string;
  readonly points: number;
  /** Para destacarle su propia fila sin que el navegador tenga que adivinarla. */
  readonly esMio: boolean;
}

/** Deja la tabla lista para enviar: nombres limpios y sin datos de más. */
export function paraEnviar(
  tabla: readonly PuestoRanking[],
  guestId: string,
): readonly FilaRanking[] {
  return tabla.map((puesto) => ({
    id: puesto.id,
    puesto: puesto.puesto,
    displayName: nombreEnRanking(puesto.displayName),
    points: puesto.points,
    esMio: puesto.guestId === guestId,
  }));
}

/**
 * El nombre con el que alguien sale en el ranking público (`D-11`).
 *
 * **El nombre completo, tal como lo escribió la pareja.** Lo que no sale nunca
 * son los dígitos del teléfono: en el modo B son la mitad de la credencial con
 * la que se entra —nombre y cuatro dígitos, regla de oro 3—, así que ponerlos
 * al lado del nombre en una pantalla que ve toda la boda sería repartir las
 * llaves. El teléfono lo ve la pareja en su panel, que es quien necesita saber
 * quién es quién.
 *
 * El nombre entero desambigua a dos Pepes igual de bien que los dígitos, y no
 * dice nada que los invitados de esa boda no sepan ya.
 */
export function nombreEnRanking(nombreCompleto: string): string {
  const limpio = nombreCompleto
    // Última línea de defensa: por aquí es por donde podrían colarse unos
    // dígitos a la pantalla que ve toda la boda, si alguien escribiera el
    // teléfono dentro del nombre en la lista de invitados. Un nombre de
    // persona no lleva números.
    .replace(/\d/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_NOMBRE_RANKING)
    .trim();

  return limpio === '' ? 'Invitado' : limpio;
}

/** Lo que cabe en una fila del ranking sin romperla en un móvil. */
export const MAX_NOMBRE_RANKING = 40;
