import { describe, expect, it } from 'vitest';

import { cambiosPendientes, hayCambios } from './completar-boda';
import { modulosIniciales } from './planes';
import { SECCIONES_INICIALES } from './secciones';

/** Quita los carteles del libro y de las personas importantes, que se añaden siempre y no es lo que estos casos miran. */
const sinLibro = <T extends { type: string }>(s: readonly T[] | null | undefined) =>
  s?.filter(
    (x) => x.type !== 'libro' && x.type !== 'cortejo' && x.type !== 'buses' && x.type !== 'rsvp',
  );

describe('cambiosPendientes', () => {
  it('una boda al día no tiene nada que añadir', () => {
    const cambios = cambiosPendientes({
      plan: 'extended',
      modules: modulosIniciales('extended'),
      content: { sections: SECCIONES_INICIALES },
    });
    expect(hayCambios(cambios)).toBe(false);
  });

  it('añade solo los módulos que faltan, con el valor del plan', () => {
    const { story, budget, ...viejos } = modulosIniciales('extended');
    const cambios = cambiosPendientes({
      plan: 'extended',
      modules: { ...viejos, rsvp: { enabled: false, visibility: 'hidden' } },
      content: { sections: SECCIONES_INICIALES },
    });
    expect(Object.keys(cambios.modulos).sort()).toEqual(['budget', 'story']);
    expect(cambios.modulos.story).toEqual(story);
    expect(cambios.modulos.budget).toEqual(budget);
  });

  it('en el plan básico, lo que es solo extendido entra apagado', () => {
    const cambios = cambiosPendientes({ plan: 'basic', modules: {} });
    expect(cambios.modulos.story).toEqual({ enabled: false, visibility: 'hidden' });
  });

  it('D-63: una boda básica anterior recibe encendidos regalos, alojamiento y autobuses', () => {
    const modules = modulosIniciales('basic');
    for (const m of ['gifts', 'accommodation', 'buses'] as const) {
      modules[m] = { enabled: false, visibility: 'hidden' };
    }
    const cambios = cambiosPendientes({
      plan: 'basic',
      modules,
      content: { sections: SECCIONES_INICIALES },
    });
    expect(Object.keys(cambios.modulos).sort()).toEqual(['accommodation', 'buses', 'gifts']);
    for (const m of ['gifts', 'accommodation', 'buses'] as const) {
      expect(cambios.modulos[m]?.enabled).toBe(true);
    }
  });

  it('D-63: es idempotente y no toca otros módulos apagados ni el plan extendido', () => {
    const encendidos = cambiosPendientes({
      plan: 'basic',
      modules: modulosIniciales('basic'),
      content: { sections: SECCIONES_INICIALES },
    });
    expect(Object.keys(encendidos.modulos)).toEqual([]);

    const extendido = modulosIniciales('extended');
    extendido.gifts = { enabled: false, visibility: 'hidden' };
    const cambios = cambiosPendientes({
      plan: 'extended',
      modules: extendido,
      content: { sections: SECCIONES_INICIALES },
    });
    expect(cambios.modulos.gifts).toBeUndefined();
  });

  it('D-65: un módulo encendido y oculto pasa a visible; «muy pronto» y visible no se tocan', () => {
    const cambios = cambiosPendientes({
      plan: 'basic',
      modules: {
        ...modulosIniciales('basic'),
        buses: { enabled: true, visibility: 'hidden' },
        faqs: { enabled: true, visibility: 'soon' },
      },
      content: { sections: SECCIONES_INICIALES },
    });
    expect(cambios.modulos).toEqual({ buses: { enabled: true, visibility: 'visible' } });
  });

  it('no pisa un módulo que la pareja apagó a propósito', () => {
    const cambios = cambiosPendientes({
      plan: 'extended',
      modules: { ...modulosIniciales('extended'), story: { enabled: false, visibility: 'soon' } },
      content: { sections: SECCIONES_INICIALES },
    });
    expect(cambios.modulos.story).toBeUndefined();
  });

  it('añade el cartel de historia, apagado y al final, si no hay ninguno', () => {
    const sinHistoria = SECCIONES_INICIALES.filter((s) => s.type !== 'historia');
    const cambios = cambiosPendientes({
      plan: 'extended',
      modules: modulosIniciales('extended'),
      content: { sections: sinHistoria },
    });
    const nueva = cambios.secciones?.at(-1);
    expect(nueva).toMatchObject({ id: 'historia', type: 'historia', enabled: false });
    expect(cambios.secciones).toHaveLength(sinHistoria.length + 1);
  });

  const base = modulosIniciales('extended');
  const portada = { id: 'portada', type: 'portada', enabled: true, order: 0, fields: {} };

  it('si el id «historia» lo usa otra sección que no es de texto, elige otro', () => {
    const cambios = cambiosPendientes({
      plan: 'extended',
      modules: base,
      content: {
        sections: [
          portada,
          { id: 'historia', type: 'evento', enabled: true, order: 1, fields: { titulo: 'X' } },
        ],
      },
    });
    expect(sinLibro(cambios.secciones)?.map((s) => s.id)).toEqual([
      'portada',
      'historia',
      'historia-nuestra',
    ]);
  });

  it('convierte la vieja sección de texto «historia» en cartel, sin añadir otra', () => {
    const cambios = cambiosPendientes({
      plan: 'extended',
      modules: base,
      content: {
        sections: [
          portada,
          {
            id: 'historia',
            type: 'texto',
            enabled: true,
            order: 1,
            fields: { titulo: 'Nosotros' },
          },
        ],
      },
    });
    expect(sinLibro(cambios.secciones)).toHaveLength(2);
    expect(sinLibro(cambios.secciones)?.[1]).toMatchObject({
      id: 'historia',
      type: 'historia',
      enabled: true,
      // El cartel de confirmación se cuela tras la portada y renumera.
      order: 2,
      fields: { titulo: 'Nosotros' },
    });
  });

  it('repara el duplicado que dejó el parche anterior: queda solo el cartel, encendido', () => {
    const cambios = cambiosPendientes({
      plan: 'extended',
      modules: base,
      content: {
        sections: [
          portada,
          {
            id: 'historia',
            type: 'texto',
            enabled: true,
            order: 1,
            fields: { titulo: 'Nuestra historia' },
          },
          {
            id: 'historia-nuestra',
            type: 'historia',
            enabled: false,
            order: 9,
            fields: { titulo: 'Nuestra historia' },
          },
        ],
      },
    });
    expect(sinLibro(cambios.secciones)?.map((s) => s.id)).toEqual(['portada', 'historia-nuestra']);
    expect(sinLibro(cambios.secciones)?.[1]?.enabled).toBe(true);
  });

  it('añade el cartel del libro de firmas, apagado y al final, si no hay ninguno', () => {
    const sinLibroInicial = SECCIONES_INICIALES.filter((s) => s.type !== 'libro');
    const cambios = cambiosPendientes({
      plan: 'extended',
      modules: base,
      content: { sections: sinLibroInicial },
    });
    expect(cambios.secciones?.at(-1)).toMatchObject({ id: 'libro', type: 'libro', enabled: false });
    expect(cambios.secciones).toHaveLength(sinLibroInicial.length + 1);
  });

  it('añade el cartel de confirmación justo tras la portada, apagado (D-64)', () => {
    const sinRsvp = SECCIONES_INICIALES.filter((s) => s.type !== 'rsvp');
    const cambios = cambiosPendientes({
      plan: 'basic',
      modules: modulosIniciales('basic'),
      content: { sections: sinRsvp },
    });
    expect(cambios.secciones?.[0]?.type).toBe('portada');
    expect(cambios.secciones?.[1]).toMatchObject({ id: 'confirmar', type: 'rsvp', enabled: false });
    expect(cambios.secciones).toHaveLength(sinRsvp.length + 1);
    const otra = cambiosPendientes({
      plan: 'basic',
      modules: modulosIniciales('basic'),
      content: { sections: cambios.secciones },
    });
    expect(otra.secciones).toBeNull();
  });

  it('añade el cartel de los autobuses, apagado y al final, si no hay ninguno (D-63)', () => {
    const sinBuses = SECCIONES_INICIALES.filter((s) => s.type !== 'buses');
    const cambios = cambiosPendientes({
      plan: 'basic',
      modules: modulosIniciales('basic'),
      content: { sections: sinBuses },
    });
    expect(cambios.secciones?.at(-1)).toMatchObject({
      id: 'autobuses',
      type: 'buses',
      enabled: false,
    });
    expect(cambios.secciones).toHaveLength(sinBuses.length + 1);

    // Idempotente: una segunda pasada ya no añade nada.
    const otra = cambiosPendientes({
      plan: 'basic',
      modules: modulosIniciales('basic'),
      content: { sections: cambios.secciones },
    });
    expect(otra.secciones).toBeNull();
  });

  it('añade el cartel de las personas importantes, apagado y al final, si no hay ninguno', () => {
    const sinCortejo = SECCIONES_INICIALES.filter((s) => s.type !== 'cortejo');
    const cambios = cambiosPendientes({
      plan: 'extended',
      modules: base,
      content: { sections: sinCortejo },
    });
    expect(cambios.secciones?.at(-1)).toMatchObject({
      id: 'cortejo',
      type: 'cortejo',
      enabled: false,
    });
    expect(cambios.secciones).toHaveLength(sinCortejo.length + 1);
  });

  it('el cartel de las personas importantes no se repite: es idempotente', () => {
    expect(
      cambiosPendientes({
        plan: 'extended',
        modules: base,
        content: { sections: SECCIONES_INICIALES },
      }).secciones,
    ).toBeNull();
  });

  it('es idempotente: una boda ya arreglada no vuelve a cambiar', () => {
    const arreglada = {
      plan: 'extended',
      modules: base,
      content: {
        sections: [
          portada,
          {
            id: 'historia',
            type: 'historia',
            enabled: true,
            order: 1,
            fields: { titulo: 'Nuestra historia' },
          },
          { id: 'libro', type: 'libro', enabled: false, order: 2, fields: { titulo: 'Libro' } },
          {
            id: 'cortejo',
            type: 'cortejo',
            enabled: false,
            order: 3,
            fields: { titulo: 'Personas importantes' },
          },
          {
            id: 'autobuses',
            type: 'buses',
            enabled: false,
            order: 4,
            fields: { titulo: 'Autobuses' },
          },
          {
            id: 'confirmar',
            type: 'rsvp',
            enabled: false,
            order: 5,
            fields: { titulo: 'Confirmar' },
          },
        ],
      },
    };
    expect(cambiosPendientes(arreglada).secciones).toBeNull();
  });

  it('sin lista de secciones no inventa ninguna', () => {
    expect(
      cambiosPendientes({ plan: 'basic', modules: modulosIniciales('basic') }).secciones,
    ).toBeNull();
  });
});
