/**
 * El quiz, del lado de la pareja (§8.7).
 *
 * Aparte de `quiz.ts` a propósito: ahí están las invocables del **invitado**, y
 * `verificacion.spec.ts` exige que todas verifiquen el nivel de la sesión.
 * Esta no es del invitado —la llama la pareja con su propia sesión— y meterla
 * allí obligaría a aflojar esa comprobación, que es justo lo que no se puede
 * hacer con una regla de oro.
 */

import { onCall } from 'firebase-functions/v2/https';

import { TOPE_RANKING, ranking, type ResultadoQuiz } from './dominio/quiz';
import { EXIGIR_APP_CHECK, REGION, db } from './firebase';
import { exigirPareja } from './infra/permisos';

export interface JugadorDelQuiz {
  readonly guestId: string;
  readonly nombre: string;
  /**
   * El teléfono **sí** sale aquí, y solo aquí (`D-11`).
   *
   * Esta tabla la ve la pareja con su sesión, y es lo que le permite saber
   * cuál de los dos «Pepe García» de su lista es el que va primero. En el
   * ranking público no sale ni recortado: allí esos cuatro dígitos serían
   * media credencial del modo B.
   */
  readonly telefono: string | null;
  readonly partidas: number;
  readonly puntos: number;
  readonly puesto: number;
}

/**
 * Quién ha jugado y qué hizo (§8.7).
 *
 * Es **el ranking con el teléfono**: las mismas filas que ve el invitado, más
 * el dato que la pareja necesita para distinguir a dos homónimos (`D-11`).
 *
 * Lo que **no** devuelve es la lista de invitados que no han jugado. Lo que no
 * entra en el ranking no se guarda, y una tabla llena de ceros no es
 * información: es ruido con nombres y teléfonos dentro.
 *
 * Los nombres y los teléfonos se resuelven **aquí**, porque `guests` está
 * cerrada a lectura directa (regla de oro 2) y `quizResults` solo guarda el
 * `guestId`.
 */
export const listQuizPlays = onCall(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK },
  async (peticion): Promise<{ jugadores: readonly JugadorDelQuiz[] }> => {
    const { weddingId } = exigirPareja(peticion);
    const base = db();

    const partidas = await base
      .collection(`weddings/${weddingId}/quizResults`)
      .orderBy('points', 'desc')
      .orderBy('elapsedMs', 'asc')
      .limit(TOPE_RANKING * 3)
      .get();

    const resultados: ResultadoQuiz[] = partidas.docs.map((d) => {
      const datos = d.data();
      return {
        id: d.id,
        guestId: typeof datos['guestId'] === 'string' ? datos['guestId'] : '',
        displayName: typeof datos['fullName'] === 'string' ? datos['fullName'] : '',
        points: typeof datos['points'] === 'number' ? datos['points'] : 0,
        elapsedMs: typeof datos['elapsedMs'] === 'number' ? datos['elapsedMs'] : 0,
      };
    });

    const tabla = ranking(resultados);
    if (tabla.length === 0) return { jugadores: [] };

    // Una lectura por invitado del ranking, no una por partida.
    const refs = tabla.map((puesto) => base.doc(`weddings/${weddingId}/guests/${puesto.guestId}`));
    const fichas = await base.getAll(...refs);
    const porId = new Map(fichas.map((ficha) => [ficha.id, ficha.data() ?? {}]));

    const jugadores: JugadorDelQuiz[] = tabla.map((puesto) => {
      const g = porId.get(puesto.guestId) ?? {};
      return {
        guestId: puesto.guestId,
        // El nombre de la ficha, no el que se copió al jugar: si la pareja lo
        // ha corregido desde entonces, lo que vale es el de ahora.
        nombre: typeof g['fullName'] === 'string' ? g['fullName'] : puesto.displayName,
        telefono: typeof g['phone'] === 'string' ? g['phone'] : null,
        partidas: typeof g['quizPlayCount'] === 'number' ? g['quizPlayCount'] : 1,
        puntos: puesto.points,
        puesto: puesto.puesto,
      };
    });

    return { jugadores };
  },
);

export const clearQuizRanking = onCall(
  { region: REGION, enforceAppCheck: EXIGIR_APP_CHECK },
  async (peticion): Promise<{ borradas: number }> => {
    const pareja = exigirPareja(peticion);
    const base = db();

    const resultados = await base.collection(`weddings/${pareja.weddingId}/quizResults`).get();
    const invitados = await base.collection(`weddings/${pareja.weddingId}/guests`).get();

    let borradas = 0;
    let lote = base.batch();
    let enElLote = 0;

    const cerrarLote = async () => {
      if (enElLote === 0) return;
      await lote.commit();
      lote = base.batch();
      enElLote = 0;
    };

    for (const doc of resultados.docs) {
      lote.delete(doc.ref);
      borradas += 1;
      enElLote += 1;
      if (enElLote >= 400) await cerrarLote();
    }

    for (const doc of invitados.docs) {
      lote.update(doc.ref, { quizPlayCount: 0, quizBestPoints: null });
      enElLote += 1;
      if (enElLote >= 400) await cerrarLote();
    }

    await cerrarLote();
    return { borradas };
  },
);
