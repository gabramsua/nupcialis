import { describe, expect, it } from 'vitest';

import { aFormulario, traducir } from './rsvp-gateway.firebase';

/**
 * La traducción de lo que contesta la función invocable.
 *
 * Se prueba aquí y no en la pantalla porque ahí la puerta va doblada y esto no
 * se ejecuta: es exactamente el agujero por el que una vez salió un
 * «Unauthenticated [401]» a la cara de la pareja.
 */

describe('aFormulario', () => {
  it('pone en forma lo que llega', () => {
    const f = aFormulario({
      preguntas: [
        {
          id: 'menu',
          label: 'Menú',
          type: 'select',
          options: [{ value: 'vegano', label: 'Vegano' }],
          required: true,
          visibleIf: { questionId: 'asistencia', equals: true },
          order: 2,
        },
      ],
      respuestas: { menu: 'vegano' },
      estado: 'confirmed',
      nombre: 'Majo',
      limite: '2027-06-01',
      abierto: true,
      yaContestado: true,
    });

    expect(f.preguntas[0]?.options).toEqual([{ value: 'vegano', label: 'Vegano' }]);
    expect(f.respuestas).toEqual({ menu: 'vegano' });
    expect(f.estado).toBe('confirmed');
    expect(f.abierto).toBe(true);
  });

  /** Ante la duda, cerrado: enseñar un formulario que el servidor va a rechazar es peor. */
  it('una respuesta vacía no abre el formulario', () => {
    expect(aFormulario({}).abierto).toBe(false);
    expect(aFormulario(null).abierto).toBe(false);
    expect(aFormulario({}).preguntas).toEqual([]);
    expect(aFormulario({}).estado).toBe('pending');
  });

  it('una pregunta sin id se descarta: no hay dónde guardar su respuesta', () => {
    expect(aFormulario({ preguntas: [{ label: 'Sin id' }, 'suelta', null] }).preguntas).toEqual([]);
  });

  it('un tipo que no conocemos se enseña como texto, no se tira la pregunta', () => {
    expect(aFormulario({ preguntas: [{ id: 'x', type: 'telepatia' }] }).preguntas[0]?.type).toBe(
      'text',
    );
  });

  it('una opción sin valor se cae, y la etiqueta que falta la pone el valor', () => {
    const opciones = aFormulario({
      preguntas: [{ id: 'x', type: 'select', options: [{ value: '' }, { value: 'a' }] }],
    }).preguntas[0]?.options;

    expect(opciones).toEqual([{ value: 'a', label: 'a' }]);
  });

  it('unas respuestas que no son un mapa se descartan', () => {
    expect(aFormulario({ respuestas: ['a'] }).respuestas).toEqual({});
  });
});

describe('traducir', () => {
  it('el plazo cerrado llega con su fecha, que es lo que hay que poder decir', () => {
    expect(
      traducir({ code: 'functions/failed-precondition', details: { limite: '2027-06-01' } }),
    ).toEqual({ tipo: 'plazo-cerrado', limite: '2027-06-01' });
  });

  it('los fallos por pregunta llegan por pregunta', () => {
    expect(
      traducir({
        code: 'functions/invalid-argument',
        details: { fallos: [{ questionId: 'menu', motivo: 'obligatoria' }] },
      }),
    ).toEqual({ tipo: 'respuestas', fallos: [{ questionId: 'menu', motivo: 'obligatoria' }] });
  });

  it('un motivo que no conocemos no tira el fallo entero', () => {
    const fallo = traducir({
      code: 'functions/invalid-argument',
      details: { fallos: [{ questionId: 'menu', motivo: 'telepatia' }] },
    });

    expect(fallo).toEqual({ tipo: 'respuestas', fallos: [{ questionId: 'menu', motivo: 'tipo' }] });
  });

  it('un fallo sin pregunta se descarta: no hay dónde pintarlo', () => {
    expect(
      traducir({ code: 'functions/invalid-argument', details: { fallos: [{ motivo: 'tipo' }] } }),
    ).toEqual({ tipo: 'respuestas', fallos: [] });
  });

  it('la sesión caducada y el 401 de App Check no se confunden', () => {
    expect(traducir({ code: 'functions/permission-denied' })).toEqual({ tipo: 'sin-sesion' });
    expect(traducir({ code: 'functions/unauthenticated' })).toEqual({ tipo: 'sin-verificar' });
  });

  it('la boda que ya no está es «no disponible»', () => {
    expect(traducir({ code: 'functions/not-found' })).toEqual({ tipo: 'no-disponible' });
  });

  it('lo demás guarda su mensaje, pero la pantalla no lo enseña', () => {
    expect(traducir({ code: 'functions/internal', message: 'INTERNAL' })).toEqual({
      tipo: 'error',
      mensaje: 'INTERNAL',
    });
  });
});

/**
 * El «identifícate» de D-34 no es una sesión caducada.
 *
 * Los dos llegan como `permission-denied`, y confundirlos manda al invitado a
 * la puerta a escribir su nombre otra vez cuando lo único que le falta son
 * cuatro dígitos.
 */
describe('traducir, con los dos niveles de sesión', () => {
  it('reconoce que lo que falta es verificarse, y con qué', () => {
    expect(
      traducir({
        code: 'functions/permission-denied',
        details: { motivo: 'sin-verificar', modo: 'phone' },
      }),
    ).toEqual({ tipo: 'pide-verificar', modo: 'phone' });
  });

  it('sin modo, el de nombre y cuatro dígitos, que es el habitual', () => {
    expect(
      traducir({ code: 'functions/permission-denied', details: { motivo: 'sin-verificar' } }),
    ).toEqual({ tipo: 'pide-verificar', modo: 'name_phone4' });
  });

  it('un permiso denegado sin ese motivo sigue siendo sesión caducada', () => {
    expect(traducir({ code: 'functions/permission-denied' })).toEqual({ tipo: 'sin-sesion' });
    expect(
      traducir({ code: 'functions/permission-denied', details: { motivo: 'otra-cosa' } }),
    ).toEqual({ tipo: 'sin-sesion' });
  });

  it('un modo inventado no se cuela', () => {
    expect(
      traducir({
        code: 'functions/permission-denied',
        details: { motivo: 'sin-verificar', modo: 'telepatia' },
      }),
    ).toEqual({ tipo: 'pide-verificar', modo: 'name_phone4' });
  });
});
