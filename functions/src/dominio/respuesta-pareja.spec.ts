import { describe, expect, it } from 'vitest';

import type { Pregunta } from './formulario';
import { prepararRespuestaDeLaPareja, type LoActual } from './respuesta-pareja';
import { PREGUNTAS_RSVP_FABRICA } from './semillas';

/**
 * La pareja contesta por el invitado.
 *
 * Lo que se vigila: que dejar el estado «viene» o «no viene» no destroza lo que
 * ya había, que se pueda guardar sin rellenar lo obligatorio (la pareja pone lo
 * que sabe) y que **lo que se contesta se valida igual que si lo contestara el
 * invitado**: una opción inventada no pasa por ser la pareja quien la manda.
 */

const FABRICA: readonly Pregunta[] = PREGUNTAS_RSVP_FABRICA.map(({ key, ...resto }) => ({
  id: key,
  ...resto,
}));

const PENDIENTE: LoActual = { estado: 'pending', respuestas: {} };

describe('prepararRespuestaDeLaPareja', () => {
  it('solo el estado: «viene» pone la asistencia a sí y no toca nada más', () => {
    const r = prepararRespuestaDeLaPareja(
      FABRICA,
      false,
      { estado: 'confirmed', respuestas: null },
      { estado: 'pending', respuestas: { mensaje: 'Os quiero' } },
    );

    expect(r).toMatchObject({ ok: true, estado: 'confirmed', campos: {} });
    if (r.ok) expect(r.respuestas).toEqual({ mensaje: 'Os quiero', asistencia: true });
  });

  it('solo el estado: «no viene» conserva el menú que ya hubiera', () => {
    const r = prepararRespuestaDeLaPareja(
      FABRICA,
      false,
      { estado: 'declined', respuestas: null },
      { estado: 'confirmed', respuestas: { asistencia: true, menu: 'vegano' } },
    );

    expect(r).toMatchObject({ ok: true, estado: 'declined' });
    if (r.ok) expect(r.respuestas).toEqual({ asistencia: false, menu: 'vegano' });
  });

  it('solo el estado: pendiente quita la respuesta de asistencia', () => {
    const r = prepararRespuestaDeLaPareja(
      FABRICA,
      false,
      { estado: 'pending', respuestas: null },
      { estado: 'confirmed', respuestas: { asistencia: true } },
    );

    expect(r).toMatchObject({ ok: true, estado: 'pending' });
    if (r.ok) expect(r.respuestas).toEqual({});
  });

  it('con respuestas: no exige las obligatorias', () => {
    const r = prepararRespuestaDeLaPareja(
      FABRICA,
      false,
      { estado: null, respuestas: { asistencia: true } },
      PENDIENTE,
    );

    expect(r).toMatchObject({ ok: true, estado: 'confirmed' });
  });

  it('con respuestas: el menú y las alergias llegan a los campos del invitado', () => {
    const menu = FABRICA.find((p) => p.id === 'menu');
    const opcion = menu?.options[0]?.value ?? '';

    const r = prepararRespuestaDeLaPareja(
      FABRICA,
      false,
      { estado: 'confirmed', respuestas: { menu: opcion, alergias: 'Marisco' } },
      PENDIENTE,
    );

    expect(r).toMatchObject({ ok: true, estado: 'confirmed' });
    if (r.ok) expect(r.campos.menu).toBe(opcion);
  });

  it('con respuestas: una opción que no existe se rechaza igual que al invitado', () => {
    const r = prepararRespuestaDeLaPareja(
      FABRICA,
      false,
      { estado: 'confirmed', respuestas: { menu: 'solomillo-de-unicornio' } },
      PENDIENTE,
    );

    expect(r).toMatchObject({ ok: false });
    if (!r.ok) expect(r.fallos).toContainEqual({ questionId: 'menu', motivo: 'opcion' });
  });

  it('con respuestas: si dice que no viene, el menú no se guarda', () => {
    const r = prepararRespuestaDeLaPareja(
      FABRICA,
      false,
      { estado: 'declined', respuestas: { menu: 'normal' } },
      PENDIENTE,
    );

    expect(r).toMatchObject({ ok: true, estado: 'declined' });
    if (r.ok) expect(r.respuestas).toEqual({ asistencia: false });
  });

  it('sin pregunta de asistencia (apagada) el estado elegido manda igualmente', () => {
    const sinAsistencia = FABRICA.map((p) =>
      p.id === 'asistencia' ? { ...p, enabled: false } : p,
    );

    const r = prepararRespuestaDeLaPareja(
      sinAsistencia,
      false,
      { estado: 'confirmed', respuestas: null },
      PENDIENTE,
    );

    expect(r).toMatchObject({ ok: true, estado: 'confirmed' });
    if (r.ok) expect(r.respuestas).toEqual({});
  });

  it('sin estado ni asistencia en las respuestas, el estado se queda como estaba', () => {
    const r = prepararRespuestaDeLaPareja(
      FABRICA,
      false,
      { estado: null, respuestas: { mensaje: 'Hola' } },
      { estado: 'declined', respuestas: {} },
    );

    expect(r).toMatchObject({ ok: true, estado: 'declined' });
  });
});
