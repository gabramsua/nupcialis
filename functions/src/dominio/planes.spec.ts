import { describe, expect, it } from 'vitest';
import {
  MODULOS,
  Modulo,
  SOLO_EXTENDIDO,
  layoutDePlan,
  moduloDisponibleEn,
  modulosIniciales,
} from './planes';

describe('layoutDePlan', () => {
  it('el básico es de una página y el extendido de varias', () => {
    expect(layoutDePlan('basic')).toBe('onepage');
    expect(layoutDePlan('extended')).toBe('multipage');
  });
});

describe('moduloDisponibleEn', () => {
  it.each(SOLO_EXTENDIDO)('%s no existe en el plan básico', (modulo) => {
    // Necesitan ruta propia y el básico es de una sola página.
    expect(moduloDisponibleEn(modulo, 'basic')).toBe(false);
    expect(moduloDisponibleEn(modulo, 'extended')).toBe(true);
  });

  it('el resto de módulos se pueden activar en el básico', () => {
    const resto = MODULOS.filter((m) => !SOLO_EXTENDIDO.includes(m));
    for (const modulo of resto) {
      expect(moduloDisponibleEn(modulo, 'basic')).toBe(true);
    }
  });
});

describe('modulosIniciales', () => {
  it('cubre todos los módulos, sin dejarse ninguno', () => {
    const conf = modulosIniciales('extended');
    expect(Object.keys(conf).sort()).toEqual([...MODULOS].sort());
  });

  it('el básico arranca con lo imprescindible, RSVP incluido', () => {
    const conf = modulosIniciales('basic');
    expect(conf.publicSite.enabled).toBe(true);
    expect(conf.rsvp.enabled).toBe(true);
    expect(conf.guests.enabled).toBe(true);
  });

  it('el básico NO trae galería ni quiz, ni siquiera apagados como opción', () => {
    const conf = modulosIniciales('basic');
    for (const modulo of SOLO_EXTENDIDO) {
      expect(conf[modulo].enabled).toBe(false);
      expect(conf[modulo].visibility).toBe('hidden');
    }
  });

  it('lo que no está activo queda oculto, nunca en "muy pronto"', () => {
    // Una boda recién creada no debe anunciar secciones que quizá nunca lleguen.
    // Anunciar es decisión de la pareja.
    for (const plan of ['basic', 'extended'] as const) {
      const conf = modulosIniciales(plan);
      for (const modulo of Object.keys(conf) as Modulo[]) {
        if (!conf[modulo].enabled) expect(conf[modulo].visibility).toBe('hidden');
      }
    }
  });

  it('el extendido trae más módulos que el básico', () => {
    const activos = (p: 'basic' | 'extended') =>
      Object.values(modulosIniciales(p)).filter((m) => m.enabled).length;
    expect(activos('extended')).toBeGreaterThan(activos('basic'));
  });
});
