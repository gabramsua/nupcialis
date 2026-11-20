import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';

import { crearPuertaPreguntasQuizFirestore } from '../firebase/quiz-admin-gateway.firestore';
import { crearPuertaRankingQuizFirebase } from '../firebase/quiz-ranking-gateway.firebase';
import { PUERTA_PREGUNTAS_QUIZ, PUERTA_RANKING_QUIZ } from './quiz-admin-gateway';

/** El quiz de la pareja, solo en la ruta del panel que lo usa (D-18). */
export function provideQuizDelPanel(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: PUERTA_PREGUNTAS_QUIZ, useFactory: crearPuertaPreguntasQuizFirestore },
    { provide: PUERTA_RANKING_QUIZ, useFactory: crearPuertaRankingQuizFirebase },
  ]);
}
