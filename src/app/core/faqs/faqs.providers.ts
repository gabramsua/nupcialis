import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';

import { crearPuertaFaqsFirestore } from '../firebase/faqs-gateway.firestore';
import { PUERTA_FAQS } from './faqs-gateway';

/** Las preguntas frecuentes, solo para la ruta del panel (D-18). */
export function provideFaqs(): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: PUERTA_FAQS, useFactory: crearPuertaFaqsFirestore }]);
}
