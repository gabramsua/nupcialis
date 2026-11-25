import { Timestamp } from 'firebase-admin/firestore';
import { describe, expect, it } from 'vitest';

import { limiteDe, moduloActivo } from './boda';

/**
 * La fecha límite, que vive enterrada en la configuración del módulo.
 *
 * Se prueba porque es un camino de cuatro saltos (`modules.rsvp.config.deadline`)
 * sobre un documento que puede no tener ninguno de los cuatro, y porque
 * equivocarse aquí no da un error: da un formulario que se cierra solo o que no
 * se cierra nunca.
 */
describe('limiteDe', () => {
  it('lee la fecha de la configuración del módulo', () => {
    const limite = limiteDe({
      modules: {
        rsvp: {
          enabled: true,
          config: { deadline: Timestamp.fromDate(new Date('2027-06-01T00:00:00.000Z')) },
        },
      },
    });

    expect(limite?.toISOString()).toBe('2027-06-01T00:00:00.000Z');
  });

  it('sin fecha, sin límite: el formulario no se cierra por su cuenta', () => {
    expect(limiteDe({})).toBeNull();
    expect(limiteDe(undefined)).toBeNull();
    expect(limiteDe({ modules: null })).toBeNull();
    expect(limiteDe({ modules: { rsvp: null } })).toBeNull();
    expect(limiteDe({ modules: { rsvp: { enabled: true } } })).toBeNull();
    expect(limiteDe({ modules: { rsvp: { config: {} } } })).toBeNull();
  });

  it('una fecha que no es una fecha se ignora, no se adivina', () => {
    expect(limiteDe({ modules: { rsvp: { config: { deadline: '2027-06-01' } } } })).toBeNull();
    expect(limiteDe({ modules: { rsvp: { config: { deadline: 1800000000 } } } })).toBeNull();
  });
});

describe('moduloActivo', () => {
  it('es cierto solo si el módulo está activo en la boda', () => {
    const boda = { modules: { gallery: { enabled: true }, quiz: { enabled: false } } };
    expect(moduloActivo(boda, 'gallery')).toBe(true);
    expect(moduloActivo(boda, 'quiz')).toBe(false);
  });

  it('un módulo que la boda no tiene, o un documento roto, no está activo', () => {
    expect(moduloActivo({ modules: {} }, 'gallery')).toBe(false);
    expect(moduloActivo({ modules: { gallery: 'si' } }, 'gallery')).toBe(false);
    expect(moduloActivo({ modules: { gallery: { enabled: 'true' } } }, 'gallery')).toBe(false);
    expect(moduloActivo({}, 'gallery')).toBe(false);
    expect(moduloActivo(undefined, 'gallery')).toBe(false);
  });
});
