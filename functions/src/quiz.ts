/**
 * El quiz de la boda: jugar, puntuar y el ranking (§8.7).
 *
 * Cuatro funciones. Las dos del invitado existen **porque la corrección va en
 * servidor** (regla de oro 4), y el reparto entre ellas es lo que lo hace
 * verdad:
 *
 * - `startQuiz` elige las preguntas, las baraja, **guarda la partida** y manda
 *   al navegador las opciones sin decir cuál es la buena.
 * - `submitQuiz` recibe lo contestado, lo compara con lo guardado y escribe la
 *   puntuación. El cliente no manda puntos: manda respuestas.
 *
 * El **tiempo también se mide aquí**, entre lo que guardó `startQuiz` y el
 * momento de enviar. Si lo midiera el navegador, el desempate del ranking
 * —a igual puntuación gana el más rápido— se ganaría editando un número.
 *
 * Una partida se puede jugar las veces que se quiera (`D-11`), así que el
 * ranking se queda con **la mejor de cada invitado**: si no, lo llenaría quien
 * más veces juega, que no es quien mejor lo hace.
 *
 * Aquí **solo** hay invocables del invitado. Lo de la pareja —vaciar el
 * ranking— vive en `quiz-admin.ts`, y no por orden: `verificacion.spec.ts`
 * comprueba que toda invocable de un fichero del invitado verifica el nivel de
 * la sesión, y mezclar las dos audiencias en un fichero convertiría esa
 * comprobación en una cuenta que hay que ir ajustando a mano. Separarlas la
 * deja diciendo la verdad sola.
 */

import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import {
  elegirPreguntas,
  paraEnviar,
  paraJugar,
  preguntasPorPartida,
  puntuar,
  ranking,
  sanearPreguntas,
  TOPE_RANKING,
  type PreguntaDeJuego,
  type PreguntaDelPanel,
  type FilaRanking,
  type ResultadoQuiz,
} from './dominio/quiz';
import { esModoAcceso, type ModoAcceso } from './dominio/acceso';
import { EXIGIR_APP_CHECK, REGION, db } from './firebase';
import { exigirInvitado, exigirVerificado } from './infra/permisos';

/**
 * Cuánto vale una partida empezada.
 *
 * Media hora. Pasado eso se considera abandonada: alguien que abrió el juego,
 * dejó el móvil en la mesa y volvió al postre no debería mandar un tiempo de
 * dos horas y hundirse en el desempate, ni guardar partidas vivas para
 * siempre.
 */
const PARTIDA_CADUCA_MS = 30 * 60 * 1000;

/** Lo que se guarda de una partida mientras se juega. */
interface PartidaGuardada {
  readonly guestId: string;
  readonly preguntas: readonly PreguntaDelPanel[];
  readonly startedAt: Timestamp;
  readonly submitted: boolean;
  /** Preguntas en las que pidió la pista: sus aciertos valen la mitad. */
  readonly hintsUsed?: readonly string[];
}

interface Boda {
  readonly modo: ModoAcceso;
  readonly porPartida: number;
  readonly rankingVisible: boolean;
}

/**
 * La boda, con lo que el quiz necesita de ella.
 *
 * Una boda que no está activa no tiene quiz, aunque el invitado tenga una
 * sesión válida de hace un rato: el token dura 24 h.
 */
async function boda(weddingId: string): Promise<Boda> {
  const snap = await db().doc(`weddings/${weddingId}`).get();
  const datos = snap.data();

  if (!snap.exists || datos?.['status'] !== 'active') {
    throw new HttpsError('not-found', 'Esta boda no está disponible.');
  }

  const modulos = datos['modules'];
  const quiz =
    modulos !== null && typeof modulos === 'object'
      ? (modulos as Record<string, unknown>)['quiz']
      : null;
  const config =
    quiz !== null && typeof quiz === 'object' ? (quiz as Record<string, unknown>)['config'] : null;
  const ajustes =
    config !== null && typeof config === 'object' ? (config as Record<string, unknown>) : {};

  const modo = datos['guestAccessMode'];

  return {
    modo: esModoAcceso(modo) ? modo : 'open',
    porPartida: preguntasPorPartida(ajustes['questionsPerGame']),
    // Ausente es visible: un ranking que no se ve no es un ranking.
    rankingVisible: ajustes['rankingVisible'] !== false,
  };
}

/** El banco de preguntas, ya saneado: solo las que se pueden jugar. */
async function banco(weddingId: string): Promise<readonly PreguntaDelPanel[]> {
  const snap = await db().collection(`weddings/${weddingId}/quizQuestions`).get();
  return sanearPreguntas(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
}

export interface PartidaNueva {
  readonly gameId: string;
  readonly preguntas: readonly PreguntaDeJuego[];
}

/**
 * Empieza una partida.
 *
 * Lo que vuelve no lleva las respuestas correctas, ni marcadas ni ordenadas de
 * forma que se adivinen: las opciones van barajadas aquí.
 */
export const startQuiz = onCall(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK },
  async (peticion): Promise<PartidaNueva> => {
    const invitado = exigirInvitado(peticion);
    const datos = await boda(invitado.weddingId);
    exigirVerificado(invitado, datos.modo);

    const preguntas = elegirPreguntas(await banco(invitado.weddingId), datos.porPartida);
    if (preguntas.length === 0) {
      throw new HttpsError('failed-precondition', 'Esta boda todavía no tiene preguntas.');
    }

    const partida = db().collection(`weddings/${invitado.weddingId}/quizGames`).doc();
    await partida.set({
      guestId: invitado.guestId,
      // Se guardan **enteras**, con su respuesta correcta: es lo que permite
      // corregir sin volver a leer el banco, que para entonces puede haber
      // cambiado si la pareja estaba editando preguntas a la vez.
      preguntas,
      startedAt: FieldValue.serverTimestamp(),
      submitted: false,
    });

    return { gameId: partida.id, preguntas: preguntas.map((pregunta) => paraJugar(pregunta)) };
  },
);

/**
 * Da la pista de una pregunta de la partida en curso.
 *
 * **La pista no viaja con la pregunta**: pedirla cuesta la mitad de los puntos
 * de esa pregunta, y el navegador no puede tenerla antes de que el invitado
 * acepte pagarla. Aquí se apunta que la ha pedido —lo que decide la
 * puntuación— y solo entonces se le devuelve el texto. Pedirla dos veces no
 * cobra dos veces.
 */
export const getQuizHint = onCall(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK },
  async (peticion): Promise<{ readonly hint: string }> => {
    const invitado = exigirInvitado(peticion);
    const datos = await boda(invitado.weddingId);
    exigirVerificado(invitado, datos.modo);

    const cuerpo = (peticion.data ?? {}) as Record<string, unknown>;
    const gameId = typeof cuerpo['gameId'] === 'string' ? cuerpo['gameId'] : '';
    const questionId = typeof cuerpo['questionId'] === 'string' ? cuerpo['questionId'] : '';
    if (gameId === '' || questionId === '') {
      throw new HttpsError('invalid-argument', 'Falta la partida o la pregunta.');
    }

    const ref = db().doc(`weddings/${invitado.weddingId}/quizGames/${gameId}`);
    const snap = await ref.get();
    const partida = snap.data() as PartidaGuardada | undefined;

    if (!snap.exists || !partida) throw new HttpsError('not-found', 'Esa partida no existe.');
    if (partida.guestId !== invitado.guestId) {
      throw new HttpsError('permission-denied', 'Esa partida no es tuya.');
    }
    if (partida.submitted === true) {
      throw new HttpsError('failed-precondition', 'Esa partida ya está entregada.');
    }

    const pregunta = (partida.preguntas ?? []).find((p) => p.id === questionId);
    if (!pregunta || pregunta.hint === null) {
      throw new HttpsError('not-found', 'Esa pregunta no tiene pista.');
    }

    await ref.update({ hintsUsed: FieldValue.arrayUnion(questionId) });
    return { hint: pregunta.hint };
  },
);

export interface PartidaTerminada {
  readonly points: number;
  readonly total: number;
  readonly elapsedMs: number;
  /** Su puesto en el ranking, o `null` si el ranking está apagado. */
  readonly puesto: number | null;
  /** Para pintar la pantalla final sin otra llamada. */
  readonly ranking: readonly FilaRanking[];
}

/**
 * Entrega una partida y la puntúa.
 *
 * `respuestas` es `{ idDePregunta: textoElegido }`. Se compara el **texto** y
 * no un índice porque las opciones viajaron barajadas: guardar el orden exacto
 * que se le mandó a cada uno para luego traducir «la 2» sería más código y un
 * sitio más donde desincronizarse.
 */
export const submitQuiz = onCall(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK },
  async (peticion): Promise<PartidaTerminada> => {
    const invitado = exigirInvitado(peticion);
    const datos = await boda(invitado.weddingId);
    exigirVerificado(invitado, datos.modo);

    const cuerpo = (peticion.data ?? {}) as Record<string, unknown>;
    const gameId = typeof cuerpo['gameId'] === 'string' ? cuerpo['gameId'] : '';
    const respuestas =
      cuerpo['respuestas'] !== null && typeof cuerpo['respuestas'] === 'object'
        ? (cuerpo['respuestas'] as Record<string, unknown>)
        : {};

    if (gameId === '') throw new HttpsError('invalid-argument', 'Falta la partida.');

    const base = db();
    const ref = base.doc(`weddings/${invitado.weddingId}/quizGames/${gameId}`);
    const snap = await ref.get();
    const partida = snap.data() as PartidaGuardada | undefined;

    if (!snap.exists || !partida) {
      throw new HttpsError('not-found', 'Esa partida no existe.');
    }

    // La partida es de quien la empezó. Sin esto, cualquiera podría entregar la
    // de otro con las respuestas que quisiera.
    if (partida.guestId !== invitado.guestId) {
      throw new HttpsError('permission-denied', 'Esa partida no es tuya.');
    }

    // Una partida se entrega una vez. Si no, se podría reenviar la misma
    // corrigiendo los fallos hasta sacar el pleno.
    if (partida.submitted === true) {
      throw new HttpsError('failed-precondition', 'Esa partida ya está entregada.');
    }

    const empezada = partida.startedAt?.toMillis?.() ?? Date.now();
    const elapsedMs = Math.max(0, Date.now() - empezada);
    if (elapsedMs > PARTIDA_CADUCA_MS) {
      await ref.update({ submitted: true });
      throw new HttpsError('deadline-exceeded', 'Esa partida se quedó abierta demasiado tiempo.');
    }

    const preguntas = partida.preguntas ?? [];
    const conPista = new Set(partida.hintsUsed ?? []);
    const puntos = puntuar(preguntas, respuestas, conPista);

    const invitadoRef = base.doc(`weddings/${invitado.weddingId}/guests/${invitado.guestId}`);
    const invitadoSnap = await invitadoRef.get();
    const nombre =
      typeof invitadoSnap.data()?.['fullName'] === 'string'
        ? (invitadoSnap.data()?.['fullName'] as string)
        : '';

    const lote = base.batch();

    // La partida se guarda, y justo después se podan las que ya no están
    // entre las mejores: **lo que no entra en el ranking no se guarda**
    // (`D-11`). Una boda de trescientos invitados jugando sin límite llenaría
    // la colección de partidas que nadie va a mirar nunca.
    lote.set(base.collection(`weddings/${invitado.weddingId}/quizResults`).doc(), {
      guestId: invitado.guestId,
      // Se guarda el nombre completo y **el ranking lo acorta al leerlo**: si
      // se guardara ya acortado, cambiar la regla de `D-11` obligaría a
      // reescribir todas las partidas jugadas.
      fullName: nombre,
      points: puntos.points,
      elapsedMs,
      answeredCount: puntos.answeredCount,
      playedAt: FieldValue.serverTimestamp(),
    });

    lote.update(ref, { submitted: true });

    // Estadística por pregunta: cuántos la contestan, cuántos la aciertan y
    // cuántos piden la pista. En su propia colección y escrita solo por aquí:
    // la pareja la lee (para ver cuáles son fáciles y cuáles difíciles), pero
    // no puede tocarla, ni se pierde al editar la pregunta.
    for (const pregunta of preguntas) {
      const elegida = respuestas[pregunta.id];
      if (typeof elegida !== 'string' || elegida === '') continue;

      lote.set(
        base.doc(`weddings/${invitado.weddingId}/quizStats/${pregunta.id}`),
        {
          asked: FieldValue.increment(1),
          correct: FieldValue.increment(elegida === pregunta.correctAnswer ? 1 : 0),
          hints: FieldValue.increment(conPista.has(pregunta.id) ? 1 : 0),
        },
        { merge: true },
      );
    }

    lote.set(
      invitadoRef,
      {
        quizPlayCount: FieldValue.increment(1),
        quizBestPoints: Math.max(
          puntos.points,
          typeof invitadoSnap.data()?.['quizBestPoints'] === 'number'
            ? (invitadoSnap.data()?.['quizBestPoints'] as number)
            : 0,
        ),
      },
      { merge: true },
    );

    await lote.commit();
    await podarResultados(invitado.weddingId);

    const tabla = datos.rankingVisible
      ? await leerRanking(invitado.weddingId, invitado.guestId)
      : [];

    // Solo los puntos y la posición. **No se revela cuál era la correcta**, ni
    // cuántas ha acertado: el juego es un desafío y las respuestas no se cuentan.
    return {
      points: puntos.points,
      total: preguntas.length,
      elapsedMs,
      puesto: tabla.find((fila) => fila.esMio)?.puesto ?? null,
      ranking: tabla,
    };
  },
);

/**
 * Deja en `quizResults` solo lo que está en el ranking.
 *
 * `D-11`: las puntuaciones que no entran **no se guardan**. Esto se hace
 * después de escribir, y no antes, porque la partida que acaba de jugarse
 * puede entrar y echar a otra; y se hace aquí y no en un trigger porque un
 * trigger sobre la misma colección que escribe es la forma más cara de
 * equivocarse.
 *
 * Nunca lanza: si la poda falla, lo peor que pasa es que sobren documentos.
 * Tumbar la entrega de una partida por no poder limpiar sería absurdo.
 */
async function podarResultados(weddingId: string): Promise<void> {
  try {
    const base = db();
    const snap = await base
      .collection(`weddings/${weddingId}/quizResults`)
      .orderBy('points', 'desc')
      .orderBy('elapsedMs', 'asc')
      .get();

    const resultados: ResultadoQuiz[] = snap.docs.map((d) => aResultado(d.id, d.data()));
    const sobreviven = new Set(ranking(resultados).map((puesto) => puesto.id));

    const sobran = snap.docs.filter((d) => !sobreviven.has(d.id));
    if (sobran.length === 0) return;

    const lote = base.batch();
    for (const documento of sobran.slice(0, 400)) lote.delete(documento.ref);
    await lote.commit();
  } catch {
    // Ver arriba: la poda es limpieza, no parte de la entrega.
  }
}

/** Una fila de `quizResults`, comprobada. */
function aResultado(id: string, datos: FirebaseFirestore.DocumentData): ResultadoQuiz {
  return {
    id,
    guestId: typeof datos['guestId'] === 'string' ? datos['guestId'] : '',
    displayName: typeof datos['fullName'] === 'string' ? datos['fullName'] : '',
    points: typeof datos['points'] === 'number' ? datos['points'] : 0,
    elapsedMs: typeof datos['elapsedMs'] === 'number' ? datos['elapsedMs'] : 0,
  };
}

/**
 * El ranking que ve un invitado.
 *
 * Lo que viaja es **el nombre completo y los puntos**, nada más (`D-11`). El
 * teléfono no sale de aquí en ninguna forma, tampoco recortado: sus cuatro
 * últimos dígitos son la mitad de la credencial del modo B —nombre y cuatro
 * dígitos, regla de oro 3— y el ranking lo ve toda la boda.
 *
 * Va aparte `mio`, la mejor partida de quien pregunta, porque la pregunta que
 * se hace quien no sale en la tabla es «¿cuánto me falta?».
 */
async function leerRanking(weddingId: string, guestId: string): Promise<readonly FilaRanking[]> {
  const snap = await db()
    .collection(`weddings/${weddingId}/quizResults`)
    .orderBy('points', 'desc')
    .orderBy('elapsedMs', 'asc')
    // La colección va podada (ver `podarResultados`), así que con un poco más
    // del tope sobra. El margen es por si una poda falló: leer de menos
    // dejaría fuera a alguien que sí está entre los mejores.
    .limit(TOPE_RANKING * 3)
    .get();

  const resultados = snap.docs.map((d) => aResultado(d.id, d.data()));

  return paraEnviar(ranking(resultados), guestId);
}

export interface RankingQuiz {
  readonly puestos: readonly FilaRanking[];
  readonly visible: boolean;
}

/**
 * El ranking para el invitado.
 *
 * **También exige nivel verificado** (regla de oro 3), y no por costumbre: la
 * tabla lleva nombres de invitados de esta boda, que es información sobre
 * quién va. Quien solo ha abierto el enlace reenviado por un tercero no tiene
 * por qué verla, y además no podría jugar, que es para lo que sirve mirarla.
 */
export const listQuizRanking = onCall(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK },
  async (peticion): Promise<RankingQuiz> => {
    const invitado = exigirInvitado(peticion);
    const datos = await boda(invitado.weddingId);
    exigirVerificado(invitado, datos.modo);

    // Apagado por la pareja: se dice que está apagado, no se devuelve vacío.
    // Un ranking vacío y un ranking escondido se ven igual y no son lo mismo.
    if (!datos.rankingVisible) return { puestos: [], visible: false };

    return { puestos: await leerRanking(invitado.weddingId, invitado.guestId), visible: true };
  },
);
