import { describe, expect, it } from 'vitest';

import type { Pregunta } from '../../../core/rsvp/rsvp-gateway';
import type { RespuestasDeInvitado } from '../../../core/rsvp/respuestas-gateway';
import { cuantosHanContestado, resumir, resumirPregunta } from './resumen-respuestas';

/**
 * Lo que han contestado, puesto en forma.
 *
 * Lo que se vigila:
 *
 * 1. **Que las respuestas de texto se puedan leer una a una, con quién la
 *    escribió.** Son peticiones de gente y alguna importa; contarlas no sirve
 *    de nada.
 * 2. **Que los recuentos cuadren**: solo quien ha contestado, y una casilla
 *    múltiple cuenta en cada opción que haya marcado.
 * 3. **Que una opción retirada no esconda sus respuestas.** La pareja puede
 *    quitar «sin gluten» después de que lo pidan quince personas.
 */

function pregunta(parcial: Partial<Pregunta> & { id: string }): Pregunta {
  return {
    label: parcial.id,
    helpText: '',
    type: 'text',
    options: [],
    required: false,
    visibleIf: null,
    order: 1,
    ...parcial,
  };
}

function invitado(
  id: string,
  nombre: string,
  respuestas: Record<string, unknown>,
  parcial: Partial<RespuestasDeInvitado> = {},
): RespuestasDeInvitado {
  return {
    guestId: id,
    nombre,
    mote: '',
    estado: 'confirmed',
    cuando: '2027-01-10T10:00:00.000Z',
    respuestas,
    ...parcial,
  };
}

const MENU = pregunta({
  id: 'menu',
  label: 'Menú',
  type: 'select',
  options: [
    { value: 'normal', label: 'Normal' },
    { value: 'vegano', label: 'Vegano' },
  ],
});

const CANCION = pregunta({ id: 'cancion', label: '¿Qué canción no puede faltar?' });

describe('las preguntas de opciones', () => {
  it('se cuentan, con sus etiquetas', () => {
    const resumen = resumirPregunta(MENU, [
      invitado('1', 'Ana', { menu: 'vegano' }),
      invitado('2', 'Borja', { menu: 'normal' }),
      invitado('3', 'Carmen', { menu: 'vegano' }),
    ]);

    expect(resumen.forma).toBe('recuento');
    if (resumen.forma !== 'recuento') return;
    expect(resumen.total).toBe(3);
    expect(resumen.opciones).toEqual([
      { value: 'normal', label: 'Normal', cuantos: 1, quienes: ['Borja'] },
      { value: 'vegano', label: 'Vegano', cuantos: 2, quienes: ['Ana', 'Carmen'] },
    ]);
  });

  /**
   * El número solo no sirve para hacer nada: «vegano, 23» se convierte en
   * trabajo —avisar al catering, mover una mesa— cuando se sabe quiénes son.
   */
  it('cada recuento lleva los nombres, ordenados y con el mote si lo tienen', () => {
    const resumen = resumirPregunta(MENU, [
      invitado('1', 'Zoe', { menu: 'vegano' }),
      invitado('2', 'Ana', { menu: 'vegano' }),
    ]);

    if (resumen.forma !== 'recuento') throw new Error('debería ser recuento');
    expect(resumen.opciones.find((o) => o.value === 'vegano')?.quienes).toEqual(['Ana', 'Zoe']);
  });

  /** Si contara a los pendientes, todo parecería minoritario. */
  it('solo cuentan los que han contestado esa pregunta', () => {
    const resumen = resumirPregunta(MENU, [
      invitado('1', 'Ana', { menu: 'vegano' }),
      invitado('2', 'Borja', {}),
      invitado('3', 'Carmen', { menu: '' }),
    ]);

    expect(resumen.total).toBe(1);
  });

  it('un sí/no se cuenta como sí y no, que no son opciones guardadas', () => {
    const bus = pregunta({ id: 'bus', label: '¿Autobús?', type: 'boolean' });
    const resumen = resumirPregunta(bus, [
      invitado('1', 'Ana', { bus: true }),
      invitado('2', 'Borja', { bus: false }),
      invitado('3', 'Carmen', { bus: true }),
    ]);

    if (resumen.forma !== 'recuento') throw new Error('debería ser recuento');
    expect(resumen.opciones).toEqual([
      { value: 'true', label: 'Sí', cuantos: 2, quienes: ['Ana', 'Carmen'] },
      { value: 'false', label: 'No', cuantos: 1, quienes: ['Borja'] },
    ]);
  });

  it('una casilla múltiple cuenta en cada opción marcada', () => {
    const como = pregunta({
      id: 'como',
      type: 'checkbox',
      options: [
        { value: 'bus', label: 'Autobús' },
        { value: 'taxi', label: 'Taxi' },
      ],
    });
    const resumen = resumirPregunta(como, [
      invitado('1', 'Ana', { como: ['bus', 'taxi'] }),
      invitado('2', 'Borja', { como: ['bus'] }),
    ]);

    if (resumen.forma !== 'recuento') throw new Error('debería ser recuento');
    expect(resumen.opciones).toEqual([
      { value: 'bus', label: 'Autobús', cuantos: 2, quienes: ['Ana', 'Borja'] },
      { value: 'taxi', label: 'Taxi', cuantos: 1, quienes: ['Ana'] },
    ]);
    // Dos personas, no tres: el total son invitados, no marcas.
    expect(resumen.total).toBe(2);
  });

  /**
   * La pareja puede quitar una opción después de que la pidan quince personas.
   * Esconder esas respuestas descuadraría el total sin decir por qué.
   */
  it('una opción que ya no está en la lista sigue enseñándose', () => {
    const resumen = resumirPregunta(MENU, [invitado('1', 'Ana', { menu: 'sin-gluten' })]);

    if (resumen.forma !== 'recuento') throw new Error('debería ser recuento');
    expect(resumen.opciones).toContainEqual({
      value: 'sin-gluten',
      label: 'sin-gluten',
      cuantos: 1,
      quienes: ['Ana'],
    });
  });

  it('una opción que nadie ha elegido sale a cero, no desaparece', () => {
    const resumen = resumirPregunta(MENU, [invitado('1', 'Ana', { menu: 'vegano' })]);

    if (resumen.forma !== 'recuento') throw new Error('debería ser recuento');
    expect(resumen.opciones[0]).toEqual({
      value: 'normal',
      label: 'Normal',
      cuantos: 0,
      quienes: [],
    });
  });
});

describe('las preguntas de texto', () => {
  /** **Lo que pidió Gabriel.** Son peticiones de gente y hay que leerlas. */
  it('se leen una a una, con quién la escribió', () => {
    const resumen = resumirPregunta(CANCION, [
      invitado('1', 'Ana Ruiz', { cancion: 'Despacito' }),
      invitado('2', 'Borja Gil', { cancion: 'La Macarena' }),
    ]);

    expect(resumen.forma).toBe('escritas');
    if (resumen.forma !== 'escritas') return;
    expect(resumen.escritas).toEqual([
      { guestId: '1', quien: 'Ana Ruiz', texto: 'Despacito' },
      { guestId: '2', quien: 'Borja Gil', texto: 'La Macarena' },
    ]);
  });

  it('con el mote, que es como la pareja los llama', () => {
    const resumen = resumirPregunta(CANCION, [
      invitado('1', 'María José Pérez', { cancion: 'Lo que sea' }, { mote: 'Majo' }),
    ]);

    if (resumen.forma !== 'escritas') throw new Error('debería ser escritas');
    expect(resumen.escritas[0]?.quien).toBe('Majo');
  });

  it('quien no ha escrito nada no sale', () => {
    const resumen = resumirPregunta(CANCION, [
      invitado('1', 'Ana', { cancion: 'Despacito' }),
      invitado('2', 'Borja', {}),
      invitado('3', 'Carmen', { cancion: '' }),
    ]);

    if (resumen.forma !== 'escritas') throw new Error('debería ser escritas');
    expect(resumen.escritas).toHaveLength(1);
    expect(resumen.total).toBe(1);
  });

  it('un texto largo se devuelve entero: es un mensaje para los novios', () => {
    const largo = 'x'.repeat(900);
    const resumen = resumirPregunta(CANCION, [invitado('1', 'Ana', { cancion: largo })]);

    if (resumen.forma !== 'escritas') throw new Error('debería ser escritas');
    expect(resumen.escritas[0]?.texto).toHaveLength(900);
  });
});

describe('resumir', () => {
  it('respeta el orden de las preguntas', () => {
    const resumen = resumir([MENU, CANCION], [invitado('1', 'Ana', { menu: 'vegano' })]);

    expect(resumen.map((r) => r.pregunta.id)).toEqual(['menu', 'cancion']);
  });
});

describe('cuantosHanContestado', () => {
  /** Los contadores de la lista dicen cuántos vienen, no cuántos han rellenado. */
  it('cuenta a quien mandó el formulario, venga o no', () => {
    expect(
      cuantosHanContestado([
        invitado('1', 'Ana', {}, { estado: 'confirmed' }),
        invitado('2', 'Borja', {}, { estado: 'declined' }),
        invitado('3', 'Carmen', {}, { estado: 'pending', cuando: null }),
      ]),
    ).toBe(2);
  });
});

/**
 * Los acompañantes cuentan. «Autobús, 40» no puede ser el total si veinte
 * acompañantes no están apuntados: se dice cuántos faltan y quiénes.
 */
describe('acompañantes', () => {
  const bus = pregunta({
    id: 'bus',
    type: 'radio',
    options: [
      { value: 'si', label: 'Sí' },
      { value: 'no', label: 'No' },
    ],
  });

  const titular = invitado('t1', 'Ana Ruiz', { bus: 'si' }, { estado: 'confirmed' });
  const conBus = invitado(
    'a1',
    'Leo',
    { bus: 'si' },
    { estado: 'confirmed', esAcompanante: true, traidoPor: 'Ana Ruiz' },
  );
  const sinContestar = invitado(
    'a2',
    'Marta',
    {},
    { estado: 'pending', esAcompanante: true, traidoPor: 'Ana Ruiz' },
  );
  const noViene = invitado('a3', 'Pablo', {}, { estado: 'declined', esAcompanante: true });

  it('los nombra con quien los trajo y los cuenta aparte', () => {
    const r = resumirPregunta(bus, [titular, conBus], [bus]);

    expect(r.forma).toBe('recuento');
    if (r.forma !== 'recuento') return;
    expect(r.total).toBe(2);
    expect(r.deAcompanantes).toBe(1);
    expect(r.opciones.find((o) => o.value === 'si')?.quienes).toEqual([
      'Ana Ruiz',
      'Leo (con Ana Ruiz)',
    ]);
  });

  it('avisa de quién falta por contestar, sin contar a los que no vienen', () => {
    const r = resumirPregunta(bus, [titular, conBus, sinContestar, noViene], [bus]);

    expect(r.faltan.total).toBe(1);
    expect(r.faltan.acompanantes).toBe(1);
    expect(r.faltan.nombres).toEqual(['Marta (con Ana Ruiz)']);
  });

  it('no pide la pregunta a quien no se le hace', () => {
    const soloTitulares = { ...bus, target: 'guest' as const };
    const r = resumirPregunta(soloTitulares, [titular, sinContestar], [soloTitulares]);

    expect(r.faltan.total).toBe(0);
  });
});
