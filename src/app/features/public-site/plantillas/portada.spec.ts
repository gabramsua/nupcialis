import { describe, expect, it } from 'vitest';

import { cuentaAtras, seccionesVisibles, type DatosPortada } from './portada';
import { DRESS_CODE_VACIO } from '../dress-code/dress-code';
import type { Seccion } from '../secciones/secciones';

const AHORA = new Date('2026-09-16T12:00:00Z');

function datos(parcial: Partial<DatosPortada>): DatosPortada {
  return {
    nombres: { partnerA: 'María', partnerB: 'Gabriel' },
    weddingDate: new Date('2026-09-19T00:00:00.000Z'),
    weddingTime: '17:00',
    timezone: 'Europe/Madrid',
    locale: 'es',
    heroImageUrl: null,
    secciones: [],
    faqs: [],
    cronologia: [],
    alojamientos: [],
    ubicaciones: [],
    dressCode: DRESS_CODE_VACIO,
    ...parcial,
  };
}

describe('cuentaAtras', () => {
  it('cuenta hasta la hora de la boda en su zona', () => {
    // 19 de septiembre a las 17:00 en Madrid (UTC+2) son las 15:00 UTC.
    // Desde el 16 a las 12:00 UTC: 3 días y 3 horas.
    expect(cuentaAtras(datos({}), AHORA)).toEqual({
      dias: 3,
      horas: 3,
      minutos: 0,
      conHora: true,
    });
  });

  it('sin hora fijada cuenta solo hasta la medianoche local y lo dice', () => {
    // El aviso que necesita la plantilla: aquí las horas no son hasta la boda.
    const sinHora = cuentaAtras(datos({ weddingTime: null }), AHORA);
    expect(sinHora?.conHora).toBe(false);
    expect(sinHora?.dias).toBe(2);
  });

  it('no cuenta hacia atrás una boda que ya pasó', () => {
    expect(cuentaAtras(datos({}), new Date('2026-09-20T00:00:00Z'))).toBeNull();
  });

  it('sin fecha no hay cuenta atrás', () => {
    expect(cuentaAtras(datos({ weddingDate: null }), AHORA)).toBeNull();
  });

  it('la zona de la boda manda sobre la del invitado', () => {
    // Un invitado que abre la web desde Canarias ve lo que falta para la boda
    // peninsular, no una cuenta corrida una hora.
    const canarias = cuentaAtras(datos({ timezone: 'Atlantic/Canary' }), AHORA);
    const madrid = cuentaAtras(datos({ timezone: 'Europe/Madrid' }), AHORA);
    expect(canarias?.horas).toBe((madrid?.horas ?? 0) + 1);
  });
});

describe('seccionesVisibles', () => {
  const sec = (type: Seccion['type'], order: number, enabled = true): Seccion => ({
    id: `${type}-${order}`,
    type,
    enabled,
    order,
    fields: {},
  });
  const todas = [
    sec('portada', 0),
    sec('texto', 1),
    sec('cronologia', 2),
    sec('quiz', 3),
    sec('historia', 4),
    sec('galeria', 5, false),
  ];

  it('en la web de una página apila todo lo encendido, carteles incluidos', () => {
    expect(seccionesVisibles(datos({ secciones: todas })).map((s) => s.type)).toEqual([
      'texto',
      'cronologia',
      'quiz',
      'historia',
    ]);
  });

  it('en la de varias páginas deja fuera los módulos con página propia: están en el menú', () => {
    const visibles = seccionesVisibles(datos({ secciones: todas, layout: 'multipage' }));
    expect(visibles.map((s) => s.type)).toEqual(['texto', 'cronologia']);
  });
});
