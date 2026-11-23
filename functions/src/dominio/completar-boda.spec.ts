import { describe, expect, it } from 'vitest';

import { cambiosPendientes, hayCambios } from './completar-boda';
import { modulosIniciales } from './planes';
import { SECCIONES_INICIALES } from './secciones';

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
    expect(cambios.secciones?.map((s) => s.id)).toEqual([
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
    expect(cambios.secciones).toHaveLength(2);
    expect(cambios.secciones?.[1]).toMatchObject({
      id: 'historia',
      type: 'historia',
      enabled: true,
      order: 1,
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
    expect(cambios.secciones?.map((s) => s.id)).toEqual(['portada', 'historia-nuestra']);
    expect(cambios.secciones?.[1]?.enabled).toBe(true);
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
