import { describe, expect, it } from 'vitest';

import {
  CHECKLIST_PLANTILLA,
  FAQS_FABRICA,
  GRUPO_POR_DEFECTO,
  PREGUNTAS_QUIZ_FABRICA,
  PREGUNTAS_RSVP_FABRICA,
  fechaLimiteTarea,
  tareasAplicables,
} from './semillas';

const HOY = new Date('2026-09-10T00:00:00Z');

describe('preguntas de fábrica del RSVP', () => {
  it('la primera pregunta es si viene', () => {
    expect(PREGUNTAS_RSVP_FABRICA[0]?.mapsTo).toBe('rsvpStatus');
  });

  it('menú y alergias están vinculadas a campos del invitado', () => {
    // De ahí sale la exportación al catering. Si se rompe el vínculo, esa
    // exportación se queda vacía y nadie sabe por qué.
    const porCampo = (campo: string) => PREGUNTAS_RSVP_FABRICA.find((p) => p.mapsTo === campo);
    expect(porCampo('menu')).toBeDefined();
    expect(porCampo('allergies')).toBeDefined();
  });

  it('las preguntas vinculadas a campos son de sistema', () => {
    // Se pueden desactivar o reetiquetar, pero no borrar.
    for (const p of PREGUNTAS_RSVP_FABRICA) {
      if (['rsvpStatus', 'menu', 'allergies'].includes(p.mapsTo ?? '')) {
        expect(p.isSystem, p.label).toBe(true);
      }
    }
  });

  it('lo que solo tiene sentido si vienes está condicionado', () => {
    const menu = PREGUNTAS_RSVP_FABRICA.find((p) => p.mapsTo === 'menu');
    expect(menu?.visibleIf).toEqual({ questionId: 'asistencia', equals: true });
  });

  // `visibleIf` apunta a un id de documento, y los ids de las sembradas son sus
  // `key`. Una referencia a una pregunta que no se siembra deja el formulario
  // con un campo que no aparece nunca.
  it('todas las condiciones apuntan a una pregunta que existe', () => {
    const claves = new Set(PREGUNTAS_RSVP_FABRICA.map((p) => p.key));
    for (const p of PREGUNTAS_RSVP_FABRICA) {
      if (p.visibleIf) expect(claves, p.label).toContain(p.visibleIf.questionId);
    }
  });

  it('las claves no se repiten: son el id del documento', () => {
    const claves = PREGUNTAS_RSVP_FABRICA.map((p) => p.key);
    expect(new Set(claves).size).toBe(claves.length);
  });

  it('solo las de tipo elección traen opciones', () => {
    for (const p of PREGUNTAS_RSVP_FABRICA) {
      const esDeEleccion = ['select', 'radio', 'checkbox'].includes(p.type);
      expect(p.options.length > 0, p.label).toBe(esDeEleccion);
    }
  });

  it('el orden no tiene huecos ni repeticiones', () => {
    const ordenes = PREGUNTAS_RSVP_FABRICA.map((p) => p.order);
    expect(ordenes).toEqual([...ordenes].sort((a, b) => a - b));
    expect(new Set(ordenes).size).toBe(ordenes.length);
  });
});

describe('FAQs de fábrica', () => {
  it('vienen con la pregunta escrita y la respuesta vacía', () => {
    // La pregunta la sabemos nosotros; la respuesta solo la pareja.
    for (const f of FAQS_FABRICA) {
      expect(f.question).not.toBe('');
      expect(f.answer).toBe('');
    }
  });
});

describe('preguntas de fábrica del quiz', () => {
  // Un quiz publicado con cinco preguntas sin respuestas es peor que no tener
  // quiz: el invitado juega, no puede acertar, y se lleva la impresión de que
  // la web está rota.
  it('nacen desactivadas porque nacen sin respuestas', () => {
    for (const p of PREGUNTAS_QUIZ_FABRICA) {
      expect(p.enabled, p.question).toBe(false);
      expect(p.correctAnswer).toBe('');
    }
  });

  it('cada pregunta trae hueco para tres respuestas falsas', () => {
    for (const p of PREGUNTAS_QUIZ_FABRICA) {
      expect(p.wrongAnswers, p.question).toHaveLength(3);
    }
  });

  it('la dificultad está dentro de los tres niveles', () => {
    for (const p of PREGUNTAS_QUIZ_FABRICA) {
      expect([1, 2, 3], p.question).toContain(p.difficulty);
    }
  });
});

describe('grupo por defecto', () => {
  // De los grupos depende quién ve qué fotos. El grupo que nace con la boda es
  // público: la partición restringida la crea la pareja a conciencia.
  it('es público', () => {
    expect(GRUPO_POR_DEFECTO.photoAudience).toBe('public');
  });

  it('su color es un id de la paleta categórica, no un hexadecimal', () => {
    expect(GRUPO_POR_DEFECTO.color).not.toMatch(/^#/);
  });
});

describe('fechaLimiteTarea', () => {
  it('resta los meses a la fecha de la boda', () => {
    const boda = new Date('2027-06-12T00:00:00Z');
    const limite = fechaLimiteTarea(boda, 4, HOY);
    expect(limite.getTime()).toBeLessThan(boda.getTime());
    expect(limite.getTime()).toBeGreaterThan(HOY.getTime());
  });

  it('nunca deja una tarea vencida al crear la boda', () => {
    // Una pareja que contrata a tres meses vista no debe encontrarse una lista
    // con ocho tareas en rojo. Eso no lo mira nadie.
    const boda = new Date('2026-12-10T00:00:00Z');
    const limite = fechaLimiteTarea(boda, 12, HOY);
    expect(limite.getTime()).toBeGreaterThanOrEqual(HOY.getTime());
  });
});

describe('tareasAplicables', () => {
  it('con boda lejana entran todas', () => {
    const boda = new Date('2028-06-12T00:00:00Z');
    expect(tareasAplicables(boda, HOY)).toHaveLength(CHECKLIST_PLANTILLA.length);
  });

  it('con boda cercana se descartan las que ya no tienen sentido', () => {
    // A dos meses vista, "reservar la finca" sobra: o está hecho o no hay boda.
    const boda = new Date('2026-11-10T00:00:00Z');
    const tareas = tareasAplicables(boda, HOY);
    expect(tareas.length).toBeLessThan(CHECKLIST_PLANTILLA.length);
    expect(tareas.some((t) => t.title === 'Reservar la finca')).toBe(false);
    expect(tareas.some((t) => t.title === 'Dar el número final al catering')).toBe(true);
  });

  it('con boda inminente quedan solo las de última hora', () => {
    const boda = new Date('2026-09-25T00:00:00Z');
    const tareas = tareasAplicables(boda, HOY);
    expect(tareas.every((t) => t.mesesAntes <= 1.5)).toBe(true);
  });
});
