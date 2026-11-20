import { Timestamp } from 'firebase/firestore';
import { describe, expect, it } from 'vitest';

import { fechaLimiteRsvp } from './boda.firestore';

/**
 * Las piezas del adaptador que se pueden probar sin Firestore.
 *
 * Vive en un `*.firestore.spec.ts` porque necesita `Timestamp` del SDK, y el
 * SDK solo se importa en `core/firebase` y en los adaptadores con ese sufijo
 * (ver `eslint.config.js`).
 */

describe('fechaLimiteRsvp', () => {
  /**
   * Cuatro saltos (`modules.rsvp.config.deadline`) sobre un documento que puede
   * no tener ninguno. Equivocarse aquí no da un error: da un formulario que se
   * cierra solo, o que no se cierra nunca.
   */
  it('la lee de la configuración del módulo', () => {
    const limite = fechaLimiteRsvp({
      rsvp: { enabled: true, config: { deadline: Timestamp.fromDate(new Date('2027-06-01Z')) } },
    });

    expect(limite?.toISOString()).toBe('2027-06-01T00:00:00.000Z');
  });

  it('sin fecha no hay plazo', () => {
    expect(fechaLimiteRsvp(undefined)).toBeNull();
    expect(fechaLimiteRsvp({})).toBeNull();
    expect(fechaLimiteRsvp({ rsvp: null })).toBeNull();
    expect(fechaLimiteRsvp({ rsvp: { enabled: true } })).toBeNull();
    expect(fechaLimiteRsvp({ rsvp: { config: {} } })).toBeNull();
    expect(fechaLimiteRsvp({ rsvp: { config: { deadline: '2027-06-01' } } })).toBeNull();
  });
});
