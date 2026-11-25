import { describe, expect, it } from 'vitest';

import { cambiosPendientes } from './completar-boda';
import {
  cambiosDeModulosEnBoda,
  diferenciaDePlan,
  leerModulosDePlan,
  modulosDelPlan,
  modulosIniciales,
  modulosPorDefecto,
} from './planes';

describe('leerModulosDePlan', () => {
  it('descarta lo desconocido y lo repetido, en el orden del catálogo', () => {
    expect(leerModulosDePlan(['faqs', 'publicSite', 'nada', 'faqs'])).toEqual([
      'publicSite',
      'faqs',
    ]);
  });

  it('un plan sin web pública no vale', () => {
    expect(leerModulosDePlan(['faqs'])).toBeNull();
    expect(leerModulosDePlan('publicSite')).toBeNull();
  });
});

describe('modulosDelPlan', () => {
  it('sin documento o con uno roto, los de por defecto', () => {
    expect(modulosDelPlan('basic', undefined)).toEqual(modulosPorDefecto('basic'));
    expect(modulosDelPlan('basic', { modules: 'x' })).toEqual(modulosPorDefecto('basic'));
  });

  it('con documento válido, manda el documento', () => {
    expect(modulosDelPlan('basic', { modules: ['publicSite', 'quiz'] })).toEqual([
      'publicSite',
      'quiz',
    ]);
  });
});

describe('modulosIniciales con módulos del plan', () => {
  it('solo los incluidos nacen activos', () => {
    const m = modulosIniciales('extended', ['publicSite', 'rsvp']);
    expect(m.rsvp.enabled).toBe(true);
    expect(m.quiz.enabled).toBe(false);
    expect(m.quiz.visibility).toBe('hidden');
  });
});

describe('diferenciaDePlan y cambiosDeModulosEnBoda', () => {
  const diferencia = diferenciaDePlan(['publicSite', 'rsvp'], ['publicSite', 'quiz']);

  it('calcula lo añadido y lo quitado', () => {
    expect(diferencia).toEqual({ anadidos: ['quiz'], quitados: ['rsvp'] });
  });

  it('añadir activa; quitar solo desactiva, sin tocar nada más', () => {
    const cambios = cambiosDeModulosEnBoda(
      {
        publicSite: { enabled: true, visibility: 'visible' },
        rsvp: { enabled: true, visibility: 'visible', config: { deadline: 'x' } },
      },
      diferencia,
    );
    expect(cambios).toEqual({
      'modules.quiz': { enabled: true, visibility: 'visible' },
      'modules.rsvp.enabled': false,
    });
  });

  it('un módulo que la pareja ya tenía configurado conserva su visibilidad al reactivarse', () => {
    const cambios = cambiosDeModulosEnBoda(
      { quiz: { enabled: false, visibility: 'visible' } },
      diferenciaDePlan([], ['quiz']),
    );
    expect(cambios).toEqual({ 'modules.quiz.enabled': true });
  });

  it('D-65: un módulo apagado que nació oculto se activa también visible', () => {
    const cambios = cambiosDeModulosEnBoda(
      { buses: { enabled: false, visibility: 'hidden' } },
      diferenciaDePlan([], ['buses']),
    );
    expect(cambios).toEqual({
      'modules.buses.enabled': true,
      'modules.buses.visibility': 'visible',
    });
  });

  it('D-65: «muy pronto» no se pisa', () => {
    const cambios = cambiosDeModulosEnBoda(
      { quiz: { enabled: false, visibility: 'soon' } },
      diferenciaDePlan([], ['quiz']),
    );
    expect(cambios).toEqual({ 'modules.quiz.enabled': true });
  });

  it('no escribe nada si ya está como se pide (idempotente)', () => {
    expect(
      cambiosDeModulosEnBoda({ rsvp: { enabled: false, visibility: 'hidden' } }, diferencia),
    ).toEqual({ 'modules.quiz': { enabled: true, visibility: 'visible' } });
    expect(
      cambiosDeModulosEnBoda(
        { quiz: { enabled: true, visibility: 'visible' } },
        diferenciaDePlan([], ['quiz']),
      ),
    ).toEqual({});
  });
});

describe('cambiosPendientes con módulos por plan', () => {
  it('rellena lo que falta con lo que dice el plan editado', () => {
    const r = cambiosPendientes({ plan: 'basic', modules: {} }, { basic: ['publicSite', 'faqs'] });
    expect(r.modulos.faqs?.enabled).toBe(true);
    expect(r.modulos.rsvp?.enabled).toBe(false);
  });
});
