import { describe, expect, it } from 'vitest';

import {
  CAMPOS_MAPEABLES,
  MAX_TEXTO,
  aPregunta,
  respuestasGuardadas,
  camposDelInvitado,
  esFechaISO,
  esVisible,
  estadoTrasEnviar,
  plazoAbierto,
  preguntasPara,
  validarRespuestas,
  visibles,
  type Pregunta,
} from './formulario';
import { PREGUNTAS_RSVP_FABRICA } from './semillas';

/**
 * El formulario de confirmación.
 *
 * Lo que se vigila aquí, por orden de lo que costaría si se rompe:
 *
 * 1. **`mapsTo` no puede tocar lo que no está en la lista blanca.** Las
 *    preguntas las escribe la pareja; una con `mapsTo: 'active'` dejaría a un
 *    invitado fuera de su propia boda al contestar.
 * 2. **Lo oculto no se guarda ni se exige.** Quien dice que no viene no elige
 *    menú, y no se le pide.
 * 3. **Lo que llega no vale por venir del formulario**: una opción que no está
 *    en la lista se rechaza, aunque el desplegable solo tuviera tres.
 */

/** Las preguntas tal y como quedan en Firestore: la clave pasa a ser el id. */
const FABRICA: readonly Pregunta[] = PREGUNTAS_RSVP_FABRICA.map(({ key, ...resto }) => ({
  id: key,
  ...resto,
}));

function pregunta(parcial: Partial<Pregunta> & { id: string }): Pregunta {
  return {
    label: 'Pregunta',
    helpText: '',
    type: 'text',
    options: [],
    required: false,
    target: 'both',
    mapsTo: null,
    visibleIf: null,
    order: 1,
    enabled: true,
    isSystem: false,
    ...parcial,
  };
}

describe('a quién se le pregunta', () => {
  const lista = [
    pregunta({ id: 'ambos', target: 'both', order: 2 }),
    pregunta({ id: 'titular', target: 'guest', order: 1 }),
    pregunta({ id: 'acompanante', target: 'companion', order: 3 }),
    pregunta({ id: 'apagada', target: 'both', order: 0, enabled: false }),
  ];

  it('al titular, las suyas y las de todos, por orden', () => {
    expect(preguntasPara(lista, false).map((p) => p.id)).toEqual(['titular', 'ambos']);
  });

  it('al acompañante, las suyas y las de todos', () => {
    expect(preguntasPara(lista, true).map((p) => p.id)).toEqual(['ambos', 'acompanante']);
  });

  it('las desactivadas no se preguntan a nadie, aunque vayan primeras', () => {
    expect(preguntasPara(lista, false).map((p) => p.id)).not.toContain('apagada');
  });

  it('con el mismo orden, el id decide: dos preguntas nunca bailan de sitio', () => {
    const empate = [pregunta({ id: 'b', order: 1 }), pregunta({ id: 'a', order: 1 })];

    expect(preguntasPara(empate, false).map((p) => p.id)).toEqual(['a', 'b']);
  });
});

describe('visibilidad condicional', () => {
  it('el menú solo se pregunta a quien dice que viene', () => {
    const menu = FABRICA.find((p) => p.id === 'menu')!;

    expect(esVisible(menu, FABRICA, { asistencia: true })).toBe(true);
    expect(esVisible(menu, FABRICA, { asistencia: false })).toBe(false);
    expect(esVisible(menu, FABRICA, {})).toBe(false);
  });

  it('la asistencia se pregunta siempre: no depende de nada', () => {
    const asistencia = FABRICA.find((p) => p.id === 'asistencia')!;

    expect(esVisible(asistencia, FABRICA, {})).toBe(true);
  });

  /**
   * La cadena entera, no solo el padre. Si la asistencia estuviera oculta, el
   * menú tampoco se pregunta: nadie elige menú sin haber podido decir si va.
   */
  it('sigue la cadena hacia arriba', () => {
    const lista = [
      pregunta({ id: 'abuelo', visibleIf: { questionId: 'nada', equals: 1 } }),
      pregunta({ id: 'padre', visibleIf: { questionId: 'abuelo', equals: 'si' } }),
      pregunta({ id: 'hijo', visibleIf: { questionId: 'padre', equals: 'si' } }),
    ];

    expect(esVisible(lista[2]!, lista, { padre: 'si', abuelo: 'si' })).toBe(false);
  });

  it('una condición que apunta a una pregunta que no existe oculta, no enseña', () => {
    const huerfana = pregunta({ id: 'x', visibleIf: { questionId: 'borrada', equals: true } });

    expect(esVisible(huerfana, [huerfana], { borrada: true })).toBe(false);
  });

  /**
   * `visibleIf` lo escribe la pareja desde el panel. Dos preguntas que se
   * condicionan entre sí son un documento raro, no un cuelgue del formulario.
   */
  it('un ciclo no cuelga el formulario', () => {
    const lista = [
      pregunta({ id: 'a', visibleIf: { questionId: 'b', equals: true } }),
      pregunta({ id: 'b', visibleIf: { questionId: 'a', equals: true } }),
    ];

    expect(esVisible(lista[0]!, lista, { a: true, b: true })).toBe(false);
  });

  it("acepta el 'true' de un desplegable como true", () => {
    const hijo = pregunta({ id: 'h', visibleIf: { questionId: 'p', equals: true } });
    const lista = [pregunta({ id: 'p', type: 'boolean' }), hijo];

    expect(esVisible(hijo, lista, { p: 'true' })).toBe(true);
    expect(esVisible(hijo, lista, { p: 'no' })).toBe(false);
  });

  it('en una selección múltiple, basta con que la opción esté marcada', () => {
    const hijo = pregunta({ id: 'h', visibleIf: { questionId: 'p', equals: 'bus' } });
    const lista = [pregunta({ id: 'p', type: 'checkbox' }), hijo];

    expect(esVisible(hijo, lista, { p: ['taxi', 'bus'] })).toBe(true);
    expect(esVisible(hijo, lista, { p: ['taxi'] })).toBe(false);
  });

  /**
   * A quien no puede ir se le sigue preguntando si quiere decirles algo: «siento
   * no llegar, os deseo lo mejor» es justo lo que esa persona quiere mandar, y
   * es la única pregunta de fábrica que no depende de la asistencia.
   */
  it('visibles() devuelve el formulario que se está viendo', () => {
    const viendo = visibles(preguntasPara(FABRICA, false), { asistencia: false });

    expect(viendo.map((p) => p.id)).toEqual(['asistencia', 'mensaje']);
  });
});

describe('validación', () => {
  it('una pregunta obligatoria sin contestar no pasa', () => {
    const r = validarRespuestas(FABRICA, {});

    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fallos).toEqual([{ questionId: 'asistencia', motivo: 'obligatoria' }]);
  });

  /** **La que importa.** Lo oculto no se exige. */
  it('quien dice que no viene no tiene que elegir menú, aunque el menú sea obligatorio', () => {
    const r = validarRespuestas(FABRICA, { asistencia: false });

    expect(r.ok).toBe(true);
    if (r.ok) expect(r.respuestas).toEqual({ asistencia: false });
    expect(r.ok && 'menu' in r.respuestas).toBe(false);
  });

  it('quien dice que viene sí: el menú es obligatorio para él', () => {
    const r = validarRespuestas(FABRICA, { asistencia: true });

    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fallos.map((f) => f.questionId)).toEqual(['menu']);
  });

  /** Lo oculto tampoco se guarda: el menú de la vez anterior no sobrevive. */
  it('no guarda las respuestas de lo que ha quedado oculto', () => {
    const r = validarRespuestas(FABRICA, {
      asistencia: false,
      menu: 'vegano',
      alergias: 'nueces',
      mensaje: 'Siento no llegar',
    });

    expect(r.ok && r.respuestas).toEqual({ asistencia: false, mensaje: 'Siento no llegar' });
  });

  it('una respuesta a una pregunta que ya no existe se descarta', () => {
    const r = validarRespuestas(FABRICA, { asistencia: false, inventada: 'hola' });

    expect(r.ok && Object.keys(r.respuestas)).toEqual(['asistencia']);
  });

  it('una opción que no está en la lista se rechaza', () => {
    const r = validarRespuestas(FABRICA, { asistencia: true, menu: 'langosta' });

    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fallos).toContainEqual({ questionId: 'menu', motivo: 'opcion' });
  });

  it('el texto se recorta y se limita', () => {
    const lista = [pregunta({ id: 't', type: 'text' })];

    expect(validarRespuestas(lista, { t: '  hola  ' })).toEqual({
      ok: true,
      respuestas: { t: 'hola' },
    });
    const largo = validarRespuestas(lista, { t: 'x'.repeat(MAX_TEXTO + 1) });
    expect(largo.ok).toBe(false);
  });

  it('un texto de solo espacios en una obligatoria no cuela', () => {
    const lista = [pregunta({ id: 't', type: 'text', required: true })];

    const r = validarRespuestas(lista, { t: '   ' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fallos[0]?.motivo).toBe('obligatoria');
  });

  it('la selección múltiple quita repetidos y comprueba cada opción', () => {
    const lista = [
      pregunta({
        id: 'c',
        type: 'checkbox',
        options: [
          { value: 'a', label: 'A' },
          { value: 'b', label: 'B' },
        ],
      }),
    ];

    expect(validarRespuestas(lista, { c: ['a', 'a', 'b'] })).toEqual({
      ok: true,
      respuestas: { c: ['a', 'b'] },
    });
    expect(validarRespuestas(lista, { c: ['a', 'z'] }).ok).toBe(false);
  });

  it('un número que llega como texto se guarda como número', () => {
    const lista = [pregunta({ id: 'n', type: 'number' })];

    expect(validarRespuestas(lista, { n: '3' })).toEqual({ ok: true, respuestas: { n: 3 } });
    expect(validarRespuestas(lista, { n: 'tres' }).ok).toBe(false);
    expect(validarRespuestas(lista, { n: 1e9 }).ok).toBe(false);
  });

  it('una fecha imposible no es una fecha', () => {
    const lista = [pregunta({ id: 'f', type: 'date' })];

    expect(validarRespuestas(lista, { f: '2027-06-12' }).ok).toBe(true);
    expect(validarRespuestas(lista, { f: '2027-02-31' }).ok).toBe(false);
    expect(validarRespuestas(lista, { f: '12/06/2027' }).ok).toBe(false);
    expect(esFechaISO('2028-02-29')).toBe(true);
  });

  it('un objeto donde se esperaba texto se rechaza', () => {
    const lista = [pregunta({ id: 't', type: 'text' })];

    expect(validarRespuestas(lista, { t: { raro: 1 } }).ok).toBe(false);
  });

  it('al acompañante solo se le validan sus preguntas', () => {
    const lista = [
      pregunta({ id: 'solo-titular', target: 'guest', required: true }),
      pregunta({ id: 'suya', target: 'companion' }),
    ];

    expect(validarRespuestas(lista, {}, true).ok).toBe(true);
    expect(validarRespuestas(lista, {}, false).ok).toBe(false);
  });
});

describe('mapsTo', () => {
  it('la asistencia se traduce a estado', () => {
    expect(camposDelInvitado(FABRICA, { asistencia: true }).rsvpStatus).toBe('confirmed');
    expect(camposDelInvitado(FABRICA, { asistencia: false }).rsvpStatus).toBe('declined');
  });

  it('el menú y las alergias aterrizan en sus campos, que es lo que lee el catering', () => {
    const campos = camposDelInvitado(FABRICA, {
      asistencia: true,
      menu: 'vegano',
      alergias: 'nueces',
    });

    expect(campos.menu).toBe('vegano');
    expect(campos.allergies).toBe('nueces');
  });

  /**
   * **La prueba que justifica la lista blanca.** `formQuestions` lo escribe la
   * pareja: si `mapsTo` se aplicase tal cual, contestar al formulario podría
   * desactivar al invitado o meterlo en el grupo de las fotos restringidas.
   */
  it('un mapsTo que no está en la lista blanca no toca nada', () => {
    const maliciosas = [
      pregunta({ id: 'a', type: 'boolean', mapsTo: 'active' }),
      pregunta({ id: 'b', type: 'text', mapsTo: 'groupIds' }),
      pregunta({ id: 'c', type: 'number', mapsTo: 'loginCount' }),
      pregunta({ id: 'd', type: 'boolean', mapsTo: 'isOwnerGuest' }),
      pregunta({ id: 'e', type: 'number', mapsTo: 'maxCompanions' }),
      pregunta({ id: 'f', type: 'text', mapsTo: 'phone' }),
    ];
    const campos = camposDelInvitado(maliciosas, {
      a: false,
      b: 'secreto',
      c: 999,
      d: true,
      e: 10,
      f: '+34600000000',
    });

    expect(campos).toEqual({});
  });

  /**
   * El candado de verdad es esta lista, y el fallo realista es que alguien añada
   * un campo a ella sin pensar. Estos son los que **nunca** pueden estar: los
   * mueve el servidor o deciden quién ve qué.
   */
  it('la lista blanca no contiene ningún campo que mande el servidor', () => {
    const prohibidos = [
      'active',
      'groupIds',
      'loginCount',
      'firstLoginAt',
      'lastLoginAt',
      'isOwnerGuest',
      'isCompanion',
      'invitedById',
      'maxCompanions',
      'phone',
      'phoneLast4',
      'normalizedName',
      'fullName',
      'notes',
      'tableId',
      'addedBy',
    ];

    expect(prohibidos.filter((campo) => campo in CAMPOS_MAPEABLES)).toEqual([]);
  });

  it('lo que ha quedado oculto no se mapea: el menú no sobrevive a un «no voy»', () => {
    const campos = camposDelInvitado(FABRICA, { asistencia: false, menu: 'vegano' });

    expect(campos.rsvpStatus).toBe('declined');
    expect(campos.menu).toBeUndefined();
  });

  it('sin pregunta de asistencia, enviar el formulario confirma', () => {
    const lista = [pregunta({ id: 'menu', type: 'text', mapsTo: 'menu' })];
    const campos = camposDelInvitado(lista, { menu: 'normal' });

    expect(campos.rsvpStatus).toBeUndefined();
    expect(estadoTrasEnviar(campos)).toBe('confirmed');
  });
});

describe('fecha límite', () => {
  it('sin fecha límite siempre se puede contestar', () => {
    expect(plazoAbierto(null, new Date('2030-01-01T00:00:00Z'))).toBe(true);
  });

  /** El día del límite cuenta entero: «hasta el 1 de junio» incluye el 1. */
  it('el día del límite cuenta hasta el final', () => {
    const limite = new Date('2027-06-01T00:00:00.000Z');

    expect(plazoAbierto(limite, new Date('2027-06-01T23:59:00.000Z'))).toBe(true);
    expect(plazoAbierto(limite, new Date('2027-06-02T00:00:01.000Z'))).toBe(false);
  });
});

describe('lo que llega de Firestore', () => {
  it('una pregunta normal se lee tal cual', () => {
    const p = aPregunta('menu', {
      label: 'Menú',
      helpText: 'Elige uno',
      type: 'select',
      options: [{ value: 'vegano', label: 'Vegano' }],
      required: true,
      target: 'both',
      mapsTo: 'menu',
      visibleIf: { questionId: 'asistencia', equals: true },
      order: 2,
      enabled: true,
      isSystem: true,
    });

    expect(p).toEqual({
      id: 'menu',
      label: 'Menú',
      helpText: 'Elige uno',
      type: 'select',
      options: [{ value: 'vegano', label: 'Vegano' }],
      required: true,
      target: 'both',
      mapsTo: 'menu',
      visibleIf: { questionId: 'asistencia', equals: true },
      order: 2,
      enabled: true,
      isSystem: true,
    });
  });

  /**
   * Un documento raro no puede dejar el formulario inservible. Un tipo que no
   * conocemos se enseña como texto: siempre se puede contestar, y el invitado
   * ve que esa pregunta existe. Dejarla fuera sería peor.
   */
  it('un documento a medias no revienta: se completa con lo más inofensivo', () => {
    const p = aPregunta('x', { type: 'telepatia', target: 'marcianos' });

    expect(p.type).toBe('text');
    expect(p.target).toBe('both');
    expect(p.label).toBe('');
    expect(p.options).toEqual([]);
    expect(p.required).toBe(false);
    expect(p.mapsTo).toBeNull();
    expect(p.visibleIf).toBeNull();
    expect(p.order).toBe(0);
    expect(p.isSystem).toBe(false);
  });

  it('una pregunta sin `enabled` se pregunta: ausente es activa', () => {
    expect(aPregunta('x', {}).enabled).toBe(true);
    expect(aPregunta('x', { enabled: false }).enabled).toBe(false);
  });

  it('las opciones sin valor se caen, y la etiqueta que falta la pone el valor', () => {
    const p = aPregunta('x', {
      type: 'select',
      options: [
        { value: 'a', label: 'A' },
        { value: '' },
        'suelta',
        null,
        { label: 'sin valor' },
        { value: 'b' },
      ],
    });

    expect(p.options).toEqual([
      { value: 'a', label: 'A' },
      { value: 'b', label: 'b' },
    ]);
  });

  it('una condición sin pregunta a la que apuntar no es condición', () => {
    expect(aPregunta('x', { visibleIf: { equals: true } }).visibleIf).toBeNull();
    expect(aPregunta('x', { visibleIf: 'asistencia' }).visibleIf).toBeNull();
    expect(aPregunta('x', { visibleIf: { questionId: 'a' } }).visibleIf).toEqual({
      questionId: 'a',
      equals: null,
    });
  });

  it('un `mapsTo` vacío es ninguno, no una cadena vacía', () => {
    expect(aPregunta('x', { mapsTo: '' }).mapsTo).toBeNull();
    expect(aPregunta('x', { mapsTo: 42 }).mapsTo).toBeNull();
  });

  it('respuestasGuardadas tolera lo que no sea un mapa', () => {
    expect(respuestasGuardadas({ a: 1 })).toEqual({ a: 1 });
    expect(respuestasGuardadas(null)).toEqual({});
    expect(respuestasGuardadas(['a'])).toEqual({});
    expect(respuestasGuardadas('a')).toEqual({});
  });
});
