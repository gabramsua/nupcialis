import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';

import { crearPuertaQuizFirebase } from '../firebase/quiz-gateway.firebase';
import { PUERTA_QUIZ } from './quiz-gateway';

/** El quiz, solo en la ruta que lo usa (D-18). */
export function provideQuiz(): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: PUERTA_QUIZ, useFactory: crearPuertaQuizFirebase }]);
}
