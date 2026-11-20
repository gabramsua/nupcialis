import type { Provider } from '@angular/core';

import {
  PUERTA_ESTADISTICAS,
  type PuertaEstadisticas,
} from '../../core/superadmin/estadisticas-gateway';
import { resumir, type FilaDeBoda } from '../superadmin/estadisticas/estadisticas';

/**
 * Las estadísticas del superadmin con bodas de muestra. **Solo en desarrollo.**
 *
 * La pantalla real habla con Cloud Functions; aquí se le da un doble para poder
 * mirarla —sobre todo a 360 px— sin sesión de superadmin.
 */
function fila(parcial: Partial<FilaDeBoda> & { weddingId: string }): FilaDeBoda {
  return {
    slug: parcial.weddingId,
    status: 'active',
    plan: 'basic',
    invitados: 120,
    confirmados: 84,
    fotos: 0,
    tope: 500,
    topeEsPropio: false,
    partidasQuiz: 31,
    accesos: 210,
    creadaEn: '2026-11-03T10:00:00.000Z',
    ...parcial,
  };
}

const BODAS = [
  fila({ weddingId: 'mariaygabriel', fotos: 500 }),
  fila({ weddingId: 'anayjuan', fotos: 430, tope: 500, plan: 'extended' }),
  fila({ weddingId: 'luciaydavid', fotos: 120, tope: 1500, topeEsPropio: true }),
  fila({ weddingId: 'pruebas', status: 'draft', invitados: 6, confirmados: 0 }),
];

const DOBLE: PuertaEstadisticas = {
  async leer() {
    return {
      ok: true,
      datos: { resumen: resumir(BODAS, new Date()), bodas: BODAS, recortado: false },
    };
  },
  async fijarTope(_w, maxPhotos) {
    return { ok: true, maxPhotos: maxPhotos ?? 500, topeEsPropio: maxPhotos !== null };
  },
};

export function provideEstadisticasDeMuestra(): Provider {
  return { provide: PUERTA_ESTADISTICAS, useValue: DOBLE };
}
