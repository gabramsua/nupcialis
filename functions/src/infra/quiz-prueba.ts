/**
 * Borra lo que dejó jugar al quiz **antes de publicar** la web (D-54).
 *
 * Mientras la boda es un borrador, la pareja (o el superadmin) puede probar el
 * juego. Esas partidas no son de nadie: si se quedaran, el ranking de la web
 * pública nacería con puntuaciones de prueba. Al publicar se borran los
 * resultados, las partidas en curso, las estadísticas por pregunta y lo que
 * cada invitado lleva jugado. **Las preguntas no se tocan.**
 *
 * Los contadores de la boda (`quizPlays`) se recalculan solos con el trigger.
 */

import { db } from '../firebase';

const POR_LOTE = 400;

async function borrarColeccion(ruta: string): Promise<number> {
  const base = db();
  const snap = await base.collection(ruta).get();
  let borrados = 0;

  for (let desde = 0; desde < snap.docs.length; desde += POR_LOTE) {
    const lote = base.batch();
    for (const doc of snap.docs.slice(desde, desde + POR_LOTE)) lote.delete(doc.ref);
    await lote.commit();
    borrados += Math.min(POR_LOTE, snap.docs.length - desde);
  }
  return borrados;
}

export interface ResumenBorradoQuiz {
  readonly resultados: number;
  readonly partidas: number;
  readonly estadisticas: number;
  readonly invitados: number;
}

export async function borrarDatosDePruebaDelQuiz(weddingId: string): Promise<ResumenBorradoQuiz> {
  const base = db();

  const [resultados, partidas, estadisticas] = await Promise.all([
    borrarColeccion(`weddings/${weddingId}/quizResults`),
    borrarColeccion(`weddings/${weddingId}/quizGames`),
    borrarColeccion(`weddings/${weddingId}/quizStats`),
  ]);

  // Solo los invitados que de verdad han jugado: no se reescribe la lista entera.
  const jugadores = await base
    .collection(`weddings/${weddingId}/guests`)
    .where('quizPlayCount', '>', 0)
    .get();

  for (let desde = 0; desde < jugadores.docs.length; desde += POR_LOTE) {
    const lote = base.batch();
    for (const doc of jugadores.docs.slice(desde, desde + POR_LOTE)) {
      lote.update(doc.ref, { quizPlayCount: 0, quizBestPoints: null });
    }
    await lote.commit();
  }

  return { resultados, partidas, estadisticas, invitados: jugadores.size };
}
